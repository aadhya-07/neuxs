import { AppShell } from "@/components/app-shell";
import { ClubCreateForm } from "@/components/club-create-form";
import { ModerationQueue } from "@/components/moderation-queue";
import { getOpenReports } from "@/lib/engagement";

// Proxy gates /moderation to the moderator claim; this just renders the queue.
export default async function ModerationPage() {
  const reports = await getOpenReports();
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="font-display text-[26px] text-ink">Moderation</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Open user reports. Dismiss the noise, takedown upheld reports (−20
          karma to the author, logged in karma_events).
        </p>
        <div className="mt-4">
          <ModerationQueue reports={reports} />
        </div>
        <ClubCreateForm />
      </div>
    </AppShell>
  );
}
