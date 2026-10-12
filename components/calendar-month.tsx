import Link from "next/link";
import { isToday } from "date-fns";
import { cn } from "@/lib/utils";

export interface CalendarDayPost {
  id: string;
  title: string;
  time?: string;
  kind?: "event" | "referral";
  status?: string;
}

export interface CalendarDay {
  date: Date;
  outside: boolean;
  posts: CalendarDayPost[];
}

export function CalendarMonth({
  weeks,
  monthLabel,
  prevHref,
  nextHref,
}: {
  weeks: CalendarDay[][];
  monthLabel: string;
  prevHref: string;
  nextHref: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <Link href={prevHref} className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-ink-soft hover:bg-canvas">
          ← Prev
        </Link>
        <h2 className="font-display text-[17px] text-ink">{monthLabel}</h2>
        <Link href={nextHref} className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-ink-soft hover:bg-canvas">
          Next →
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-ink-faint">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((day, i) => {
          const today = isToday(day.date);
          return (
            <div
              key={i}
              className={cn(
                "min-h-[76px] rounded-lg border p-1.5 text-left",
                day.outside ? "border-transparent text-ink-faint" : "border-border bg-canvas/50",
                today && !day.outside && "border-brand ring-1 ring-brand",
              )}
            >
              <p
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px] font-semibold",
                  today && !day.outside ? "bg-brand text-white" : "text-ink-soft",
                )}
              >
                {day.date.getDate()}
              </p>
              <div className="mt-1 space-y-1">
                {day.posts.slice(0, 3).map((p) => {
                  const closed = p.status != null && p.status !== "open";
                  const referral = p.kind === "referral";
                  return (
                    <Link
                      key={`${p.kind ?? "event"}-${p.id}`}
                      href={`/post/${p.id}`}
                      title={`${p.title}${p.time ? ` · ${p.time}` : ""}${referral ? " · deadline" : ""}${closed ? " · closed" : ""}`}
                      className={cn(
                        "block truncate rounded px-1 py-0.5 text-[10.5px] font-semibold",
                        referral ? "bg-referral-tint text-referral" : "bg-event-tint text-event",
                        closed && "opacity-60 line-through",
                      )}
                    >
                      {referral && "⏰ "}
                      {p.time && <span className="font-bold">{p.time} </span>}
                      {p.title}
                    </Link>
                  );
                })}
                {day.posts.length > 3 && (
                  <p className="text-[10.5px] text-ink-faint">+{day.posts.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
