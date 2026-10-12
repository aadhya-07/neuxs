import { AppShell } from "@/components/app-shell";
import { FeedSkeleton } from "@/components/feed-skeleton";

export default function Loading() {
  return (
    <AppShell>
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <div className="h-7 w-48 animate-pulse rounded bg-card" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-card" />
          <div className="mt-4 h-11 animate-pulse rounded-xl bg-card" />
          <FeedSkeleton />
        </div>
      </div>
    </AppShell>
  );
}
