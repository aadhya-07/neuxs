"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { normalizeHandle } from "@/lib/utils";
import type { PostStatus } from "@/lib/types";

const ALLOWED: PostStatus[] = ["open", "claimed", "sold", "resolved", "closed"];
const RESOLVE_LIKE: PostStatus[] = ["claimed", "sold", "resolved", "closed"];

async function requireUserId(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required.");
  return { supabase, userId: user.id };
}

async function canManagePost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  current: { author_id: string | null; club_id: string | null },
): Promise<boolean> {
  if (current.author_id === userId) return true;
  if (!current.club_id) return false;
  const { data: m } = await supabase
    .from("club_managers")
    .select("club_id")
    .eq("club_id", current.club_id)
    .eq("user_id", userId)
    .maybeSingle();
  return !!m;
}

// Owner-only status transition (claimed/sold/resolved/closed). Enforced both
// here (author_id check) and by RLS (migration 0003). Resolving from open
// awards +10 karma once per post (migration 0006 unique index).
// Club managers may also transition their club's event posts (migration 0012),
// but clubs have no karma — the award applies to personal posts only.
export async function setPostStatus(postId: string, status: PostStatus): Promise<void> {
  if (!ALLOWED.includes(status)) throw new Error("Invalid status.");
  const { supabase, userId } = await requireUserId();
  const { data: current } = await supabase
    .from("posts")
    .select("id,status,author_id,club_id")
    .eq("id", postId)
    .single();
  if (!current) throw new Error("Post not found or not yours.");
  const mine = current.author_id === userId;
  const managing = await canManagePost(supabase, userId, current);
  if (!managing) throw new Error("Post not found or not yours.");
  const { error } = await supabase.from("posts").update({ status }).eq("id", postId);
  if (error) throw new Error(error.message);
  if (mine && current.status === "open" && RESOLVE_LIKE.includes(status)) {
    const { error: karmaError } = await supabase.from("karma_events").insert({
      user_id: userId,
      delta: 10,
      reason: "resolved_post",
      ref_id: postId,
    });
    // 23505 = already awarded for this post — safe to ignore.
    if (karmaError && karmaError.code !== "23505") throw new Error(karmaError.message);
  }
  revalidatePath("/", "layout");
}

// Owner / club-manager delete. Personal posts: only the uploader
// (author_id check). Club event posts (author_id NULL): only a manager of
// that club. Enforced here AND by RLS (migrations 0003 + 0012).
// Related rows (answers, applications, rsvps, chats, offers, reports)
// cascade via FK `on delete cascade` (migration 0001 + 0013).
export async function deletePost(postId: string): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { data: current } = await supabase
    .from("posts")
    .select("id,author_id,club_id")
    .eq("id", postId)
    .single();
  if (!current) throw new Error("Post not found or not yours.");
  if (!(await canManagePost(supabase, userId, current)))
    throw new Error("Only the uploader or a club admin can delete this post.");
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

// Wallpaper sync — opt-in only. The local choice never reaches the DB
// unless the user presses Sync. Accepts only our own Storage URLs
// (same project-host check as avatars) or null to unsync.
export async function syncWallpaperUrl(url: string | null): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const clean = (url ?? "").trim();
  if (clean) {
    let parsed: URL;
    try {
      parsed = new URL(clean);
    } catch {
      throw new Error("That wallpaper URL is invalid.");
    }
    if (parsed.protocol !== "https:") throw new Error("That wallpaper URL is invalid.");
    let projectHost = "";
    try {
      projectHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
    } catch {
      projectHost = "";
    }
    if (!projectHost || parsed.hostname !== projectHost) {
      throw new Error("Wallpaper must be synced with the Sync button.");
    }
  }
  const { error } = await supabase
    .from("profiles")
    .update({ wallpaper_url: clean || null })
    .eq("id", userId);
  if (error) {
    if (/wallpaper_url|column/i.test(error.message)) {
      throw new Error("Wallpaper sync needs migration 0014 — ask the admin to run it.");
    }
    throw new Error(error.message);
  }
  revalidatePath("/profile", "page");
}

