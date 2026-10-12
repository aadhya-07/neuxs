"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  Bell,
  Settings,
  LifeBuoy,
  Mail,
  House,
  SquarePen,
  Search,
  Tag,
  MessagesSquare,
  Users,
  CalendarDays,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { MODULES, type ModuleKey } from "@/lib/constants";
import { BrandLogo } from "@/components/brand-logo";
import { ModerationLink } from "@/components/moderation-link";
import { SidebarProfile } from "@/components/sidebar-profile";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { NEW_COUNT_EVENT, SCOPE_EVENT } from "@/lib/visit";
import { cn } from "@/lib/utils";

const MODULE_ICONS: Record<Exclude<ModuleKey, "all">, typeof House> = {
  lost_found: Search,
  marketplace: Tag,
  doubt: MessagesSquare,
  referral: Users,
  event: CalendarDays,
};

const MODULE_ACTIVE: Record<ModuleKey, string> = {
  all: "bg-referral-tint text-brand",
  lost_found: "bg-lost-tint text-lost",
  marketplace: "bg-market-tint text-market",
  doubt: "bg-doubt-tint text-doubt",
  referral: "bg-referral-tint text-referral",
  event: "bg-event-tint text-event",
};

const SIDEBAR_LABELS: Record<ModuleKey, string> = {
  all: "All Notices",
  lost_found: "Lost & Found",
  marketplace: "Marketplace",
  doubt: "Doubt Board",
  referral: "Referrals",
  event: "Campus Events",
};

function moduleHref(key: ModuleKey) {
  if (key === "all") return "/";
  return `/${key.replace("_", "-")}`;
}

