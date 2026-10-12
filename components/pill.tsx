import { MODULE_META } from "@/lib/constants";
import type { PostType } from "@/lib/types";
import { cn } from "@/lib/utils";

const PILL = "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase";

const tintClass: Record<PostType, string> = {
  lost_found: "bg-lost-tint text-lost",
  marketplace: "bg-market-tint text-market",
  doubt: "bg-doubt-tint text-doubt",
  referral: "bg-referral-tint text-referral",
  event: "bg-event-tint text-event",
};

export function ModuleTag({ type }: { type: PostType }) {
  return (
    <span className={cn(PILL, "tracking-wide", tintClass[type])}>
      {MODULE_META[type].label}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const open = status === "open";
  return (
    <span className={cn(PILL, open ? "bg-market-tint text-market" : "bg-canvas text-ink-soft")}>
      {status}
    </span>
  );
}