// Doubt answer (RLS: any signed-in user, author masked by UI).
export async function submitAnswer(
  postId: string,
  body: string,
  anonymous: boolean,
): Promise<void> {
  const text = body.trim();
  if (!text) throw new Error("Answer can't be empty.");
  if (text.length > 2000) throw new Error("Answer too long (2000 max).");
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("answers").insert({
    post_id: postId,
    author_id: userId,
    body: text,
    is_anonymous: anonymous,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/post/${postId}`);
}

// Upvote toggle — the client sends its intent (wantVoted from current UI
// state) so the server does one write + one recount, no read-modify-write
// race on rapid clicks. Ownership enforced by RLS (voter_id = self) and the
// PK (answer_id, voter_id) — double-voting is impossible even if a stale
// intent arrives. Returns fresh state for instant UI reconcile.
export async function toggleVote(
  answerId: string,
  postId: string,
  wantVoted: boolean,
): Promise<{ voted: boolean; score: number }> {
  const { supabase, userId } = await requireUserId();
  if (wantVoted) {
    const { error } = await supabase
      .from("votes")
      .upsert({ answer_id: answerId, voter_id: userId }, { onConflict: "answer_id,voter_id" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("answer_id", answerId)
      .eq("voter_id", userId);
    if (error) throw new Error(error.message);
  }
  const { count } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("answer_id", answerId);
  revalidatePath(`/post/${postId}`);
  return { voted: wantVoted, score: count ?? 0 };
}

// Referral application (unique per post — re-apply is a friendly error).
export async function applyToReferral(postId: string, note: string): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { data: post } = await supabase
    .from("posts")
    .select("id,deadline_at,status,author_id")
    .eq("id", postId)
    .single();
  if (!post) throw new Error("Post not found.");
  if (post.author_id === userId) throw new Error("You can't apply to your own referral.");
  if (post.deadline_at && new Date(post.deadline_at) < new Date())
    throw new Error("The deadline has passed.");
  const { error } = await supabase.from("applications").insert({
    post_id: postId,
    applicant_id: userId,
    note: note.trim().slice(0, 500),
  });
  if (error) {
    if (error.code === "23505") throw new Error("You've already applied.");
    throw new Error(error.message);
  }
  revalidatePath(`/post/${postId}`);
}

// Event RSVP toggle.
export async function toggleRsvp(postId: string): Promise<{ going: boolean }> {
  const { supabase, userId } = await requireUserId();
  const { data: existing } = await supabase
    .from("rsvps")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("rsvps")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("rsvps")
      .insert({ post_id: postId, user_id: userId });
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/post/${postId}`);
  return { going: !existing };
}

// Report a post for moderator review.
export async function submitReport(postId: string, reason: string): Promise<void> {
  const text = reason.trim();
  if (!text) throw new Error("Pick a reason.");
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("reports").insert({
    post_id: postId,
    reporter_id: userId,
    reason: text.slice(0, 200),
  });
  if (error) throw new Error(error.message);
}

// Moderation — dismiss a report (RLS: moderators only).
export async function dismissReport(reportId: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("reports")
    .update({ status: "dismissed" })
    .eq("id", reportId);
  if (error) throw new Error(error.message);
  revalidatePath("/moderation");
}

// Moderation — takedown: delete post, −20 karma to author, close report.
export async function takedownPost(postId: string, reportId?: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { data: post } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", postId)
    .single();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
  if (post?.author_id) {
    await supabase.from("karma_events").insert({
      user_id: post.author_id,
      delta: -20,
      reason: "report_upheld",
      ref_id: postId,
    });
  }
  if (reportId) {
    await supabase.from("reports").update({ status: "actioned" }).eq("id", reportId);
  }
  revalidatePath("/moderation");
}

// Marketplace — get or create my conversation with the seller.
export async function startConversation(listingId: string): Promise<string> {
  const { supabase, userId } = await requireUserId();
  const { data: listing } = await supabase
    .from("posts")
    .select("id,author_id,type")
    .eq("id", listingId)
    .single();
  if (!listing || listing.type !== "marketplace") throw new Error("Listing not found.");
  if (!listing.author_id) throw new Error("Seller account missing.");
  if (listing.author_id === userId) throw new Error("That's your own listing.");
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", userId)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ listing_id: listingId, buyer_id: userId, seller_id: listing.author_id })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Could not start chat.");
  return created.id;
}

