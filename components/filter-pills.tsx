"use client";

import { MODULES, MODULE_META, type ModuleKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

const activeClass: Record<ModuleKey, string> = {
  all: "bg-ink text-card",
  lost_found: "bg-lost text-white",
  marketplace: "bg-market text-white",
  doubt: "bg-doubt text-white",
  referral: "bg-referral text-white",
  event: "bg-event text-white",
};

function Dot({ tab }: { tab: ModuleKey }) {
  if (tab === "all") return null;
  return (
    <span
      aria-hidden
      className="h-2 w-2 rounded-full"
      style={{ background: MODULE_META[tab]?.color }}
    />
  );
}

export function FilterPills({
  value,
  onChange,
  counts,
}: {
  value: ModuleKey;
  onChange: (tab: ModuleKey) => void;
  counts?: Partial<Record<ModuleKey, number>>;
}) {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 min-[860px]:flex-wrap min-[860px]:overflow-visible min-[860px]:pb-0" role="tablist" aria-label="Feed filter">
      {MODULES.map((m) => {
        const active = value === m.key;
        const n = counts?.[m.key];
        return (
          <button
            key={m.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold tracking-wide whitespace-nowrap transition-colors",
              active
                ? activeClass[m.key]
                : "border border-border bg-card text-ink-soft hover:bg-canvas",
            )}
          >
            {!active && <Dot tab={m.key} />}
            {active && m.key === "all" && (
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-card" />
            )}
            {m.label}
            {m.key === "all" && n != null && (
              <span className={cn("font-medium", active ? "text-white/80" : "text-ink-faint")}>
                {n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
