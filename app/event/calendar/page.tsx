import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CalendarMonth, type CalendarDay, type CalendarDayPost } from "@/components/calendar-month";
import { getCalendarItems } from "@/lib/engagement";
import { endOfMonth, endOfWeek, format, parse, startOfMonth, startOfWeek } from "date-fns";

function monthBounds(month: Date): { from: Date; to: Date; weeks: CalendarDay[][]; label: string } {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const gridStart = startOfWeek(start, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(end, { weekStartsOn: 0 });
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = new Date(d.getTime() + 86400_000)) days.push(d);
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(
      days.slice(i, i + 7).map((date) => ({
        date,
        outside: date < start || date > end,
        posts: [],
      })),
    );
  }
  return { from: gridStart, to: gridEnd, weeks, label: format(month, "MMMM yyyy") };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.m) ? sp.m[0] : sp.m;
  let month = new Date();
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const parsed = parse(raw, "yyyy-MM", new Date());
    if (!isNaN(parsed.getTime())) month = parsed;
  }
  const { from, to, weeks, label } = monthBounds(month);
  // Pad by a day on each side: grid edges are local-midnight but the query
  // ships as UTC ISO, so events near midnight IST could otherwise fall outside.
  const pad = 86400_000;
  const { items, live } = await getCalendarItems(
    new Date(from.getTime() - pad).toISOString(),
    new Date(to.getTime() + pad).toISOString(),
  );

  // Consistent local-day bucketing for grid cells and item dates.
  const keyOf = (d: Date) => format(d, "yyyy-MM-dd");
  const byDay = new Map<string, CalendarDayPost[]>();
  for (const item of items) {
    const k = keyOf(new Date(item.dateISO));
    const arr = byDay.get(k) ?? [];
    arr.push({
      id: item.id,
      title: item.title,
      time: format(new Date(item.dateISO), "HH:mm"),
      kind: item.kind,
      status: item.status,
    });
    byDay.set(k, arr);
  }
  // Within a day: chronological, events before deadlines at the same time.
  for (const arr of byDay.values()) {
    arr.sort((a: CalendarDayPost, b: CalendarDayPost) => (a.time ?? "").localeCompare(b.time ?? ""));
  }
  for (const week of weeks)
    for (const day of week) day.posts = (byDay.get(keyOf(day.date)) ?? []).slice(0, 10);

  const ym = (d: Date) => format(d, "yyyy-MM");
  const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[26px] text-ink">
              Events calendar{" "}
              {!live && (
                <span className="ml-1 rounded-full bg-canvas px-2 py-0.5 align-middle text-[10.5px] font-bold uppercase text-ink-soft">
                  sample data
                </span>
              )}
            </h1>
            <p className="mt-1 text-[13.5px] text-ink-soft">
              Every listed event + referral deadline, browsable by date — not just recency.
              {!live && " Connect Supabase + run migrations for live posts."}
            </p>
          </div>
          <Link
            href="/event"
            className="shrink-0 rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink"
          >
            ← Events feed
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-ink-soft">
          <span className="rounded bg-event-tint px-2 py-0.5 text-event">Event</span>
          <span className="rounded bg-referral-tint px-2 py-0.5 text-referral">⏰ Deadline</span>
          <span className="text-ink-faint">· closed items are dimmed</span>
        </div>
        <div className="mt-4">
          <CalendarMonth
            weeks={weeks}
            monthLabel={label}
            prevHref={`/event/calendar?m=${ym(prev)}`}
            nextHref={`/event/calendar?m=${ym(next)}`}
          />
        </div>

        <h2 className="mt-6 font-display text-[17px] text-ink">
          Upcoming in {label} ({items.length}){live ? " · live" : " · sample"}
        </h2>
        {items.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-6 text-center text-[13.5px] text-ink-soft">
            Nothing listed this month yet.{" "}
            <Link href="/new" className="font-semibold text-brand">
              Post an event
            </Link>{" "}
            and it will appear here automatically.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li
                key={`${item.kind}-${item.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
              >
                <div className="w-14 shrink-0 text-center">
                  <p className="text-[16px] font-bold leading-none text-ink">
                    {format(new Date(item.dateISO), "d")}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase text-ink-faint">
                    {format(new Date(item.dateISO), "MMM")}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/post/${item.id}`}
                    className="block truncate text-[14px] font-semibold text-ink hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-0.5 text-[12px] text-ink-soft">
                    {format(new Date(item.dateISO), "EEE, HH:mm")}
                    {item.location ? ` · ${item.location}` : ""}
                    {item.status !== "open" ? " · closed" : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-bold uppercase ${
                    item.kind === "referral"
                      ? "bg-referral-tint text-referral"
                      : "bg-event-tint text-event"
                  }`}
                >
                  {item.kind === "referral" ? "deadline" : "event"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