const REQUIRED_TABLES = [
  "profiles",
  "posts",
  "answers",
  "votes",
  "applications",
  "rsvps",
  "conversations",
  "messages",
  "offers",
  "reports",
  "karma_events",
];

export interface DbDiagnosis {
  configured: boolean;
  missing: string[];
  checked: string[];
  detail: string;
}

// Proves whether the app's Supabase project actually has our tables, using
// the service-role key (bypasses RLS, server-only — only the verdict reaches
// the browser). Distinguishes "migrations never run" from "stale cache".
export async function diagnoseDb(): Promise<DbDiagnosis> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || serviceKey.includes("placeholder")) {
    return {
      configured: false,
      missing: [],
      checked: [],
      detail: "SUPABASE_SERVICE_ROLE_KEY is missing or a placeholder in .env.local.",
    };
  }
  const admin = createAdminClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const missing: string[] = [];
  const checked: string[] = [];
  for (const t of REQUIRED_TABLES) {
    checked.push(t);
    const { error } = await admin.from(t).select("*", { count: "exact", head: true });
    if (!error) continue;
    if (error.code === "PGRST205" || /could not find the table/i.test(error.message)) {
      missing.push(t);
      continue;
    }
    return {
      configured: true,
      missing,
      checked,
      detail: `Table '${t}' errored unexpectedly: ${error.message}`,
    };
  }
  return {
    configured: true,
    missing,
    checked,
    detail: missing.length ? `${missing.length} table(s) missing` : "All tables present",
  };
}

// ---- Clubs (admin-seeded, manager-run) ----

async function requireModerator(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}> {
  const { supabase, userId } = await requireUserId();
  const { data } = await supabase
    .from("profiles")
    .select("is_moderator")
    .eq("id", userId)
    .single();
  if (!data?.is_moderator) throw new Error("Moderators only.");
  return { supabase, userId };
}

