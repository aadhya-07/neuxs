"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { toggleRsvp } from "@/lib/actions";
import { cn } from "@/lib/utils";

export function RsvpPanel({
  postId,
  initialGoing,
  initialCount,
  signedIn,
}: {
  postId: string;
  initialGoing: boolean;
  initialCount: number;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [going, setGoing] = useState(initialGoing);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setError(null);
    setGoing(!going);
    setCount((c) => c + (going ? -1 : 1));
    try {
      const res = await toggleRsvp(postId);
      setGoing(res.going);
      router.refresh();
    } catch (err) {
      setGoing(going);
      setCount(initialCount);
      setError(err instanceof Error ? err.message : "RSVP failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          disabled={busy}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-semibold disabled:opacity-60",
            going ? "bg-event-tint text-event" : "bg-event text-white",
          )}
        >
          <CalendarCheck className="h-4 w-4" />
          {going ? "Going ✓" : "RSVP"}
        </button>
        <p className="text-[13.5px] text-ink-soft">
          <span className="font-bold text-ink">{count}</span> going
        </p>
      </div>
      {error && <p className="mt-2 text-[13px] text-event">{error}</p>}
    </div>
  );
}
