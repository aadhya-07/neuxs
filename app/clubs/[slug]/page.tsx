import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ClubManage } from "@/components/club-manage";
import { PostCard } from "@/components/post-card";
import { PostActions } from "@/components/post-actions";
import { VerifiedCheck } from "@/components/verified-check";
import { getClubBySlug, getClubEvents, getManagers, isClubManager } from "@/lib/clubs";
import { createClient } from "@/lib/supabase/server";
import { isModerator } from "@/lib/engagement";

export default async function ClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) notFound();

  let me: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    me = user?.id ?? null;
  } catch {
    me = null;
  }

  const [events, managers, managing, mod] = await Promise.all([
    getClubEvents(club.id),
    getManagers(club.id),
    isClubManager(me, club.id),
    isModerator(),
  ]);
  const canManage = managing || mod;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/event" className="text-[13px] font-semibold text-ink-soft hover:text-ink">
          ← Events
        </Link>
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="h-20 bg-gradient-to-r from-event-tint via-referral-tint to-doubt-tint" />
          <div className="flex items-center gap-3 p-5 pt-0">
            <div className="-mt-7 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-card bg-event text-[20px] font-bold text-white">
              {club.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 pt-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="font-display text-[22px] text-ink">{club.name}</h1>
                {club.verified && <VerifiedCheck label="Verified Club" />}
              </div>
              <p className="text-[13px] text-ink-soft">
                @{club.slug} · Verified Club · {events.length} event{events.length === 1 ? "" : "s"} ·{" "}
                {managers.length} manager{managers.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>

        {canManage && me && <ClubManage clubId={club.id} managers={managers} me={me} />}

        {!canManage && managers.length > 0 && (
          <p className="mt-3 text-[12.5px] text-ink-faint">
            Run by {managers.map((m) => `@${m.handle}`).join(", ")}.
          </p>
        )}

        <h2 className="mt-6 font-display text-[17px] text-ink">Club events</h2>
        {events.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-8 text-center text-[14px] text-ink-soft">
            No events from this club yet.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            {events.map((p) => (
              <PostCard key={p.id} post={p} action={canManage ? <PostActions post={p} forceMine /> : undefined} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
