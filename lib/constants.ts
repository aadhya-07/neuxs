export const MODULES = [
  { key: "all", label: "All Feeds" },
  { key: "lost_found", label: "Lost & Found" },
  { key: "marketplace", label: "Marketplace" },
  { key: "doubt", label: "Doubt Board" },
  { key: "referral", label: "Referrals" },
  { key: "event", label: "Events" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export const MODULE_META: Record<
  Exclude<ModuleKey, "all">,
  { label: string; color: string; tint: string; accentClass: string }
> = {
  lost_found: {
    label: "Lost & Found",
    color: "var(--color-lost)",
    tint: "var(--color-lost-tint)",
    accentClass: "border-l-lost",
  },
  marketplace: {
    label: "Marketplace",
    color: "var(--color-market)",
    tint: "var(--color-market-tint)",
    accentClass: "border-l-market",
  },
  doubt: {
    label: "Doubt Board",
    color: "var(--color-doubt)",
    tint: "var(--color-doubt-tint)",
    accentClass: "border-l-doubt",
  },
  referral: {
    label: "Referrals",
    color: "var(--color-referral)",
    tint: "var(--color-referral-tint)",
    accentClass: "border-l-referral",
  },
  event: {
    label: "Campus Events",
    color: "var(--color-event)",
    tint: "var(--color-event-tint)",
    accentClass: "border-l-event",
  },
};
