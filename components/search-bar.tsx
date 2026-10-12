"use client";

import { Search, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBar({
  value,
  onChange,
  placeholder = "Search across all modules…",
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 transition-shadow focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
      <Search className="h-4 w-4 shrink-0 text-ink-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label="Search posts"
        className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint"
      />
      {value ? (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-soft"
        >
          Clear
        </button>
      ) : (
        <>
          <Mic className="hidden h-4 w-4 shrink-0 text-ink-faint sm:block" />
          <kbd
            className={cn(
              "hidden shrink-0 rounded border border-border bg-canvas px-1.5 py-0.5",
              "text-[10.5px] font-bold text-ink-faint md:block",
            )}
          >
            ⌘K
          </kbd>
        </>
      )}
    </div>
  );
}
