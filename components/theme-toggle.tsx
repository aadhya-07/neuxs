"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

// Quick light/dark flip for the sidebar + mobile topbar.
// Custom mode is fully managed in Profile → Appearance; when custom is
// active this shows a dot and the first click lands back on light.
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (alive) setMounted(true);
    })();
    return () => {
      alive = false;
    };
  }, []);
  if (!mounted) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card",
          className,
        )}
      />
    );
  }
  const isCustom = theme === "custom";
  const dark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title="Appearance — full settings in Profile"
      className={cn(
        "relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-ink-soft transition-colors hover:bg-canvas hover:text-ink",
        className,
      )}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isCustom && (
        <span
          aria-hidden
          className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-brand"
        />
      )}
    </button>
  );
}
