import { createClient } from "@/lib/supabase/server";
import { mapRow, one, type PostRow } from "@/lib/feed";
import { SEED } from "@/lib/seed";
import type { Post } from "@/lib/types";

export interface AnswerDTO {
  id: string;
  body: string;
  score: number;
  createdAt: string;
  displayName: string;
  mine: boolean;
  voted: boolean;
}

export interface ApplicantDTO {
  applicantId: string;
  handle: string;
  fullName: string | null;
  note: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

export interface ChatThread {
  id: string;
  listingId: string;
  listingTitle: string;
  otherHandle: string;
  messages: ChatMessage[];
}

async function currentUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// Single post with live counts. Null when missing/unreachable. Two-tier like
// getFeed: joined fetch first, plain row + direct lookups on failure (a stale
// PostgREST cache on the FK embed must not 404 a post that exists).
export async function getPostDetail(id: string): Promise<Post | null> {
  const SELECT_EMBEDDED =
    "id,type,title,body,images,status,author_id,club_id,price,category,location,lost_or_found,starts_at,deadline_at,created_at,author:profiles(handle,full_name),club:clubs(name,slug)";
  const SELECT_PLAIN =
    "id,type,title,body,images,status,author_id,club_id,price,category,location,lost_or_found,starts_at,deadline_at,created_at";
  try {
    const supabase = await createClient();
    let row: PostRow | null = null;
    const { data, error } = await supabase
      .from("posts")
      .select(SELECT_EMBEDDED)
      .eq("id", id)
      .single();
    if (error || !data) {
      if (error && error.code !== "PGRST116") {
        console.error("[post] joined fetch failed:", error.message, "— retrying plain");
      } else if (!data) {
        return null;
      }
      if (!row) {
        const fb = await supabase.from("posts").select(SELECT_PLAIN).eq("id", id).single();
        if (fb.error || !fb.data) {
          if (fb.error && fb.error.code !== "PGRST116") {
            console.error("[post] plain fetch failed:", fb.error.message);
          }
          return null;
        }
        const base = fb.data as unknown as PostRow;
        let author: PostRow["author"] = null;
        let club: PostRow["club"] = null;
        if (base.author_id) {
          const { data: p } = await supabase
            .from("profiles")
            .select("handle,full_name")
            .eq("id", base.author_id)
            .single();
          author = (p as { handle: string; full_name: string | null } | null) ?? null;
        }
        if (base.club_id) {
          const { data: c } = await supabase
            .from("clubs")
            .select("name,slug")
            .eq("id", base.club_id)
            .single();
          club = (c as { name: string; slug: string } | null) ?? null;
        }
        row = { ...base, author, club };
      }
    } else {
      row = data as unknown as PostRow;
    }
    if (!row) return null;
    const counts = { upvotes: 0, applicants: 0, rsvps: 0, replies: 0 };
    if (row.type === "referral") {
      const { count } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("post_id", id);
      counts.applicants = count ?? 0;
    } else if (row.type === "event") {
      const { count } = await supabase
        .from("rsvps")
        .select("*", { count: "exact", head: true })
        .eq("post_id", id);
      counts.rsvps = count ?? 0;
    } else if (row.type === "doubt") {
      const { data: answers } = await supabase
        .from("answers")
        .select("id")
        .eq("post_id", id);
      const ids = (answers ?? []).map((a) => a.id);
      counts.replies = ids.length;
      if (ids.length) {
        const { count } = await supabase
          .from("votes")
          .select("*", { count: "exact", head: true })
          .in("answer_id", ids);
        counts.upvotes = count ?? 0;
      }
    }
    return mapRow(row, counts);
  } catch {
    return null;
  }
}

// Answers for a doubt, newest-score first, with my votes marked.
// Display name stays anonymous unless the author chose otherwise or it's mine.
// Two-tier like getPostDetail: joined fetch first, plain rows + batched
// profile lookups on failure (a stale PostgREST cache on the FK embed must
// not empty a list that exists — the feed tally counts the same rows).
export async function getAnswers(postId: string): Promise<AnswerDTO[]> {
  try {
    const supabase = await createClient();
    const me = await currentUserId();
    const { data, error } = await supabase
      .from("answers")
      .select("id,body,score,is_anonymous,author_id,created_at,author:profiles(handle,full_name)")
      .eq("post_id", postId)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true });
    if (!error && data) return assembleAnswers(data, me, supabase);
    if (error) console.error("[answers] joined fetch failed:", error.message, "— retrying plain");
    // Fallback: plain rows (no embed) + batched author lookup.
    const fb = await supabase
      .from("answers")
      .select("id,body,score,is_anonymous,author_id,created_at")
      .eq("post_id", postId)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true });
    if (fb.error || !fb.data) {
      if (fb.error) console.error("[answers] plain fetch failed:", fb.error.message);
      return [];
    }
    const authorIds = [...new Set(fb.data.map((a) => a.author_id).filter((v): v is string => !!v))];
    let aMap = new Map<string, { handle: string; full_name: string | null }>();
    if (authorIds.length) {
      const { data: authors } = await supabase
        .from("profiles")
        .select("id,handle,full_name")
        .in("id", authorIds);
      aMap = new Map(
        ((authors ?? []) as { id: string; handle: string; full_name: string | null }[]).map((a) => [
          a.id,
          { handle: a.handle, full_name: a.full_name },
        ]),
      );
    }
    const rows = fb.data.map((a) => ({
      ...a,
      author: a.author_id ? (aMap.get(a.author_id) ?? null) : null,
    }));
    return assembleAnswers(rows, me, supabase);
  } catch {
    return [];
  }
}

