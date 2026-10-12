import Link from "next/link";
import { CalendarDays, ChevronRight, Flame, Lightbulb, ShieldCheck, TrendingUp } from "lucide-react";
import { MODULE_META } from "@/lib/constants";
import type { PostType } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const FALLBACK_TOPICS: TrendingItem[] = [
  { tag: "Lost wallet near library", meta: "12 replies · Lost & Found", kind: "lost_found", href: "/lost-found" },
  { tag: "DSA doubt: DP patterns", meta: "48 upvotes · Doubts", kind: "doubt", href: "/doubt" },
  { tag: "HackNight 2026", meta: "132 going · Events", kind: "event", href: "/event" },
  { tag: "SWE referral — senior", meta: "23 applied · Referrals", kind: "referral", href: "/referral" },
  { tag: "Cycle for sale", meta: "₹4,500 · Marketplace", kind: "marketplace", href: "/marketplace" },
];

export interface TrendingItem {
  id?: string;
  tag: string;
  meta: string;
  kind?: PostType;
  dateLabel?: string;
  /** ISO timestamp of the event start (preferred over dateLabel for date blocks). */
  startsAt?: string | null;
  /** ISO timestamp the post was created (for relative time). */
  createdAt?: string;
  /** Engagement rank score (shown as 🔥 when high). */
  score?: number;
  /** Fallback link when there is no post id (e.g. sample data → module page). */
  href?: string;
}

function itemHref(t: TrendingItem): string | null {
  if (t.id) return `/post/${t.id}`;
  if (t.href) return t.href;
  return null;
}

function eventParts(iso?: string | null, fallbackLabel?: string) {
  const parse = (d: Date) =>
    Number.isNaN(d.getTime())
      ? null
      : {
          mon: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
          day: String(d.getDate()).padStart(2, "0"),
          time: d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" }),
        };
  if (iso) {
    const p = parse(new Date(iso));
    if (p) return p;
  }
  // Legacy dateLabel shape: "FEB 14 · 6:00 PM".
  if (fallbackLabel) {
    const [date, time] = fallbackLabel.split(" · ");
    const [mon, day] = (date ?? "").split(" ");
    if (mon && day) return { mon, day, time: time ?? "" };
  }
  return null;
}

function LiveBadge({ live }: { live: boolean }) {
  if (live) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-market">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-market opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-market" />
        </span>
        Live
      </span>
    );
  }
  return (
    <span className="rounded-full bg-canvas px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-ink-faint uppercase">
      Sample
    </span>
  );
}

