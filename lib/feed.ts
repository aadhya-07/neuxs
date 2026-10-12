import { SEED } from "@/lib/seed";
import { createClient } from "@/lib/supabase/server";
import type { Post, PostStatus, PostType } from "@/lib/types";

export interface FeedQuery {
  q?: string;
  category?: string;
  maxPrice?: string;
  scope?: "open" | "all";
  limit?: number;
}

interface AuthorRef {
  handle: string;
  full_name: string | null;
}

interface ClubRef {
  name: string;
  slug: string;
}

export interface PostRow {
  id: string;
  type: PostType;
  title: string;
  body: string;
  images: string[] | null;
  status: PostStatus;
  author_id: string | null;
  club_id: string | null;
  price: number | string | null;
  category: string | null;
  location: string | null;
  starts_at: string | null;
  deadline_at: string | null;
  created_at: string;
  author: AuthorRef | AuthorRef[] | null;
  club: ClubRef | ClubRef[] | null;
}

export function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// Strip PostgREST `or()` metacharacters so user input can't break the query.
function safeLike(s: string): string {
  return s.replace(/[%(),"]/g, " ").trim();
}

function seedFiltered(f: FeedQuery): Post[] {
  const q = (f.q ?? "").trim().toLowerCase();
  const cat = (f.category ?? "").trim().toLowerCase();
  const max = Number(f.maxPrice);
  return SEED.filter((p) => {
    if ((f.scope ?? "open") === "open" && p.status !== "open") return false;
    if (q && !`${p.title} ${p.body}`.toLowerCase().includes(q)) return false;
    if (cat && !(p.category ?? "").toLowerCase().includes(cat)) return false;
    if ((f.maxPrice ?? "").trim() && Number.isFinite(max) && p.price != null && p.price > max)
      return false;
    return true;
  }).slice(0, f.limit ?? 100);
}

export function mapRow(
  row: PostRow,
  counts: { upvotes: number; applicants: number; rsvps: number; replies?: number },
): Post {
  const author = one(row.author);
  const club = one(row.club);
  const priceNum = row.price == null || row.price === "" ? null : Number(row.price);
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? "",
    images: row.images ?? [],
    status: row.status,
    authorName:
      row.type === "doubt"
        ? "Anonymous"
        : (club?.name ?? author?.full_name ?? author?.handle ?? "Student"),
    authorHandle: club ? `@${club.slug}` : author ? `@${author.handle}` : "@student",
    authorId: row.author_id,
    clubId: row.club_id,
    clubSlug: club?.slug ?? null,
    verified: true,
    anonymous: row.type === "doubt",
    createdAt: row.created_at,
    location: row.location ?? undefined,
    price: Number.isFinite(priceNum) ? priceNum : null,
    category: row.category,
    upvotes: counts.upvotes,
    applicants: counts.applicants,
    rsvps: counts.rsvps,
    replies: counts.replies ?? 0,
    deadlineAt: row.deadline_at,
    startsAt: row.starts_at,
  };
}

export interface FeedPageParams {
  q: string;
  category: string;
  maxPrice: string;
  scope: "open" | "all";
}

// Next 16 passes searchParams as a Promise of string|string[]|undefined.
export function feedParamsFrom(sp: {
  [key: string]: string | string[] | undefined;
}): FeedPageParams {
  return {
    q: one(sp.q) ?? "",
    category: one(sp.cat) ?? "",
    maxPrice: one(sp.max) ?? "",
    scope: one(sp.scope) === "all" ? "all" : "open",
  };
}

// Server-side feed. Reads `posts` (recency-ordered) with FTS search, filters,
// and batched engagement counts. Two-tier fetch: with author/club embeds
// first, then plain rows + batched profile lookups (survives a stale
// PostgREST cache on the relationship). Falls back to SEED only when the DB
// is truly unreachable, and always logs the real error to the server
// terminal so failures are diagnosable instead of silent.
// NOTE: swap `.from("posts")` to `.from("feed_ranked")` once the view + its
// PostgREST embeds are verified in your project (TAD §6 ranking).
const SELECT_EMBEDDED =
  "id,type,title,body,images,status,author_id,club_id,price,category,location,starts_at,deadline_at,created_at,author:profiles(handle,full_name),club:clubs(name,slug)";
const SELECT_PLAIN =
  "id,type,title,body,images,status,author_id,club_id,price,category,location,starts_at,deadline_at,created_at";

export async function getFeed(f: FeedQuery): Promise<{ posts: Post[]; live: boolean }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { posts: seedFiltered(f), live: false };
  }
  try {
    const supabase = await createClient();
    const limit = f.limit ?? 100;
    const scope = f.scope ?? "open";
    const cat = safeLike(f.category ?? "");
    const max = Number(f.maxPrice);
    const rawQ = (f.q ?? "").trim();
    const q = safeLike(rawQ);

    const build = (select: string) => {
      let qb = supabase
        .from("posts")
        .select(select)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (scope === "open") qb = qb.eq("status", "open");
      if (cat) qb = qb.ilike("category", `%${cat}%`);
      if ((f.maxPrice ?? "").trim() && Number.isFinite(max) && max > 0) qb = qb.lte("price", max);
      return qb;
    };

    const fetchRows = async (select: string): Promise<PostRow[]> => {
      if (q) {
        const fts = await build(select).textSearch("search_vector", q, { type: "plain" });
        if (fts.error && /search_vector|textsearch|tsquery/i.test(fts.error.message)) {
          const fb = await build(select).or(`title.ilike.%${q}%,body.ilike.%${q}%`);
          if (fb.error) throw new Error(fb.error.message);
          return fb.data as unknown as PostRow[];
        }
        if (fts.error) throw new Error(fts.error.message);
        return fts.data as unknown as PostRow[];
      }
      const res = await build(select);
      if (res.error) throw new Error(res.error.message);
      return res.data as unknown as PostRow[];
    };

    // Tier 2: plain rows + batched author/club lookups (no PostgREST embeds).
    const attachAuthors = async (rows: PostRow[]): Promise<PostRow[]> => {
      const authorIds = [...new Set(rows.map((r) => r.author_id).filter((v): v is string => !!v))];
      const clubIds = [...new Set(rows.map((r) => r.club_id).filter((v): v is string => !!v))];
      const [authors, clubs] = await Promise.all([
        authorIds.length
          ? supabase.from("profiles").select("id,handle,full_name").in("id", authorIds)
          : Promise.resolve({ data: [] as { id: string; handle: string; full_name: string | null }[], error: null }),
        clubIds.length
          ? supabase.from("clubs").select("id,name,slug").in("id", clubIds)
          : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[], error: null }),
      ]);
      if (authors.error) throw new Error(authors.error.message);
      if (clubs.error) throw new Error(clubs.error.message);
      const aMap = new Map((authors.data ?? []).map((a) => [a.id, { handle: a.handle, full_name: a.full_name }]));
      const cMap = new Map((clubs.data ?? []).map((c) => [c.id, { name: c.name, slug: c.slug }]));
      return rows.map((r) => ({
        ...r,
        author: r.author_id ? (aMap.get(r.author_id) ?? null) : null,
        club: r.club_id ? (cMap.get(r.club_id) ?? null) : null,
      }));
    };

    let rows: PostRow[];
    try {
      rows = await fetchRows(SELECT_EMBEDDED);
    } catch (err) {
      console.error(
        "[feed] joined fetch failed, retrying without embeds:",
        err instanceof Error ? err.message : err,
      );
      rows = await attachAuthors(await fetchRows(SELECT_PLAIN));
    }

    // Batched engagement counts (4 queries total, failures → zeros).
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
      const bump = (pid: string, key: "upvotes" | "applicants" | "rsvps" | "replies") => {
        const cur = tally.get(pid);
        if (cur) tally.set(pid, { ...cur, [key]: cur[key] + 1 });
      };
      for (const a of apps.data ?? []) bump(a.post_id, "applicants");
      for (const r of rsvps.data ?? []) bump(r.post_id, "rsvps");
      const answerList = answers.data ?? [];
      for (const a of answerList) bump(a.post_id, "replies");
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
      console.error(
        "[feed] engagement counts failed (showing zeros):",
        err instanceof Error ? err.message : err,
      );
    }

    return {
      posts: rows.map((r) => mapRow(r, tally.get(r.id) ?? { upvotes: 0, applicants: 0, rsvps: 0, replies: 0 })),
      live: true,
    };
  } catch (err) {
    console.error(
      "[feed] falling back to sample data:",
      err instanceof Error ? err.message : err,
    );
    return { posts: seedFiltered(f), live: false };
  }
}