interface AnswerRow {
  id: string;
  body: string;
  score: number;
  is_anonymous: boolean;
  author_id: string;
  created_at: string;
  author: { handle: string; full_name: string | null } | { handle: string; full_name: string | null }[] | null;
}

async function assembleAnswers(
  data: AnswerRow[],
  me: string | null,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AnswerDTO[]> {
  const ids = data.map((a) => a.id);
  let voted = new Set<string>();
  if (me && ids.length) {
    const { data: votes } = await supabase
      .from("votes")
      .select("answer_id")
      .eq("voter_id", me)
      .in("answer_id", ids);
    voted = new Set((votes ?? []).map((v) => v.answer_id));
  }
  return data.map((a) => {
    const author = one(a.author) as {
      handle: string;
      full_name: string | null;
    } | null;
    const mine = me !== null && a.author_id === me;
    return {
      id: a.id,
      body: a.body,
      score: a.score,
      createdAt: a.created_at,
      displayName:
        !a.is_anonymous || mine
          ? (author?.full_name ?? (author ? `@${author.handle}` : "Student"))
          : "Anonymous • Verified",
      mine,
      voted: voted.has(a.id),
    };
  });
}

// Applicants visible to the poster (RLS) — returns [] for everyone else.
export async function getApplicants(postId: string): Promise<ApplicantDTO[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("applications")
      .select("applicant_id,note,created_at,applicant:profiles(handle,full_name)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return data.map((a) => {
      const p = one(a.applicant) as {
        handle: string;
        full_name: string | null;
      } | null;
      return {
        applicantId: a.applicant_id,
        handle: p ? `@${p.handle}` : "@student",
        fullName: p?.full_name ?? null,
        note: a.note ?? "",
        createdAt: a.created_at,
      };
    });
  } catch {
    return [];
  }
}

export async function getMyApplication(postId: string): Promise<boolean> {
  const me = await currentUserId();
  if (!me) return false;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("applications")
      .select("post_id")
      .eq("post_id", postId)
      .eq("applicant_id", me)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export async function getMyRsvp(postId: string): Promise<boolean> {
  const me = await currentUserId();
  if (!me) return false;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("rsvps")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", me)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

// Calendar item — unified shape for events (starts_at) + referral deadlines.
// Used by /event/calendar so every listed date surfaces on the grid.
export interface CalendarItem {
  id: string;
  title: string;
  dateISO: string;
  kind: "event" | "referral";
  status: string;
  location?: string | null;
}

const CALENDAR_SELECT_PLAIN =
  "id,type,title,body,images,status,author_id,club_id,price,category,location,lost_or_found,starts_at,deadline_at,created_at";

// Plain-column fetch that can't hit the stale PostgREST FK-embed cache.
// Returns ok:false on DB error (vs ok:true + empty rows when the month is genuinely empty).
async function fetchCalendarRows(
  type: "event" | "referral",
  dateCol: "starts_at" | "deadline_at",
  fromISO: string,
  toISO: string,
): Promise<{ rows: PostRow[]; ok: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("posts")
      .select(CALENDAR_SELECT_PLAIN)
      .eq("type", type)
      .gte(dateCol, fromISO)
      .lte(dateCol, toISO)
      .order(dateCol, { ascending: true })
      .limit(200);
    if (error) {
      console.error(`[calendar] ${type} fetch failed:`, error.message);
      return { rows: [], ok: false };
    }
    const rows = ((data ?? []) as unknown as PostRow[]).map((r) => ({
      ...r,
      author: null,
      club: null,
    }));
    return { rows, ok: true };
  } catch (err) {
    console.error(
      `[calendar] ${type} fetch threw:`,
      err instanceof Error ? err.message : err,
    );
    return { rows: [], ok: false };
  }
}

function seedCalendarItems(fromISO: string, toISO: string): CalendarItem[] {
  // Same SEED source as the feed fallback so sample mode stays consistent.
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  const out: CalendarItem[] = [];
  for (const p of SEED) {
    const iso = p.type === "event" ? p.startsAt : p.type === "referral" ? p.deadlineAt : null;
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t) || t < from || t > to) continue;
    out.push({
      id: p.id,
      title: p.title,
      dateISO: iso,
      kind: p.type === "referral" ? "referral" : "event",
      status: p.status,
      location: p.location ?? null,
    });
  }
  return out.sort((a, b) => +new Date(a.dateISO) - +new Date(b.dateISO));
}

