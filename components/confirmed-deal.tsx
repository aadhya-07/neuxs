"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Phone, Navigation, ShieldCheck } from "lucide-react";
import type { OfferDTO } from "@/lib/engagement";

const QUICK = ["I'm here", "Running 5 late", "What are you wearing?", "Cash ready", "Send live location"];

export function ConfirmedDeal({
  offer,
  listingTitle,
  chatHref,
}: {
  offer: OfferDTO;
  listingTitle: string;
  chatHref: string;
}) {
  const [arrived, setArrived] = useState(false);
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-market bg-card shadow-card">
      <div className="bg-market-tint px-4 py-3">
        <p className="flex items-center gap-2 text-[13px] font-bold text-market">
          <ShieldCheck className="h-4 w-4" /> Verified Safe Meetup Zone
        </p>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">
          {listingTitle} · ₹{offer.amount.toLocaleString("en-IN")} · {offer.status}
        </p>
      </div>
      <div className="space-y-3 px-4 py-4">
        <div className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2.5 text-[13px] text-ink-soft">
          <MapPin className="h-4 w-4 shrink-0 text-market" />
          {offer.meetupWhere ?? "Student Union"} · {offer.meetupWhen ?? "Today"} · Cash only
        </div>
        <button
          onClick={() => setArrived((v) => !v)}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold ${
            arrived ? "bg-market text-white" : "bg-ink text-card"
          }`}
        >
          <Navigation className="h-4 w-4" /> {arrived ? "Arrived ✓ — waiting" : "I've Arrived"}
        </button>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <Link
              key={q}
              href={chatHref}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft hover:text-ink"
            >
              {q}
            </Link>
          ))}
        </div>
        <div className="flex gap-2">
          <Link
            href={chatHref}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[14px] font-semibold text-white"
          >
            Open chat
          </Link>
          <a
            href="tel:"
            aria-label="Call"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-ink-soft"
          >
            <Phone className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
