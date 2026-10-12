"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Mail } from "lucide-react";
import { FilterPills } from "@/components/filter-pills";
import { PostCard } from "@/components/post-card";
import { PostActions } from "@/components/post-actions";
import { SearchBar } from "@/components/search-bar";
import { ProfileChip } from "@/components/sidebar-profile";
import { TrendingRail, TrendingStrip } from "@/components/trending-rail";
import { WelcomeHero } from "@/components/welcome-hero";
import { publishNewCount, publishScope, readLastVisit, stampVisit } from "@/lib/visit";
import { MODULE_META, type ModuleKey } from "@/lib/constants";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Scope = "open" | "all";
export type Sort = "recent" | "top";

const EMPTY_COPY: Record<ModuleKey, { title: string; body: string; cta: string }> = {
  all: {
    title: "Nothing here yet",
    body: "Be the first to post — lost item, listing, doubt, referral, or event.",
    cta: "Create a post",
  },
  lost_found: {
    title: "No lost or found posts",
    body: "Lost your wallet or found someone's ID? Post it here with location + photo.",
    cta: "Report lost / found",
  },
  marketplace: {
    title: "No listings match",
    body: "Try widening the price or category — or list your own item for sale.",
    cta: "Sell an item",
  },
  doubt: {
    title: "No doubts yet",
    body: "Ask anonymously — seniors and TAs answer, best answers get upvoted.",
    cta: "Ask a doubt",
  },
  referral: {
    title: "No referrals open",
    body: "Have an internship lead? Offer a referral with deadline + slots.",
    cta: "Offer a referral",
  },
  event: {
    title: "No events coming up",
    body: "Clubs — host something. Students — check the calendar view.",
    cta: "Host an event",
  },
};

