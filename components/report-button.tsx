"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { submitReport } from "@/lib/actions";

const REASONS = ["Spam", "Scam/fraud", "Harassment", "Wrong category", "Other"];

export function ReportButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await submitReport(postId, reason);
      setDone(true);
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Report failed.";
      if (/sign in/i.test(msg)) router.push("/login");
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <p className="mt-4 text-[12.5px] text-ink-faint">
        Reported — moderators will review it.
      </p>
    );

  return (
    <div className="mt-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-faint hover:text-ink"
        >
          <Flag className="h-3.5 w-3.5" /> Report
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-lg border border-border bg-card px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
          >
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={send}
            disabled={busy}
            className="rounded-lg bg-ink px-3 py-1.5 text-[13px] font-semibold text-card disabled:opacity-60"
          >
            {busy ? "…" : "Send report"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-[13px] text-ink-soft"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="mt-1.5 text-[13px] text-event">{error}</p>}
    </div>
  );
}