async function requireClubAdmin(
  clubId: string,
): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; userId: string }> {
  const { supabase, userId } = await requireUserId();
  const [{ data: prof }, { data: mgr }] = await Promise.all([
    supabase.from("profiles").select("is_moderator").eq("id", userId).single(),
    supabase
      .from("club_managers")
      .select("club_id")
      .eq("club_id", clubId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (!prof?.is_moderator && !mgr) throw new Error("Club managers or moderators only.");
  return { supabase, userId };
}

// Clubs the caller manages — for the /new "post as" selector.
export async function myClubs(): Promise<{ id: string; name: string; slug: string }[]> {
  const { supabase, userId } = await requireUserId();
  const { data: memberships } = await supabase
    .from("club_managers")
    .select("club_id")
    .eq("user_id", userId);
  const ids = (memberships ?? []).map((m) => m.club_id);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("clubs")
    .select("id,name,slug")
    .in("id", ids)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string; slug: string }[];
}

export async function createClub(input: { name: string; slug: string }): Promise<{ slug: string }> {
  const { supabase, userId } = await requireModerator();
  const name = input.name.trim().slice(0, 80);
  const slug = normalizeHandle(input.slug);
  if (name.length < 2) throw new Error("Club name must be at least 2 characters.");
  if (!/^[a-z0-9_]{2,30}$/.test(slug)) {
    throw new Error("Slug must be 2–30 chars: lowercase letters, numbers, underscores.");
  }
  const { data: taken } = await supabase.from("clubs").select("id").eq("slug", slug).maybeSingle();
  if (taken) throw new Error("That slug is taken — try another.");
  const { data: club, error } = await supabase
    .from("clubs")
    .insert({ name, slug, verified: true })
    .select("id,slug")
    .single();
  if (error || !club) throw new Error(error?.message ?? "Could not create club.");
  // Creator becomes first manager (moderators can add the real managers next).
  const { error: mErr } = await supabase
    .from("club_managers")
    .insert({ club_id: (club as { id: string }).id, user_id: userId });
  if (mErr) throw new Error(mErr.message);
  revalidatePath("/", "layout");
  return { slug: (club as { slug: string }).slug };
}

export async function addClubManager(clubId: string, handle: string): Promise<void> {
  const { supabase } = await requireClubAdmin(clubId);
  const clean = normalizeHandle(handle);
  if (!clean) throw new Error("Enter a handle.");
  const { data: prof } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", clean)
    .single();
  if (!prof) throw new Error("No verified profile with that handle.");
  const pid = (prof as { id: string }).id;
  const { data: existing } = await supabase
    .from("club_managers")
    .select("club_id")
    .eq("club_id", clubId)
    .eq("user_id", pid)
    .maybeSingle();
  if (existing) throw new Error("They already manage this club.");
  const { error } = await supabase.from("club_managers").insert({ club_id: clubId, user_id: pid });
  if (error) throw new Error(error.message);
  revalidatePath(`/clubs/[slug]`, "page");
  revalidatePath("/", "layout");
}

export async function removeClubManager(clubId: string, targetUserId: string): Promise<void> {
  const { supabase, userId } = await requireClubAdmin(clubId);
  if (targetUserId === userId) throw new Error("You can't remove yourself — ask a co-manager.");
  const { count } = await supabase
    .from("club_managers")
    .select("club_id", { count: "exact", head: true })
    .eq("club_id", clubId);
  if ((count ?? 0) <= 1) throw new Error("Can't remove the last manager.");
  const { error } = await supabase
    .from("club_managers")
    .delete()
    .eq("club_id", clubId)
    .eq("user_id", targetUserId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clubs/[slug]`, "page");
  revalidatePath("/", "layout");
}

// Profile edit — display name, handle, avatar, bio, links.
// RLS self-update (migration 0002).
export async function updateProfile(input: {
  fullName: string;
  handle: string;
  avatarUrl: string;
  bio?: string;
  links?: { label: string; url: string }[];
}): Promise<{ handle: string }> {
  const { supabase, userId } = await requireUserId();
  const fullName = input.fullName.trim().slice(0, 60);
  const handle = normalizeHandle(input.handle);
  const avatarUrl = input.avatarUrl.trim();
  const bio = (input.bio ?? "").trim().slice(0, 1000);
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
    throw new Error("Handle must be 3–20 chars: lowercase letters, numbers, underscores.");
  }
  const rawLinks = Array.isArray(input.links) ? input.links.slice(0, 6) : [];
  const links: { label: string; url: string }[] = [];
  for (const item of rawLinks) {
    if (typeof item !== "object" || item === null) throw new Error("Invalid link entry.");
    const label = String((item as { label?: unknown }).label ?? "").trim().slice(0, 30);
    let url = String((item as { url?: unknown }).url ?? "").trim();
    if (!label && !url) continue; // skip blank rows
    if (!label || !url) throw new Error("Every link needs both a label and a URL.");
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `https://${url}`;
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad protocol");
      links.push({ label, url: parsed.toString() });
    } catch {
      throw new Error(`Bad link URL for "${label}" — use a full http(s) address.`);
    }
  }
  if (avatarUrl) {
    let url: URL;
    try {
      url = new URL(avatarUrl);
    } catch {
      throw new Error("Avatar must be uploaded with the photo picker.");
    }
    if (url.protocol !== "https:") throw new Error("Avatar must be uploaded with the photo picker.");
    // Only accept images from our own Storage (uploaded via the picker).
    // Grandfather: keeping your existing unchanged URL is always allowed.
    const projectHost = (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
      } catch {
        return "";
      }
    })();
    const { data: current } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();
    const unchanged = (current as { avatar_url: string | null } | null)?.avatar_url === avatarUrl;
    if (!unchanged && (!projectHost || url.hostname !== projectHost)) {
      throw new Error("Avatar must be uploaded with the photo picker.");
    }
  }
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .neq("id", userId)
    .maybeSingle();
  if (taken) throw new Error("That handle is taken — try another.");
  const { error } = await supabase
    .from("profiles")
    .update({
      handle,
      full_name: fullName || null,
      avatar_url: avatarUrl || null,
      bio: bio || null,
      links,
    })
    .eq("id", userId);
  if (error) {
    // Migration 0011 not run yet → bio/links columns unknown. Save the rest.
    if (/bio|links|column/i.test(error.message)) {
      const fb = await supabase
        .from("profiles")
        .update({ handle, full_name: fullName || null, avatar_url: avatarUrl || null })
        .eq("id", userId);
      if (fb.error) throw new Error(fb.error.message);
      console.error("[profile] bio/links columns missing (run migration 0011) — saved the rest");
    } else {
      throw new Error(error.message);
    }
  }
  revalidatePath("/profile", "page");
  revalidatePath("/", "layout");
  return { handle };
}