export function Feed({
  initialTab = "all",
  title = "Campus feed",
  subtitle = "One searchable feed for lost items, listings, doubts, referrals, events.",
  posts,
  live,
  initialQuery = "",
  initialCategory = "",
  initialMaxPrice = "",
  initialScope = "open",
  basePath = "/",
  pinned = false,
  displayName = null,
}: {
  initialTab?: ModuleKey;
  title?: string;
  subtitle?: string;
  posts: Post[];
  live: boolean;
  initialQuery?: string;
  initialCategory?: string;
  initialMaxPrice?: string;
  initialScope?: Scope;
  basePath?: string;
  pinned?: boolean;
  displayName?: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<ModuleKey>(initialTab);
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [scope, setScope] = useState<Scope>(initialScope);
  const [sort, setSort] = useState<Sort>("recent");
  const [shown, setShown] = useState(12);

  // Push filter edits to the URL (debounced) → server refetches with FTS.
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (category.trim()) params.set("cat", category.trim());
      if (maxPrice.trim()) params.set("max", maxPrice.trim());
      if (scope === "all") params.set("scope", "all");
      const qs = params.toString();
      const cur = window.location.search.replace(/^\?/, "");
      if (qs !== cur) router.replace(`${basePath}${qs ? `?${qs}` : ""}`);
    }, 450);
    return () => clearTimeout(t);
  }, [q, category, maxPrice, scope, basePath, router]);

  // Live trending rail: engagement with recency decay (mirrors feed_ranked
  // idea in TAD §6), closed-post demotion, and max 2 per type for diversity.
  const trending = useMemo(() => {
    // Recency is measured against the newest post in the page (pure given
    // `posts`, so no wall-clock read during render).
    const times = posts
      .map((p) => new Date(p.createdAt).getTime())
      .filter((t) => Number.isFinite(t));
    const newest = times.length ? Math.max(...times) : 0;
    const engagement = (p: Post) => (p.upvotes ?? 0) * 3 + (p.applicants ?? 0) * 2 + (p.rsvps ?? 0) * 2;
    const metaFor = (p: Post) => {
      if (p.type === "doubt") return `${p.upvotes ?? 0} upvotes · ${p.replies ?? 0} replies`;
      if (p.type === "referral") return `${p.applicants ?? 0} applied · Referrals`;
      if (p.type === "event") return `${p.rsvps ?? 0} going · Events`;
      if (p.type === "marketplace") {
        if (p.price != null) return `₹${p.price.toLocaleString("en-IN")} · Marketplace`;
        return `${p.category ?? "Marketplace"}`;
      }
      return p.location ?? p.category ?? "Lost & Found";
    };
    const scored = posts.map((p) => {
      const t = new Date(p.createdAt).getTime();
      const ageHrs = Number.isFinite(t) ? Math.max(0, (newest - t) / 3600e3) : 72;
      const freshness = Math.max(0, 72 - ageHrs) / 12; // 0..6, decays over 72h
      const base = Math.log1p(Math.max(0, engagement(p)));
      const typeBoost = p.type === "event" ? 1.2 : p.type === "lost_found" ? 0.8 : 0;
      const closedPenalty = p.status !== "open" ? 5 : 0;
      return { p, score: base + freshness + typeBoost - closedPenalty };
    });
    scored.sort((a, b) => b.score - a.score);
    // Diversity pass: max 2 per type so one viral type can't hog the rail.
    const top: typeof scored = [];
    const perType = new Map<string, number>();
    for (const s of scored) {
      if (top.length >= 5) break;
      const c = perType.get(s.p.type) ?? 0;
      if (c >= 2) continue;
      perType.set(s.p.type, c + 1);
      top.push(s);
    }
    // Fill any remaining slots regardless of type.
    if (top.length < 5) {
      for (const s of scored) {
        if (top.length >= 5) break;
        if (!top.includes(s)) top.push(s);
      }
    }
    return top.map(({ p, score }) => {
      let dateLabel: string | undefined;
      if (p.type === "event" && p.startsAt) {
        const d = new Date(p.startsAt);
        if (!Number.isNaN(d.getTime())) {
          dateLabel = `${d.toLocaleString("en-US", { month: "short" }).toUpperCase()} ${d.getDate()} · ${d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" })}`;
        }
      }
      return {
        id: p.id,
        tag: p.title,
        meta: metaFor(p),
        kind: p.type,
        dateLabel,
        startsAt: p.startsAt ?? null,
        createdAt: p.createdAt,
        score: Math.round(score * 10) / 10,
      };
    });
  }, [posts]);
  const visible = useMemo(() => {
    const cat = category.trim().toLowerCase();
    const max = Number(maxPrice);
    const query = q.trim().toLowerCase();
    const filtered = posts.filter((p) => {
      if (tab !== "all" && p.type !== tab) return false;
      if (query && !`${p.title} ${p.body}`.toLowerCase().includes(query)) return false;
      if (tab === "marketplace") {
        if (cat && !(p.category ?? "").toLowerCase().includes(cat)) return false;
        if (maxPrice.trim() && Number.isFinite(max) && p.price != null && p.price > max)
          return false;
      }
      return true;
    });
    const heat = (p: Post) => (p.upvotes ?? 0) * 3 + (p.applicants ?? 0) * 2 + (p.rsvps ?? 0) * 2;
    if (sort === "top") return [...filtered].sort((a, b) => heat(b) - heat(a));
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [posts, tab, category, maxPrice, sort, q]);
  const paged = visible.slice(0, shown);
  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (alive) setShown(12);
    });
    return () => {
      alive = false;
    };
  }, [tab, q, category, maxPrice, scope, sort]);

  // "New since last visit" for the sidebar badge — first run just stamps.
  // Scope is published too so Home / All Notices highlight correctly.
  useEffect(() => {
    const last = readLastVisit();
    if (!last) {
      publishNewCount(0);
    } else {
      publishNewCount(posts.filter((p) => new Date(p.createdAt).getTime() > last).length);
    }
    stampVisit();
  }, [posts]);
  useEffect(() => {
    publishScope(scope);
  }, [scope]);

  const empty = EMPTY_COPY[tab];
  const activeColor = tab === "all" ? undefined : MODULE_META[tab]?.color;
  const counts = useMemo(() => {
    const c: Record<ModuleKey, number> = {
      all: posts.length,
      lost_found: 0,
      marketplace: 0,
      doubt: 0,
      referral: 0,
      event: 0,
    };
    for (const p of posts) c[p.type] += 1;
    return c;
  }, [posts]);

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        {pinned && tab === "all" ? (
          <>
            <WelcomeHero name={displayName} />
            <div className="mt-4 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <SearchBar value={q} onChange={setQ} />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  aria-label="Notifications"
                  className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-ink-soft transition-colors hover:bg-canvas"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-event" />
                </button>
                <Link
                  href="/chats"
                  aria-label="Campus mail"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-ink-soft transition-colors hover:bg-canvas"
                >
                  <Mail className="h-4 w-4" />
                </Link>
                <ProfileChip />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-[26px] text-ink md:text-[32px]">{title}</h1>
                  {!live && (
                    <span className="rounded-full bg-canvas px-2 py-0.5 text-[10.5px] font-bold uppercase text-ink-soft">
                      sample data
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[13.5px] text-ink-soft">
                  {subtitle}
                  {!live && " Connect Supabase + run migrations for live posts."}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  aria-label="Notifications"
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-ink-soft transition-colors hover:bg-canvas"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand" />
                </button>
                <Link
                  href="/chats"
                  aria-label="Campus mail"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-ink-soft transition-colors hover:bg-canvas"
                >
                  <Mail className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="mt-4">
              <SearchBar value={q} onChange={setQ} />
            </div>
          </>
        )}

        <div className="mt-4 xl:hidden">
          <TrendingStrip items={trending} live={live} />
        </div>

        <div className="liquid-glass sticky top-14 z-10 -mx-1 mt-3 rounded-2xl px-1 py-2 min-[860px]:top-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto [mask-image:linear-gradient(to_right,black_90%,transparent)] min-[860px]:overflow-visible min-[860px]:[mask-image:none]">
              <FilterPills value={tab} onChange={setTab} counts={counts} />
            </div>
            <div className="flex shrink-0 overflow-hidden rounded-full border border-border text-[11.5px] font-semibold whitespace-nowrap">
              {(["open", "all"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={cn(
                    "px-2 py-1",
                    scope === s ? "bg-ink text-card" : "bg-card text-ink-soft",
                  )}
                >
                  {s === "open" ? "Open" : "All"}
                </button>
              ))}
            </div>
            <div className="flex shrink-0 overflow-hidden rounded-full border border-border text-[11.5px] font-semibold whitespace-nowrap">
              {(["recent", "top"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={cn(
                    "px-2 py-1 capitalize",
                    sort === s ? "bg-ink text-card" : "bg-card text-ink-soft",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tab === "marketplace" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (books, cycles…)"
              className="rounded-xl border border-border bg-card px-3 py-2 text-[13.5px] text-ink outline-none placeholder:text-ink-faint focus:border-brand"
            />
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max price (₹)"
              inputMode="decimal"
              className="rounded-xl border border-border bg-card px-3 py-2 text-[13.5px] text-ink outline-none placeholder:text-ink-faint focus:border-brand"
            />
          </div>
        )}

        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-faint">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-market opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-market" />
          </span>
          {visible.length} post{visible.length === 1 ? "" : "s"}
          {live ? " · live" : " · sample"}
        </p>

        {visible.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <p
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[16px] font-bold text-white"
              style={{ background: activeColor ?? "var(--color-ink)" }}
            >
              +
            </p>
            <p className="mt-3 font-display text-[16px] text-ink">{empty.title}</p>
            <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-ink-soft">{empty.body}</p>
            <Link
              href="/new"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-[14px] font-semibold text-white"
            >
              {empty.cta}
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-4">
              {paged.map((p) => (
                <PostCard key={p.id} post={p} action={<PostActions post={p} />} />
              ))}
            </div>
            {visible.length > paged.length && (
              <button
                onClick={() => setShown((n) => n + 12)}
                className="mt-4 w-full rounded-xl border border-border bg-card py-2.5 text-[14px] font-semibold text-ink-soft hover:text-ink"
              >
                Show more ({visible.length - paged.length} remaining)
              </button>
            )}
          </>
        )}
      </div>
      <TrendingRail items={trending} live={live} />
    </div>
  );
}
