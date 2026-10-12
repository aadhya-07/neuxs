import { createClient } from "@/lib/supabase/server";
import { mapRow, type PostRow } from "@/lib/feed";
import { normalizeHandle } from "@/lib/utils";
import type { Post } from "@/lib/types";

export interface ProfileLink {
  label: string;
  url: string;
}

export interface ProfileDTO {
  id: string;
  handle: string;
  fullName: string | null;
  avatarUrl: string | null;
  collegeDomain: string | null;
  provider: string | null;
  bio: string | null;
  links: ProfileLink[];
  wallpaperUrl: string | null;
  isVerified: boolean;
  karma: number;
  isModerator: boolean;
  createdAt: string;
}

interface ProfileRow {
  id: string;
  handle: string;
  full_name: string | null;
  avatar_url: string | null;
  college_domain: string | null;
  provider: string | null;
  bio?: string | null;
  links?: unknown;
  wallpaper_url?: string | null;
  is_verified: boolean;
  karma: number;
  is_moderator: boolean;
  created_at: string;
}

// links is user-shaped JSON — sanitize on read so a hand-edited row can't
// inject malformed entries into the UI.
export function sanitizeLinks(v: unknown): ProfileLink[] {
  if (!Array.isArray(v)) return [];
  const out: ProfileLink[] = [];
  for (const item of v.slice(0, 6)) {
    if (typeof item !== "object" || item === null) continue;
    const { label, url } = item as { label?: unknown; url?: unknown };
    if (typeof label !== "string" || typeof url !== "string") continue;
    const l = label.trim().slice(0, 30);
    const u = url.trim();
    if (!l || !u) continue;
    try {
      const parsed = new URL(u);
      if (!["http:", "https:"].includes(parsed.protocol)) continue;
    } catch {
      continue;
    }
    out.push({ label: l, url: u });
  }
  return out;
}

function toDTO(r: ProfileRow): ProfileDTO {
  return {
    id: r.id,
    handle: r.handle,
    fullName: r.full_name,
    avatarUrl: r.avatar_url,
    collegeDomain: r.college_domain,
    provider: r.provider,
    bio: r.bio ?? null,
    links: sanitizeLinks(r.links),
    wallpaperUrl: r.wallpaper_url ?? null,
    isVerified: r.is_verified,
    karma: r.karma,
    isModerator: r.is_moderator,
    createdAt: r.created_at,
  };
}

const PROFILE_COLS =
  "id,handle,full_name,avatar_url,college_domain,provider,bio,links,wallpaper_url,is_verified,karma,is_moderator,created_at";

// Pre-0010 fallback: if the migration hasn't run yet, PostgREST rejects the
// unknown `provider` column — retry without it instead of failing the page.
const PROFILE_COLS_LEGACY =
  "id,handle,full_name,avatar_url,college_domain,is_verified,karma,is_moderator,created_at";

// Cascading fallback for not-yet-run migrations (0010 provider, 0011 bio/links,
// 0014 wallpaper_url).
const PROFILE_COL_SETS = [
  { cols: PROFILE_COLS, patch: {} },
  {
    cols: "id,handle,full_name,avatar_url,college_domain,provider,bio,links,is_verified,karma,is_moderator,created_at",
    patch: { wallpaperUrl: null },
  },
  {
    cols: "id,handle,full_name,avatar_url,college_domain,provider,is_verified,karma,is_moderator,created_at",
    patch: { bio: null, links: [], wallpaperUrl: null },
  },
  { cols: PROFILE_COLS_LEGACY, patch: { provider: null, bio: null, links: [], wallpaperUrl: null } },
] as const;

async function fetchProfileRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  col: "id" | "handle",
  value: string,
): Promise<ProfileDTO | null> {
  let lastError: string | null = null;
  for (const set of PROFILE_COL_SETS) {
    const { data, error } = await supabase.from("profiles").select(set.cols).eq(col, value).single();
    if (!error && data) {
      const dto = toDTO(data as unknown as ProfileRow);
      return { ...dto, ...(set.patch as Partial<ProfileDTO>) };
    }
    if (error && /column|provider|bio|links|wallpaper/i.test(error.message)) {
      lastError = error.message;
      continue; // column missing — migration not run yet, try narrower set
    }
    if (error && error.code !== "PGRST116") {
      console.error("[profile] fetch failed:", error.message);
    }
    return null;
  }
  console.error("[profile] columns missing (run migrations 0010–0014):", lastError);
  return null;
}

// Plain columns only — no FK embeds (see calendar fix: stale PostgREST cache).
const POST_COLS =
  "id,type,title,body,images,status,author_id,club_id,price,category,location,lost_or_found,starts_at,deadline_at,created_at";

function withEmptyAuthors(rows: PostRow[]): PostRow[] {
  return rows.map((r) => ({ ...r, author: null, club: null }));
}

