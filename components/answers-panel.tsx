"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowBigUp } from "lucide-react";
import { submitAnswer, toggleVote } from "@/lib/actions";
import type { AnswerDTO } from "@/lib/engagement";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function AnswersPanel({
  postId,
  initialAnswers,
  signedIn,
}: {
  postId: string;
  initialAnswers: AnswerDTO[];
  signedIn: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState(initialAnswers);
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function vote(a: AnswerDTO) {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    if (pending.has(a.id)) return; // one flight per answer — no toggle races
    const wantVoted = !a.voted;
    // Optimistic: flip instantly, reconcile with server truth below.
    setPending((prev) => new Set(prev).add(a.id));
    setAnswers((prev) =>
      prev.map((x) =>
        x.id === a.id
          ? { ...x, voted: wantVoted, score: x.score + (wantVoted ? 1 : -1) }
          : x,
      ),
    );
    try {
      const res = await toggleVote(a.id, postId, wantVoted);
      setAnswers((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, voted: res.voted, score: res.score } : x)),
      );
    } catch (err) {
      // Revert to pre-click state on failure.
      setAnswers((prev) =>
        prev.map((x) =>
          x.id === a.id
            ? { ...x, voted: a.voted, score: a.score }
            : x,
        ),
      );
      setError(err instanceof Error ? err.message : "Vote failed.");
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(a.id);
        return next;
      });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitAnswer(postId, body, anonymous);
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post answer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <h2 className="font-display text-[17px] text-ink">
        Answers ({answers.length})
      </h2>
      <ul className="mt-3 space-y-3">
        {answers.map((a) => (
          <li key={a.id} className="flex gap-3 rounded-xl border border-border bg-card p-3.5">
            <button
              onClick={() => vote(a)}
              aria-label="Upvote"
              aria-pressed={a.voted}
              className={cn(
                "flex h-fit touch-manipulation flex-col items-center rounded-lg px-2 py-1 text-[12px] font-bold transition-all active:scale-90",
                a.voted ? "bg-doubt-tint text-doubt" : "bg-canvas text-ink-soft",
              )}
            >
              <ArrowBigUp className="h-4 w-4" />
              {a.score}
            </button>
            <div className="min-w-0">
              <p className="text-[13.5px] leading-relaxed text-ink">{a.body}</p>
              <p className="mt-1.5 text-[11.5px] text-ink-faint">
                {a.displayName} · {timeAgo(a.createdAt)}
                {a.mine ? " · you" : ""}
              </p>
            </div>
          </li>
        ))}
        {answers.length === 0 && (
          <li className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-[13.5px] text-ink-soft">
            No answers yet. Be the first to help.
          </li>
        )}
      </ul>
      <form onSubmit={submit} className="mt-4 space-y-2.5">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={signedIn ? "Write your answer…" : "Sign in to answer…"}
          rows={3}
          maxLength={2000}
          className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-brand"
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            Post anonymously
          </label>
          <button
            type="submit"
            disabled={busy}
            className="ml-auto rounded-xl bg-doubt px-4 py-2 text-[13.5px] font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Posting…" : "Answer"}
          </button>
        </div>
      </form>
      {error && <p className="mt-2 text-[13px] text-event">{error}</p>}
    </div>
  );
}
