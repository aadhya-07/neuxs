"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { makeOffer } from "@/lib/actions";
import { cn } from "@/lib/utils";

export function MakeOfferSheet({
  listingId,
  price,
}: {
  listingId: string;
  price: number | null;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(price ?? 100);
  const [when, setWhen] = useState("Today");
  const [where, setWhere] = useState("Student Union");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quicks = price
    ? [
        { label: `Full ₹${price.toLocaleString("en-IN")}`, value: price },
        { label: `10% off`, value: Math.round(price * 0.9) },
        { label: `15% off`, value: Math.round(price * 0.85) },
      ]
    : [];

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const { conversationId } = await makeOffer(listingId, {
        amount,
        meetupWhen: when,
        meetupWhere: where,
      });
      router.push(`/marketplace/${listingId}/chat?cid=${conversationId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send offer.";
      if (/sign in/i.test(msg)) router.push("/login");
      else setError(msg);
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 overflow-hidden rounded-t-[24px] border border-border bg-card shadow-sheet md:rounded-2xl">
      <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-border md:hidden" />
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-display text-[18px] text-ink">Make an Offer</h2>
        <p className="text-[12.5px] text-ink-soft">
          {price ? `Listed at ₹${price.toLocaleString("en-IN")} · ` : ""}Cash meetup only.
        </p>
      </div>
      <div className="space-y-4 px-4 py-4">
        <div className="flex items-center justify-between rounded-xl bg-canvas px-4 py-3">
          <button
            aria-label="Decrease offer"
            onClick={() => setAmount((a) => Math.max(1, a - 50))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-ink"
          >
            <Minus className="h-4 w-4" />
          </button>
          <p className="font-display text-[22px] text-ink">₹{Number(amount).toLocaleString("en-IN")}</p>
          <button
            aria-label="Increase offer"
            onClick={() => setAmount((a) => a + 50)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-ink"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {quicks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quicks.map((q) => (
              <button
                key={q.label}
                onClick={() => setAmount(q.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold",
                  amount === q.value
                    ? "border-transparent bg-market text-white"
                    : "border-border bg-card text-ink-soft",
                )}
              >
                {q.label} · ₹{q.value.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          {["Today", "Tomorrow", "Weekend"].map((w) => (
            <button
              key={w}
              onClick={() => setWhen(w)}
              className={cn(
                "flex-1 rounded-xl border px-3 py-2 text-[13px] font-semibold",
                when === w ? "border-transparent bg-ink text-card" : "border-border bg-card text-ink-soft",
              )}
            >
              {w}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {["Student Union", "Library", "Hostel B"].map((w) => (
            <button
              key={w}
              onClick={() => setWhere(w)}
              className={cn(
                "flex-1 rounded-xl border px-3 py-2 text-[13px] font-semibold",
                where === w ? "border-transparent bg-ink text-card" : "border-border bg-card text-ink-soft",
              )}
            >
              {w}
            </button>
          ))}
        </div>
        <input
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          inputMode="decimal"
          aria-label="Custom amount"
          placeholder="Custom amount (₹)"
          className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-brand"
        />
        <button
          onClick={send}
          disabled={busy || amount <= 0}
          className="w-full rounded-xl bg-market px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Sending…" : `Send Offer · ₹${Number(amount).toLocaleString("en-IN")}`}
        </button>
        {error && <p className="text-[13px] text-event">{error}</p>}
      </div>
    </div>
  );
}
