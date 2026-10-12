"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8 text-center shadow-card">
      <p className="font-display text-[18px] text-ink">Something went wrong</p>
      <p className="mt-1 text-[13.5px] text-ink-soft">
        {error.message || "Couldn't load this view. Check your connection and try again."}
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-xl bg-brand px-4 py-2 text-[14px] font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}