// Combined calendar feed: every event (by starts_at) + every referral deadline.
// Falls back to SEED only when Supabase isn't configured or the DB query errors
// (a genuinely empty month returns live:true + [] — never seed).
export async function getCalendarItems(
  fromISO: string,
  toISO: string,
): Promise<{ items: CalendarItem[]; live: boolean }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { items: seedCalendarItems(fromISO, toISO), live: false };
  }
  const [events, referrals] = await Promise.all([
    fetchCalendarRows("event", "starts_at", fromISO, toISO),
    fetchCalendarRows("referral", "deadline_at", fromISO, toISO),
  ]);
  if (!events.ok || !referrals.ok) {
    console.error("[calendar] DB unreachable, falling back to sample data");
    return { items: seedCalendarItems(fromISO, toISO), live: false };
  }
  const items: CalendarItem[] = [
    ...events.rows.map((r) => ({
      id: r.id,
      title: r.title,
      dateISO: r.starts_at as string,
      kind: "event" as const,
      status: r.status,
      location: r.location ?? null,
    })),
    ...referrals.rows.map((r) => ({
      id: r.id,
      title: r.title,
      dateISO: r.deadline_at as string,
      kind: "referral" as const,
      status: r.status,
      location: r.location ?? null,
    })),
  ].filter((i) => i.dateISO);
  const sorted = items.sort((a, b) => +new Date(a.dateISO) - +new Date(b.dateISO));
  console.log(
    `[calendar] range ${fromISO}..${toISO}: ${events.rows.length} events + ${referrals.rows.length} deadlines (live)`,
  );
  return { items: sorted, live: true };
}

// All conversations I participate in for one listing, with messages.
export async function getThreadsForListing(listingId: string): Promise<{
  threads: ChatThread[];
  listingTitle: string;
  sellerId: string | null;
  me: string | null;
}> {
  const empty = { threads: [] as ChatThread[], listingTitle: "", sellerId: null, me: null };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return empty;
    const { data: listing } = await supabase
      .from("posts")
      .select("id,title,author_id")
      .eq("id", listingId)
      .single();
    if (!listing) return empty;
    const { data: convs } = await supabase
      .from("conversations")
      .select("id,buyer_id,seller_id")
      .eq("listing_id", listingId)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: true });
    if (!convs?.length) {
      return {
        threads: [],
        listingTitle: listing.title,
        sellerId: listing.author_id,
        me: user.id,
      };
    }
    const otherIds = [...new Set(convs.map((c) => (c.buyer_id === user.id ? c.seller_id : c.buyer_id)))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,handle")
      .in("id", otherIds);
    const handleOf = new Map((profiles ?? []).map((p) => [p.id, `@${p.handle}`]));
    const { data: msgs } = await supabase
      .from("messages")
      .select("id,conversation_id,sender_id,body,created_at")
      .in(
        "conversation_id",
        convs.map((c) => c.id),
      )
      .order("created_at", { ascending: true })
      .limit(500);
    const byConv = new Map<string, ChatMessage[]>();
    for (const m of msgs ?? []) {
      const arr = byConv.get(m.conversation_id) ?? [];
      arr.push({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        body: m.body,
        createdAt: m.created_at,
        mine: m.sender_id === user.id,
      });
      byConv.set(m.conversation_id, arr);
    }
    return {
      threads: convs.map((c) => ({
        id: c.id,
        listingId,
        listingTitle: listing.title,
        otherHandle:
          handleOf.get(c.buyer_id === user.id ? c.seller_id : c.buyer_id) ?? "@student",
        messages: (byConv.get(c.id) ?? []).slice(-100),
      })),
      listingTitle: listing.title,
      sellerId: listing.author_id,
      me: user.id,
    };
  } catch {
    return empty;
  }
}