function TrendRow({ t, rank }: { t: TrendingItem; rank: number }) {
  const color = t.kind ? MODULE_META[t.kind]?.color : undefined;
  const href = itemHref(t);
  const row = (
    <>
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-canvas font-display text-[12px] text-ink"
      >
        {rank}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-ink">{t.tag}</span>
        <span className="block truncate text-[11.5px] text-ink-faint">
          {t.meta}
          {t.createdAt && ` · ${timeAgo(t.createdAt)}`}
        </span>
      </span>
      {color ? (
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </>
  );
  const cls =
    "group flex items-center gap-2.5 rounded-lg px-1.5 py-2 transition-colors hover:bg-canvas";
  return href ? (
    <Link key={t.id ?? t.tag} href={href} className={cls} aria-label={t.tag}>
      {row}
    </Link>
  ) : (
    <div key={t.tag} className={cls}>
      {row}
    </div>
  );
}

export function TrendingRail({ items, live = true }: { items?: TrendingItem[]; live?: boolean }) {
  const list = items?.length ? items : FALLBACK_TOPICS;
  const top = list.slice(0, 5);
  const hotDoubts = list.filter((t) => t.kind === "doubt").slice(0, 2);
  const upcoming = list
    .filter((t) => t.kind === "event")
    .map((t) => ({ t, parts: eventParts(t.startsAt, t.dateLabel) }))
    .sort((a, b) => {
      const at = a.t.startsAt ? new Date(a.t.startsAt).getTime() : Number.POSITIVE_INFINITY;
      const bt = b.t.startsAt ? new Date(b.t.startsAt).getTime() : Number.POSITIVE_INFINITY;
      return at - bt;
    })
    .slice(0, 3);

  return (
    <aside className="liquid-glass-panel fixed inset-y-0 right-0 z-40 hidden w-[300px] shrink-0 overflow-y-auto border-l border-border p-4 xl:block">
      <div className="flex flex-col gap-4">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-display text-[15px] text-ink">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lost-tint">
                <Flame className="h-3.5 w-3.5 text-lost" />
              </span>
              Trending on campus
            </h2>
            <LiveBadge live={live} />
          </div>
          {top.length === 0 ? (
            <p className="px-1 py-3 text-[13px] text-ink-faint">
              No trends yet — be the first to post.
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {top.map((t, i) => (
                <TrendRow key={t.id ?? t.tag} t={t} rank={i + 1} />
              ))}
            </div>
          )}
        </section>

        {hotDoubts.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-display text-[14px] text-ink">
                <Lightbulb className="h-4 w-4 text-doubt" /> Hot Doubts
              </h3>
              <Link href="/doubt" className="text-[11px] font-semibold text-brand hover:underline">
                View All
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {hotDoubts.map((t) => {
                const href = itemHref(t) ?? "/doubt";
                return (
                  <Link
                    key={t.id ?? t.tag}
                    href={href}
                    className="flex flex-col gap-1 rounded-lg border border-border bg-canvas p-2 transition-colors hover:border-doubt/40"
                  >
                    <span className="text-[11px] font-bold text-doubt">DOUBT · {t.meta}</span>
                    <span className="line-clamp-2 text-[13px] font-medium text-ink">{t.tag}</span>
                    {t.createdAt && (
                      <span className="text-[11px] text-ink-faint">{timeAgo(t.createdAt)}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {upcoming.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-display text-[14px] text-ink">
                <CalendarDays className="h-4 w-4 text-event" /> This Week
              </h3>
              <Link href="/event" className="text-[11px] font-semibold text-brand hover:underline">
                View All
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {upcoming.map(({ t, parts }) => {
                const href = itemHref(t) ?? "/event";
                return (
                  <Link key={t.id ?? t.tag} href={href} className="group flex items-start gap-3">
                    {parts && (
                      <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-event-tint font-bold leading-none text-event">
                        <span className="text-[9px] uppercase">{parts.mon}</span>
                        <span className="text-[13px]">{parts.day}</span>
                        {parts.time && <span className="sr-only">{parts.time}</span>}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-ink group-hover:underline">
                        {t.tag}
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-faint">
                        {t.startsAt
                          ? new Date(t.startsAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : (t.dateLabel ?? t.meta)}
                        {typeof t.score === "number" && t.score > 0
                          ? ` · ${t.score.toFixed(1)} heat`
                          : ""}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="flex flex-col gap-1 px-1">
          <p className="flex items-center gap-1 text-[11px] font-semibold text-ink-faint">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Verified student commons
          </p>
          <p className="text-[11px] leading-normal text-ink-faint">
            Only verified addresses can post. Peer-to-peer exchange rules apply.
          </p>
          <p className="mt-2 -rotate-2 font-hand text-[19px] leading-tight text-ink-soft">
            Better Questions,
            <br />
            Bigger Opportunities
          </p>
          <svg viewBox="0 0 248 64" aria-hidden className="mt-1 w-full text-ink-faint" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M8 54 h232" opacity="0.5" />
            <path d="M28 54 v-20 l14 -10 14 10 v20" />
            <rect x="46" y="40" width="6" height="6" />
            <path d="M70 54 v-12 h20 v12" />
            <path d="M70 42 l10 -8 10 8" />
            <circle cx="120" cy="46" r="8" />
            <path d="M120 54 v-0" />
            <path d="M112 54 c0 -10 16 -10 16 0" />
            <path d="M150 54 v-24" />
            <path d="M150 30 c-8 0 -12 6 -12 12 h24 c0 -6 -4 -12 -12 -12" />
            <path d="M186 54 v-16 l10 -7 10 7 v16" />
            <path d="M196 54 v-10" />
            <path d="M222 54 c0 -8 12 -8 12 0 v0" opacity="0.7" />
          </svg>
        </div>
      </div>
    </aside>
  );
}

/** Compact horizontal trending strip for tablet/mobile (rail is desktop-only). */
export function TrendingStrip({ items, live = true }: { items?: TrendingItem[]; live?: boolean }) {
  const list = items?.length ? items : FALLBACK_TOPICS;
  const top = list.slice(0, 5);
  if (!top.length) return null;
  return (
    <section aria-label="Trending on campus" className="xl:hidden">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display text-[15px] text-ink">
          <TrendingUp className="h-4 w-4 text-brand" /> Trending on campus
        </h2>
        <LiveBadge live={live} />
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {top.map((t, i) => {
          const href = itemHref(t);
          const color = t.kind ? MODULE_META[t.kind]?.color : undefined;
          const card = (
            <>
              <span
                className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl"
                aria-hidden
                style={{ background: color ?? "var(--color-border)" }}
              />
              <span className="flex items-center gap-1.5">
                <span className="font-display text-[13px] text-ink-faint">{i + 1}</span>
                {(t.score ?? 0) >= 4 && <Flame className="h-3.5 w-3.5 text-event" aria-label="Hot" />}
                <span className="line-clamp-1 text-[13px] font-semibold text-ink">{t.tag}</span>
              </span>
              <span className="block truncate text-[11.5px] text-ink-faint">
                {t.meta}
                {t.createdAt && ` · ${timeAgo(t.createdAt)}`}
              </span>
            </>
          );
          const cls =
            "relative flex w-56 shrink-0 snap-start flex-col gap-0.5 rounded-xl border border-border bg-card p-3 pl-4 shadow-card transition-transform hover:-translate-y-0.5";
          return href ? (
            <Link key={t.id ?? t.tag} href={href} className={cls}>
              {card}
            </Link>
          ) : (
            <div key={t.tag} className={cls}>
              {card}
            </div>
          );
        })}
      </div>
    </section>
  );
}
