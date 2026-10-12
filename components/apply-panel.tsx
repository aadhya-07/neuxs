"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { applyToReferral } from "@/lib/actions";
import type { ApplicantDTO } from "@/lib/engagement";
import { timeAgo } from "@/lib/utils";

export function ApplyPanel({
  postId,
  deadline,
  initialApplied,
  initialCount,
  isOwner,
  initialApplicants,
  signedIn,
}: {
  postId: string;
  deadline?: string | null;
  initialApplied: boolean;
  initialCount: number;
  isOwner: boolean;
  initialApplicants: ApplicantDTO[];
  signedIn: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = deadline ? new Date(deadline) < new Date() : false;

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await applyToReferral(postId, note);
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Application failed.");
    } finally {
      setBusy(false);
    }
  }

  if (isOwner) {
    return (
      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-[17px] text-ink">
          Applicants ({initialApplicants.length})
        </h2>
        {initialApplicants.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-ink-soft">No applications yet.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {initialApplicants.map((a) => (
              <li key={a.applicantId} className="rounded-lg bg-canvas p-3">
                <p className="text-[13.5px] font-semibold text-ink">
                  {a.fullName ?? a.handle}{" "}
                  <span className="font-normal text-ink-faint">{a.handle}</span>
                </p>
                {a.note && <p className="mt-1 text-[13px] text-ink-soft">{a.note}</p>}
                <p className="mt-1 text-[11.5px] text-ink-faint">{timeAgo(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4">
      <p className="text-[13.5px] text-ink-soft">
        <span className="font-bold text-ink">{initialCount}</span> applied
        {deadline ? ` · closes ${new Date(deadline).toLocaleDateString()}` : ""}
      </p>
      {expired ? (
        <p className="mt-2 text-[13.5px] font-semibold text-event">Applications closed.</p>
      ) : initialApplied ? (
        <p className="mt-2 rounded-lg bg-market-tint px-3 py-2 text-[13.5px] font-semibold text-market">
          Applied ✓ — the poster can see your profile.
        </p>
      ) : (
        <form onSubmit={apply} className="mt-3 flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note to poster (resume link, CGPA…)"
            maxLength={500}
            className="min-w-0 flex-1 rounded-xl border border-border bg-canvas px-3 py-2 text-[13.5px] text-ink outline-none placeholder:text-ink-faint focus:border-brand"
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-xl bg-referral px-4 py-2 text-[13.5px] font-semibold text-white disabled:opacity-60"
          >
            {busy ? "…" : "Apply"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-[13px] text-event">{error}</p>}
    </div>
  );
}