// My conversations across all listings (chats overview).
export async function getMyThreads(): Promise<ChatThread[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data: convs } = await supabase
      .from("conversations")
      .select("id,listing_id,buyer_id,seller_id,created_at,listing:posts(title)")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!convs?.length) return [];
    const otherIds = [...new Set(convs.map((c) => (c.buyer_id === user.id ? c.seller_id : c.buyer_id)))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,handle")
      .in("id", otherIds);
    const handleOf = new Map((profiles ?? []).map((p) => [p.id, `@${p.handle}`]));
    const { data: lastMsgs } = await supabase
      .from("messages")
      .select("conversation_id,body,created_at,sender_id")
      .in(
        "conversation_id",
        convs.map((c) => c.id),
      )
      .order("created_at", { ascending: false })
      .limit(50);
    const lastByConv = new Map(
      (lastMsgs ?? []).map((m) => [
        m.conversation_id,
        {
          body: m.body as string,
          createdAt: m.created_at as string,
          mine: m.sender_id === user.id,
        },
      ]),
    );
    return convs.map((c) => {
      const listing = one(c.listing) as {
        title: string;
      } | null;
      const last = lastByConv.get(c.id);
      return {
        id: c.id,
        listingId: c.listing_id,
        listingTitle: listing?.title ?? "Listing",
        otherHandle:
          handleOf.get(c.buyer_id === user.id ? c.seller_id : c.buyer_id) ?? "@student",
        messages: last
          ? [
              {
                id: `${c.id}-last`,
                conversationId: c.id,
                senderId: "",
                body: last.body,
                createdAt: last.createdAt,
                mine: last.mine,
              },
            ]
          : [],
      };
    });
  } catch {
    return [];
  }
}

export interface ReportDTO {
  id: string;
  reason: string;
  createdAt: string;
  postId: string;
  postTitle: string;
  postType: string;
  reporterHandle: string;
}

// Open reports for the moderation queue (RLS: moderators only).
export async function getOpenReports(): Promise<ReportDTO[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reports")
      .select(
        "id,reason,created_at,post_id,post:posts(id,title,type),reporter:profiles!reports_reporter_id_fkey(handle)",
      )
      .eq("status", "open")
      .order("created_at", { ascending: true })
      .limit(100);
    if (error || !data) return [];
    return data.map((r) => {
      const post = one(r.post) as {
        title: string;
        type: string;
      } | null;
      const reporter = one(r.reporter) as { handle: string } | null;
      return {
        id: r.id,
        reason: r.reason,
        createdAt: r.created_at,
        postId: r.post_id,
        postTitle: post?.title ?? "(deleted post)",
        postType: post?.type ?? "?",
        reporterHandle: reporter ? `@${reporter.handle}` : "@student",
      };
    });
  } catch {
    return [];
  }
}

export async function isModerator(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("profiles")
      .select("is_moderator")
      .eq("id", user.id)
      .single();
    return data?.is_moderator === true;
  } catch {
    return false;
  }
}

export interface OfferDTO {
  id: string;
  amount: number;
  status: string;
  meetupWhen: string | null;
  meetupWhere: string | null;
  createdAt: string;
  mine: boolean;
  buyerHandle: string;
}

// Offers on a listing — visible to buyer + seller via RLS, [] otherwise.
export async function getOffers(listingId: string): Promise<OfferDTO[]> {
  const me = await currentUserId();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("offers")
      .select("id,amount,status,meetup_when,meetup_where,created_at,buyer_id,buyer:profiles(handle)")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error || !data) return [];
    return data.map((o) => {
      const b = one(o.buyer) as {
        handle: string;
      } | null;
      return {
        id: o.id,
        amount: Number(o.amount),
        status: o.status,
        meetupWhen: o.meetup_when,
        meetupWhere: o.meetup_where,
        createdAt: o.created_at,
        mine: me != null && o.buyer_id === me,
        buyerHandle: b ? `@${b.handle}` : "@student",
      };
    });
  } catch {
    return [];
  }
}
