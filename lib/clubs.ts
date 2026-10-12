import { createClient } from "@/lib/supabase/server";
import { mapRow, type PostRow } from "@/lib/feed";
import { normalizeHandle } from "@/lib/utils";
import type { Post } from "@/lib/types";

export interface ClubDTO {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  createdAt: string;
}

export interface ClubManagerDTO {
  userId: string;
  handle: string;
  fullName: string | null;
  createdAt: string;
}

interface ClubRow {
  id: string;
  slug: string;
  name: string;
  avatar_url: string | null;
  verified: boolean;
  created_at: string;
}

const CLUB_COLS = "id,slug,name,avatar_url,verified,created_at";
const CLUB_POST_COLS =
  "id,type,title,body,images,status,author_id,club_id,price,category,location,lost_or_found,starts_at,deadline_at,created_at";

function toClub(r: ClubRow): ClubDTO {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    avatarUrl: r.avatar_url,
    verified: r.verified,
    createdAt: r.created_at,
  };
}

export async function getClubBySlug(slug: string): Promise<ClubDTO | null> {
  const clean = normalizeHandle(slug);
  if (!clean) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clubs")
      .select(CLUB_COLS)
      .eq("slug", clean)
      .single();
    if (error || !data) return null;
    return toClub(data as ClubRow);
  } catch {
    return null;
  }
}

export async function getManagers(clubId: string): Promise<ClubManagerDTO[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("club_managers")
      .select("user_id,created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: true });
    if (error || !data || !data.length) return [];
    const ids = data.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,handle,full_name")
      .in("id", ids);
    const pMap = new Map(
      ((profiles ?? []) as { id: string; handle: string; full_name: string | null }[]).map((p) => [
        p.id,
        p,
      ]),
    );
    return data.map((m) => ({
      userId: m.user_id,
      handle: pMap.get(m.user_id)?.handle ?? "student",
      fullName: pMap.get(m.user_id)?.full_name ?? null,
      createdAt: m.created_at,
    }));
  } catch {
    return [];
  }
}

export async function isClubManager(userId: string | null, clubId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("club_managers")
      .select("club_id")
      .eq("club_id", clubId)
      .eq("user_id", userId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

// Events posted by a club, newest first, with RSVP counts.
export async function getClubEvents(clubId: string, limit = 50): Promise<Post[]> {
  try {
    const supabase = await createClient();
    const { data: club } = await supabase
      .from("clubs")
      .select("name,slug")
      .eq("id", clubId)
      .single();
    const { data, error } = await supabase
      .from("posts")
      .select(CLUB_POST_COLS)
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) {
      if (error) console.error("[clubs] events fetch failed:", error.message);
      return [];
    }
    const rows = data as unknown as PostRow[];
    const clubRef = (club as { name: string; slug: string } | null) ?? null;
    const rsvps = new Map<string, number>();
    const ids = rows.map((r) => r.id);
    if (ids.length) {
      const { data: votes } = await supabase.from("rsvps").select("post_id").in("post_id", ids);
      for (const v of votes ?? []) rsvps.set(v.post_id, (rsvps.get(v.post_id) ?? 0) + 1);
    }
    return rows.map((r) =>
      mapRow(
        { ...r, author: null, club: clubRef },
        { upvotes: 0, applicants: 0, rsvps: rsvps.get(r.id) ?? 0 },
      ),
    );
  } catch {
    return [];
  }
}
