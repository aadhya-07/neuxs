"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, MessagesSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/new", label: "New", icon: Plus, fab: true },
  { href: "/chats", label: "Chats", icon: MessagesSquare },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="liquid-glass fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch justify-around border-t border-border pb-[env(safe-area-inset-bottom)] min-[860px]:hidden"
    >
      {TABS.map((t) => {
        const active =
          t.href === "/" ? pathname === "/" : pathname?.startsWith(t.href);
        const Icon = t.icon;
        if (t.fab) {
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-label="New post"
              className="flex flex-1 flex-col items-center justify-center gap-0.5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-fab transition-transform active:scale-95">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-semibold text-ink-soft">
                {t.label}
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={t.href}
            href={t.href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5"
          >
            <span
              className={cn(
                "flex h-8 items-center justify-center rounded-full px-4 transition-colors",
                active ? "bg-brand/10" : "bg-transparent",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  active ? "text-brand" : "text-ink-faint",
                )}
              />
            </span>
            <span
              className={cn(
                "text-[10px] font-semibold",
                active ? "text-ink" : "text-ink-faint",
              )}
            >
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