// ---- Marketplace offers: Make Offer -> Counter -> Confirmed Deal ----

export interface OfferInput {
  amount: number;
  meetupWhen?: string;
  meetupWhere?: string;
}

async function ensureConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingId: string,
  buyerId: string,
  sellerId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Could not open chat.");
  return created.id;
}

export async function makeOffer(
  listingId: string,
  input: OfferInput,
): Promise<{ offerId: string; conversationId: string }> {
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    throw new Error("Offer must be greater than 0.");
  const { supabase, userId } = await requireUserId();
  const { data: listing } = await supabase
    .from("posts")
    .select("id,author_id,type,price,title")
    .eq("id", listingId)
    .single();
  if (!listing || listing.type !== "marketplace") throw new Error("Listing not found.");
  if (!listing.author_id) throw new Error("Seller account missing.");
  if (listing.author_id === userId) throw new Error("That's your own listing.");
  const conversationId = await ensureConversation(
    supabase,
    listingId,
    userId,
    listing.author_id,
  );
  const { data: offer, error } = await supabase
    .from("offers")
    .insert({
      listing_id: listingId,
      conversation_id: conversationId,
      buyer_id: userId,
      amount: input.amount,
      meetup_when: input.meetupWhen?.slice(0, 60) || null,
      meetup_where: input.meetupWhere?.slice(0, 120) || null,
      status: "offered",
    })
    .select("id")
    .single();
  if (error || !offer) throw new Error(error?.message ?? "Could not send offer.");
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userId,
    body: `Offer ₹${Number(input.amount).toLocaleString("en-IN")}${input.meetupWhen ? ` · ${input.meetupWhen}` : ""}${input.meetupWhere ? ` @ ${input.meetupWhere}` : ""}`,
  });
  revalidatePath(`/post/${listingId}`);
  revalidatePath(`/marketplace/${listingId}/chat`);
  return { offerId: offer.id, conversationId };
}

export async function counterOffer(offerId: string, amount: number): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Counter must be greater than 0.");
  const { supabase, userId } = await requireUserId();
  const { data: offer } = await supabase
    .from("offers")
    .select("id,listing_id,conversation_id,buyer_id,status")
    .eq("id", offerId)
    .single();
  if (!offer) throw new Error("Offer not found.");
  const { data: listing } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", offer.listing_id)
    .single();
  if (listing?.author_id !== userId) throw new Error("Only the seller can counter.");
  const { error } = await supabase
    .from("offers")
    .update({ amount, status: "countered" })
    .eq("id", offerId);
  if (error) throw new Error(error.message);
  if (offer.conversation_id) {
    await supabase.from("messages").insert({
      conversation_id: offer.conversation_id,
      sender_id: userId,
      body: `Counter ₹${Number(amount).toLocaleString("en-IN")}`,
    });
  }
  revalidatePath(`/post/${offer.listing_id}`);
}

export async function setOfferStatus(
  offerId: string,
  status: "accepted" | "declined" | "withdrawn",
): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { data: offer } = await supabase
    .from("offers")
    .select("id,listing_id,conversation_id,buyer_id,status")
    .eq("id", offerId)
    .single();
  if (!offer) throw new Error("Offer not found.");
  const { data: listing } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", offer.listing_id)
    .single();
  const isSeller = listing?.author_id === userId;
  const isBuyer = offer.buyer_id === userId;
  if (status === "withdrawn" && !isBuyer) throw new Error("Only the buyer can withdraw.");
  if ((status === "accepted" || status === "declined") && !isSeller)
    throw new Error("Only the seller can do that.");
  const { error } = await supabase.from("offers").update({ status }).eq("id", offerId);
  if (error) throw new Error(error.message);
  if (offer.conversation_id) {
    await supabase.from("messages").insert({
      conversation_id: offer.conversation_id,
      sender_id: userId,
      body:
        status === "accepted"
          ? "Deal confirmed — see meetup plan below."
          : status === "declined"
            ? "Offer declined."
            : "Offer withdrawn.",
    });
  }
  revalidatePath(`/post/${offer.listing_id}`);
}