function isModuleActive(pathname: string | null, key: ModuleKey) {
  if (!pathname) return false;
  if (key === "all") return pathname === "/";
  const href = moduleHref(key);
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Home + All Notices share "/" — the feed's scope toggle decides which is
// active (scope published by the feed via lib/visit.ts).
function SidebarHomeLink({ pathname }: { pathname: string | null }) {
  const [scope, setScope] = useState("open");
  useEffect(() => {
    const onScope = (e: Event) => setScope((e as CustomEvent<string>).detail ?? "open");
    window.addEventListener(SCOPE_EVENT, onScope);
    return () => window.removeEventListener(SCOPE_EVENT, onScope);
  }, []);
  const onHome = pathname === "/";
  const homeActive = onHome && scope !== "all";
  const allActive = onHome && scope === "all";
  const item = (active: boolean) =>
    cn(
      "flex items-center gap-2.5 rounded-full px-3 py-2 text-[14px] font-semibold transition-colors duration-150",
      active ? "bg-canvas text-ink" : "text-ink-soft hover:bg-canvas hover:text-ink",
    );
  return (
    <>
      <Link href="/" aria-current={homeActive ? "page" : undefined} className={item(homeActive)}>
        <House className="h-4 w-4" /> Home
        {homeActive && <NewBadge />}
      </Link>
      <Link
        href="/?scope=all"
        aria-current={allActive ? "page" : undefined}
        className={item(allActive)}
      >
        <Bell className="h-4 w-4" /> All Notices
        {allActive && <NewBadge />}
      </Link>
    </>
  );
}
// "New since last visit" badge — real client-side count published by the
// feed (lib/visit.ts). Hidden when zero or unknown.
function NewBadge() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const onCount = (e: Event) => setN((e as CustomEvent<number>).detail ?? 0);
    window.addEventListener(NEW_COUNT_EVENT, onCount);
    return () => window.removeEventListener(NEW_COUNT_EVENT, onCount);
  }, []);
  if (n <= 0) return null;
  return (
    <span
      aria-label={`${n} new`}
      className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-event px-1.5 text-[10.5px] font-bold text-white"
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const calendarActive = pathname === "/event/calendar";
  const chatsActive = pathname?.startsWith("/chats");
  // Re-apply the local wallpaper on client navigation (initial paint is
  // handled by the pre-paint script in layout.tsx).
  useEffect(() => {
    try {
      const w = localStorage.getItem("nexus-wallpaper");
      const body = document.body;
      if (w && w.startsWith("data:image/jpeg")) {
        const v = "color-mix(in srgb, var(--color-canvas) 66%, transparent)";
        body.style.backgroundImage = `linear-gradient(${v}, ${v}), url("${w}")`;
        body.style.backgroundSize = "cover, cover";
        body.style.backgroundAttachment = "fixed, fixed";
        body.style.backgroundPosition = "center, center";
        document.documentElement.dataset.wallpaper = "on";
      } else {
        body.style.backgroundImage = "";
        delete document.documentElement.dataset.wallpaper;
      }
    } catch {
      // private mode etc. — flat theme stays
    }
  }, [pathname]);
  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar — fixed to the viewport left edge, liquid glass */}
      <aside className="liquid-glass-panel fixed inset-y-0 left-0 z-40 hidden h-screen w-[240px] shrink-0 flex-col justify-between border-r border-border p-4 min-[860px]:flex">
        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandLogo size={40} />
            <span className="flex min-w-0 flex-col">
              <span className="font-round text-[20px] leading-none font-extrabold tracking-tight text-ink">
                Nexus
              </span>
              <span className="mt-1 truncate text-[12px] font-semibold text-ink-soft">
                Verified Commons
              </span>
            </span>
          </Link>
          <nav aria-label="Modules" className="flex flex-col gap-1">
            <SidebarHomeLink pathname={pathname} />
            <Link
              href="/new"
              className="flex items-center gap-2.5 rounded-full bg-brand px-3 py-2 text-[14px] font-semibold text-white transition-opacity duration-150 hover:opacity-90"
            >
              <SquarePen className="h-4 w-4" /> New Post
            </Link>
            {MODULES.filter((m) => m.key !== "all").map((m) => {
              const Icon = MODULE_ICONS[m.key];
              const active = isModuleActive(pathname, m.key);
              return (
                <Link
                  key={m.key}
                  href={moduleHref(m.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-full px-3 py-2 text-[14px] font-semibold transition-colors duration-150",
                    active ? MODULE_ACTIVE[m.key] : "text-ink-soft hover:bg-canvas hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4" /> {SIDEBAR_LABELS[m.key]}
                </Link>
              );
            })}
            <Link
              href="/event/calendar"
              aria-current={calendarActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-full px-3 py-2 text-[14px] font-semibold transition-colors duration-150",
                calendarActive
                  ? "bg-referral-tint text-brand"
                  : "text-ink-soft hover:bg-canvas hover:text-ink",
              )}
            >
              <CalendarDays className="h-4 w-4" /> Calendar
            </Link>
            <Link
              href="/chats"
              aria-current={chatsActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-full px-3 py-2 text-[14px] font-semibold transition-colors duration-150",
                chatsActive
                  ? "bg-referral-tint text-brand"
                  : "text-ink-soft hover:bg-canvas hover:text-ink",
              )}
            >
              <MessagesSquare className="h-4 w-4" /> Chats
            </Link>
            <ModerationLink />
          </nav>
          <div>
            <p className="px-3 text-[10.5px] font-bold tracking-wider text-ink-faint uppercase">
              My stuff
            </p>
            <nav aria-label="My stuff" className="mt-1 flex flex-col gap-1">
              {[
                { href: "/my/questions", label: "My Questions", icon: GraduationCap },
                { href: "/my/requests", label: "My Requests", icon: Briefcase },
                { href: "/my/rsvps", label: "My RSVPs", icon: CalendarDays },
              ].map((l) => {
                const active = pathname === l.href;
                const Icon = l.icon;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-full px-3 py-2 text-[13.5px] font-semibold transition-colors",
                      active
                        ? "bg-canvas text-ink"
                        : "text-ink-soft hover:bg-canvas hover:text-ink",
                    )}
                  >
                    <Icon className="h-4 w-4" /> {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2 rounded-full border border-border bg-card py-1 pr-1 pl-3">
            <Link
              href="/profile"
              className="flex flex-1 items-center gap-2.5 text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              <Settings className="h-4 w-4" /> Settings
            </Link>
            <ThemeToggle />
          </div>
          <Link
            href="/event/calendar"
            className="flex items-center gap-2.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
          >
            <LifeBuoy className="h-4 w-4" /> Campus Help
          </Link>
          <SidebarProfile />
        </div>
      </aside>

      {/* Main — full-bleed between the fixed side panels, no centering gutters */}
      <div className="flex w-full min-w-0 flex-1 flex-col min-[860px]:pl-[240px] xl:pr-[300px]">
        {/* Top bar — mobile */}
        <header className="liquid-glass sticky top-0 z-30 border-b border-border min-[860px]:hidden">
          <div className="flex h-14 items-center gap-2 px-4">
            <Link href="/" className="flex items-center gap-2">
              <BrandLogo size={32} />
              <span className="flex items-center gap-1 font-round text-[18px] font-extrabold text-ink">
                Nexus
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/chats"
                aria-label="Notifications"
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-ink-soft"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-event" />
              </Link>
              <Link
                href="/chats"
                aria-label="Campus mail"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-ink-soft"
              >
                <Mail className="h-4 w-4" />
              </Link>
              <ThemeToggle />
              <SidebarProfile compact />
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 pt-5 pb-24 min-[860px]:px-6 min-[860px]:pb-10">{children}</main>
        {/* FAB — mobile, sits above bottom nav */}
        <Link
          href="/new"
          aria-label="New post"
          className="fixed right-4 bottom-20 z-40 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-[14px] font-semibold text-white shadow-fab transition-transform active:scale-95 min-[860px]:hidden"
        >
          <Plus className="h-5 w-5" /> New Post
        </Link>
        <BottomNav />
      </div>
    </div>
  );
}
