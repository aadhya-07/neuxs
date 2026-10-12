"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { counterOffer, setOfferStatus } from "@/lib/actions";
import type { OfferDTO } from "@/lib/engagement";
import { timeAgo } from "@/lib/utils";

export function OfferPanel({
  initialOffers,
  isSeller,
  signedIn,
}: {
  initialOffers: OfferDTO[];
  isSeller: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [offers, setOffers] = useState(initialOffers);
  const [countering, setCountering] = useState<string | null>(null);
  const [counterValue, setCounterValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) return null;
  if (!offers.length && !isSeller) return null;

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-card">
      <h2 className="font-display text-[15px] text-ink">
        Offers {offers.length > 0 && <span className="text-ink-faint">({offers.length})</span>}
      </h2>
      {offers.length === 0 ? (
        <p className="mt-1 text-[13px] text-ink-soft">
          No offers yet — buyers can propose a price below.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {offers.map((o) => (
            <li key={o.id} className="rounded-xl border border-border bg-canvas/50 p-3">
              <div className="flex items-center gap-2">
                <p className="font-display text-[16px] text-ink">
                  ₹{o.amount.toLocaleString("en-IN")}
                </p>
                <span className="rounded-full bg-card px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-ink-soft uppercase">
                  {o.status}
                </span>
                <span className="ml-auto text-[11.5px] text-ink-faint">{timeAgo(o.createdAt)}</span>
              </div>
              <p className="mt-1 text-[12px] text-ink-soft">
                {o.mine ? "You" : o.buyerHandle}
                {o.meetupWhen ? ` · ${o.meetupWhen}` : ""}
                {o.meetupWhere ? ` @ ${o.meetupWhere}` : ""}
              </p>
              {isSeller && (o.status === "offered" || o.status === "countered") && (
                <div className="mt-2">
                  {countering === o.id ? (
                    <div className="flex gap-2">
                      <input
                        value={counterValue}
                        onChange={(e) => setCounterValue(e.target.value)}
                        inputMode="decimal"
                        placeholder="Counter amount (₹)"
                        className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand"
                      />
                      <button
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            await counterOffer(o.id, Number(counterValue));
                            setCountering(null);
                            setCounterValue("");
                          })
                        }
                        className="shrink-0 rounded-xl bg-ink px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                      >
                        Send
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        disabled={busy}
                        onClick={() => act(() => setOfferStatus(o.id, "accepted"))}
                        className="flex-1 rounded-xl bg-market px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                      >
                        Accept
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => {
                          setCountering(o.id);
                          setCounterValue(String(o.amount));
                        }}
                        className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-[13px] font-semibold text-ink disabled:opacity-60"
                      >
                        Counter
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => act(() => setOfferStatus(o.id, "declined"))}
                        className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-[13px] font-semibold text-ink-soft disabled:opacity-60"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!isSeller && o.mine && o.status === "offered" && (
                <button
                  disabled={busy}
                  onClick={() => act(() => setOfferStatus(o.id, "withdrawn"))}
                  className="mt-2 rounded-xl border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft disabled:opacity-60"
                >
                  Withdraw
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-[13px] text-event">{error}</p>}
    </div>
  );
}
