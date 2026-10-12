import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Feed } from "@/components/feed";
import { feedParamsFrom, getFeed } from "@/lib/feed";

export default async function EventPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const fp = feedParamsFrom(await searchParams);
  const { posts, live } = await getFeed(fp);
  return (
    <AppShell>
      <div className="mb-3 flex justify-end">
        <Link
          href="/event/calendar"
          className="rounded-xl border border-border bg-card px-3.5 py-2 text-[13px] font-semibold text-ink-soft hover:text-ink"
        >
          📅 Calendar view — every event by date
        </Link>
      </div>
      <Feed
        basePath="/event"
        initialTab="event"
        title="Events"
        subtitle="Club events in one place. RSVP with one tap."
        posts={posts}
        live={live}
        initialQuery={fp.q}
        initialCategory={fp.category}
        initialMaxPrice={fp.maxPrice}
        initialScope={fp.scope}
      />
    </AppShell>
  );
}
