// Theme setup — light / dark (via next-themes) + standalone custom.
// Custom colors persist in localStorage only (per-device cache, no DB).
// Module colors are fixed by design.md and never editable here.

export interface CustomTheme {
  canvas: string;
  card: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  border: string;
  brand: string;
}

export type ThemeMode = "light" | "dark" | "custom";

export const CUSTOM_THEME_KEY = "nexus-custom-theme";

export const DEFAULT_CUSTOM_THEME: CustomTheme = {
  canvas: "#f6f7f9",
  card: "#ffffff",
  ink: "#14171f",
  inkSoft: "#6b7180",
  inkFaint: "#9ca1ad",
  border: "#e7e9ee",
  brand: "#2f5cf3",
};

export const CUSTOM_PRESETS: { name: string; theme: CustomTheme }[] = [
  { name: "Default", theme: DEFAULT_CUSTOM_THEME },
  {
    name: "Midnight",
    theme: {
      canvas: "#0f1115",
      card: "#171a21",
      ink: "#eef0f4",
      inkSoft: "#a7adba",
      inkFaint: "#6b7180",
      border: "#262b36",
      brand: "#5b8cff",
    },
  },
  {
    name: "Sepia",
    theme: {
      canvas: "#f4efe6",
      card: "#fffdf7",
      ink: "#3d3225",
      inkSoft: "#7a6c58",
      inkFaint: "#a89a83",
      border: "#e3d9c6",
      brand: "#b3541e",
    },
  },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

// Vars applied as inline style on <html> — beat both :root and .dark.
const VAR_MAP: Record<keyof CustomTheme, string> = {
  canvas: "--color-canvas",
  card: "--color-card",
  ink: "--color-ink",
  inkSoft: "--color-ink-soft",
  inkFaint: "--color-ink-faint",
  border: "--color-border",
  brand: "--color-brand",
};

export function sanitizeCustomTheme(v: unknown): CustomTheme | null {
  if (typeof v !== "object" || v === null) return null;
  const out = { ...DEFAULT_CUSTOM_THEME };
  let ok = false;
  for (const k of Object.keys(VAR_MAP) as (keyof CustomTheme)[]) {
    const val = (v as Record<string, unknown>)[k];
    if (typeof val === "string" && HEX.test(val.trim())) {
      out[k] = val.trim().toLowerCase();
      ok = true;
    }
  }
  return ok ? out : null;
}

export function readCustomTheme(): CustomTheme {
  try {
    const raw = localStorage.getItem(CUSTOM_THEME_KEY);
    if (!raw) return DEFAULT_CUSTOM_THEME;
    return sanitizeCustomTheme(JSON.parse(raw)) ?? DEFAULT_CUSTOM_THEME;
  } catch {
    return DEFAULT_CUSTOM_THEME;
  }
}

export function saveCustomTheme(t: CustomTheme): void {
  try {
    localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(t));
  } catch {
    // Quota or private mode — theme still applies for this session.
  }
}

export function clearCustomTheme(): void {
  try {
    localStorage.removeItem(CUSTOM_THEME_KEY);
  } catch {
    // ignore
  }
}

/** Apply custom tokens as inline vars. Call only when mode === "custom". */
export function applyCustomTheme(t: CustomTheme): void {
  const el = document.documentElement;
  for (const k of Object.keys(VAR_MAP) as (keyof CustomTheme)[]) {
    el.style.setProperty(VAR_MAP[k], t[k]);
  }
}

/** Remove inline overrides (leaving "custom" mode back to light/dark). */
export function clearAppliedCustomTheme(): void {
  const el = document.documentElement;
  for (const k of Object.keys(VAR_MAP) as (keyof CustomTheme)[]) {
    el.style.removeProperty(VAR_MAP[k]);
  }
}