async function attachCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: PostRow[],
): Promise<Map<string, { upvotes: number; applicants: number; rsvps: number }>> {
  const tally = new Map<string, { upvotes: number; applicants: number; rsvps: number; replies: number }>();
  for (const r of rows) tally.set(r.id, { upvotes: 0, applicants: 0, rsvps: 0, replies: 0 });
  try {
    const referralIds = rows.filter((r) => r.type === "referral").map((r) => r.id);
    const eventIds = rows.filter((r) => r.type === "event").map((r) => r.id);
    const doubtIds = rows.filter((r) => r.type === "doubt").map((r) => r.id);
    const [apps, rsvps, answers] = await Promise.all([
      referralIds.length
        ? supabase.from("applications").select("post_id").in("post_id", referralIds)
        : Promise.resolve({ data: [] as { post_id: string }[], error: null }),
      eventIds.length
        ? supabase.from("rsvps").select("post_id").in("post_id", eventIds)
        : Promise.resolve({ data: [] as { post_id: string }[], error: null }),
      doubtIds.length
        ? supabase.from("answers").select("id,post_id").in("post_id", doubtIds)
        : Promise.resolve({ data: [] as { id: string; post_id: string }[], error: null }),
    ]);
    const bump = (pid: string, key: "upvotes" | "applicants" | "rsvps") => {
      const cur = tally.get(pid);
      if (cur) tally.set(pid, { ...cur, [key]: cur[key] + 1 });
    };
    for (const a of apps.data ?? []) bump(a.post_id, "applicants");
    for (const r of rsvps.data ?? []) bump(r.post_id, "rsvps");
    const answerList = answers.data ?? [];
    if (answerList.length) {
      const postByAnswer = new Map(answerList.map((a) => [a.id, a.post_id]));
      const { data: votes } = await supabase
        .from("votes")
        .select("answer_id")
        .in("answer_id", answerList.map((a) => a.id));
      for (const v of votes ?? []) {
        const pid = postByAnswer.get(v.answer_id);
        if (pid) bump(pid, "upvotes");
      }
    }
  } catch (err) {
    console.error("[profile] counts failed:", err instanceof Error ? err.message : err);
  }
  return tally;
}

async function toPosts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: PostRow[],
  author: { handle: string; full_name: string | null } | null,
): Promise<Post[]> {
  const tally = await attachCounts(supabase, rows);
  return rows.map((r) =>
    mapRow(
      { ...r, author: author ?? r.author, club: r.club },
      tally.get(r.id) ?? { upvotes: 0, applicants: 0, rsvps: 0 },
    ),
  );
}

export async function getMyProfile(): Promise<{ profile: ProfileDTO | null; userId: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { profile: null, userId: null };
    const profile = await fetchProfileRow(supabase, "id", user.id);
    return { profile, userId: user.id };
  } catch {
    return { profile: null, userId: null };
  }
}

export async function getProfileByHandle(handle: string): Promise<ProfileDTO | null> {
  const clean = normalizeHandle(handle);
  if (!clean) return null;
  try {
    const supabase = await createClient();
    return fetchProfileRow(supabase, "handle", clean);
  } catch {
    return null;
  }
}

export async function getPostsByAuthor(authorId: string, limit = 50): Promise<Post[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("posts")
      .select(POST_COLS)
      .eq("author_id", authorId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) {
      if (error) console.error("[profile] posts fetch failed:", error.message);
      return [];
    }
    const rows = withEmptyAuthors(data as unknown as PostRow[]);
    const { data: prof } = await supabase
      .from("profiles")
      .select("handle,full_name")
      .eq("id", authorId)
      .single();
    const author = (prof as { handle: string; full_name: string | null } | null) ?? null;
    return toPosts(supabase, rows, author);
  } catch {
    return [];
  }
}

async function getPostsByIds(ids: string[]): Promise<Post[]> {
  if (!ids.length) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("posts")
      .select(POST_COLS)
      .in("id", ids)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !data) {
      if (error) console.error("[profile] posts-by-ids fetch failed:", error.message);
      return [];
    }
    const rows = withEmptyAuthors(data as unknown as PostRow[]);
    // Attach authors in one batch so cards show real names.
    const authorIds = [...new Set(rows.map((r) => r.author_id).filter((v): v is string => !!v))];
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
    const tally = await attachCounts(supabase, rows);
    return rows.map((r) =>
      mapRow(
        { ...r, author: r.author_id ? (aMap.get(r.author_id) ?? null) : null, club: null },
        tally.get(r.id) ?? { upvotes: 0, applicants: 0, rsvps: 0 },
      ),
    );
  } catch {
    return [];
  }
}

export async function getRsvpPosts(userId: string): Promise<Post[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("rsvps").select("post_id").eq("user_id", userId).limit(100);
    return getPostsByIds((data ?? []).map((r) => r.post_id));
  } catch {
    return [];
  }
}

export async function getAppliedPosts(userId: string): Promise<Post[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("applications")
      .select("post_id")
      .eq("applicant_id", userId)
      .limit(100);
    return getPostsByIds((data ?? []).map((r) => r.post_id));
  } catch {
    return [];
  }
}

export async function getAnswerCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("answers")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId);
    return count ?? 0;
  } catch {
    return 0;
  }
}
