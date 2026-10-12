import Link from "next/link";
import { dismissReport, takedownPost } from "@/lib/actions";
import type { ReportDTO } from "@/lib/engagement";
import { timeAgo } from "@/lib/utils";

// Server component — actions bind per row; proxy.ts already gates /moderation
// to the moderator claim.
export function ModerationQueue({ reports }: { reports: ReportDTO[] }) {
  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-[14px] text-ink-soft">
        Queue is clear. No open reports.
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {reports.map((r) => (
        <li key={r.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-event-tint px-2 py-0.5 text-[10.5px] font-bold uppercase text-event">
              {r.reason}
            </span>
            <span className="text-[11.5px] text-ink-faint">
              {r.reporterHandle} · {timeAgo(r.createdAt)}
            </span>
          </div>
          <Link href={`/post/${r.postId}`} className="mt-2 block font-display text-[15px] text-ink hover:underline">
            {r.postTitle}
          </Link>
          <div className="mt-3 flex gap-2">
            <form action={dismissReport.bind(null, r.id)}>
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold text-ink-soft"
              >
                Dismiss
              </button>
            </form>
            <form action={takedownPost.bind(null, r.postId, r.id)}>
              <button
                type="submit"
                className="rounded-lg bg-event px-3 py-1.5 text-[13px] font-semibold text-white"
              >
                Delete post (−20 karma)
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
