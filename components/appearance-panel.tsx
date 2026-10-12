"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Check, ImagePlus, Loader2, Moon, Palette, Sun, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  CUSTOM_PRESETS,
  applyCustomTheme,
  clearAppliedCustomTheme,
  clearCustomTheme,
  readCustomTheme,
  saveCustomTheme,
  type CustomTheme,
  type ThemeMode,
} from "@/lib/theme";
import {
  applyWallpaper,
  clearLocalWallpaper,
  compressWallpaper,
  fileToDataUrl,
  readLocalWallpaper,
  readWallpaperMeta,
  saveLocalWallpaper,
  saveWallpaperMeta,
} from "@/lib/wallpaper";
import { syncWallpaperUrl } from "@/lib/actions";
import { cn } from "@/lib/utils";

const MODES: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "custom", label: "Custom", icon: Palette },
];

const COLOR_FIELDS: { key: keyof CustomTheme; label: string }[] = [
  { key: "canvas", label: "Background" },
  { key: "card", label: "Cards" },
  { key: "ink", label: "Text" },
  { key: "inkSoft", label: "Soft text" },
  { key: "inkFaint", label: "Faint text" },
  { key: "border", label: "Borders" },
  { key: "brand", label: "Brand" },
];

type SyncState = "none" | "unsynced" | "synced" | "dirty" | "syncing";

export function AppearancePanel({ syncedWallpaperUrl }: { syncedWallpaperUrl: string | null }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [custom, setCustom] = useState<CustomTheme>(CUSTOM_PRESETS[0].theme);
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("none");
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [removeSynced, setRemoveSynced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Storage reads are external-system sync — resolve in a continuation
    // so the effect body itself stays pure.
    let alive = true;
    (async () => {
      const c = readCustomTheme();
      const local = readLocalWallpaper();
      const meta = readWallpaperMeta();
      if (!alive) return;
      setCustom(c);
      setWallpaper(local);
      applyWallpaper(local);
      setSyncedAt(meta.syncedAt);
      if (!local) setSyncState("none");
      else if (meta.syncedUrl) setSyncState("synced");
      else setSyncState("unsynced");
      setMounted(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Keep inline custom vars in sync with the active mode.
  useEffect(() => {
    if (!mounted) return;
    if (theme === "custom") applyCustomTheme(readCustomTheme());
    else clearAppliedCustomTheme();
  }, [theme, mounted]);

  if (!mounted) return null;
  const mode = (theme === "custom" ? "custom" : theme === "dark" ? "dark" : "light") as ThemeMode;

  function updateCustom(patch: Partial<CustomTheme>) {
    const next = { ...custom, ...patch };
    setCustom(next);
    saveCustomTheme(next);
    if (mode === "custom") applyCustomTheme(next);
  }

  async function pickWallpaper(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setError(null);
    setBusy(true);
    try {
      const jpg = await compressWallpaper(f);
      const url = await fileToDataUrl(jpg);
      setPreview(url);
      setStatus("Preview ready — Apply to use it on this device.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use that image.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function applyPreview() {
    if (!preview) return;
    try {
      saveLocalWallpaper(preview);
    } catch {
      setError("This device is out of storage — try a simpler photo.");
      return;
    }
    setWallpaper(preview);
    applyWallpaper(preview);
    setPreview(null);
    setStatus("Wallpaper applied on this device.");
    const meta = readWallpaperMeta();
    setSyncState(meta.syncedUrl ? "dirty" : "unsynced");
  }

  async function removeWallpaper() {
    setError(null);
    setBusy(true);
    try {
      if (removeSynced) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.storage.from("wallpapers").remove([`${user.id}/wallpaper.jpg`]);
          await syncWallpaperUrl(null);
        }
        saveWallpaperMeta({ syncedAt: null, syncedUrl: null });
      } else {
        const meta = readWallpaperMeta();
        if (meta.syncedUrl) saveWallpaperMeta(meta); // keep sync record, drop local only
        try {
          localStorage.removeItem("nexus-wallpaper");
        } catch {
          // ignore
        }
      }
      if (removeSynced) clearLocalWallpaper();
      setWallpaper(null);
      applyWallpaper(null);
      setSyncState("none");
      setSyncedAt(null);
      setStatus("Wallpaper removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    if (!wallpaper || syncState === "syncing" || syncState === "synced") return;
    setError(null);
    setSyncState("syncing");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in to sync.");
      const blob = await (await fetch(wallpaper)).blob();
      const file = new File([blob], "wallpaper.jpg", { type: "image/jpeg" });
      const { error: upErr } = await supabase.storage
        .from("wallpapers")
        .upload(`${user.id}/wallpaper.jpg`, file, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from("wallpapers").getPublicUrl(`${user.id}/wallpaper.jpg`);
      await syncWallpaperUrl(data.publicUrl);
      const at = new Date().toISOString();
      saveWallpaperMeta({ syncedAt: at, syncedUrl: data.publicUrl });
      setSyncedAt(at);
      setSyncState("synced");
      setStatus("Synced — your wallpaper now follows your account.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed.");
      setSyncState(wallpaper ? "unsynced" : "none");
    }
  }

  async function useSynced() {
    if (!syncedWallpaperUrl) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(syncedWallpaperUrl);
      const blob = await res.blob();
      const url = await fileToDataUrl(new File([blob], "wallpaper.jpg", { type: blob.type }));
      saveLocalWallpaper(url);
      setWallpaper(url);
      applyWallpaper(url);
      saveWallpaperMeta({ syncedAt: new Date().toISOString(), syncedUrl: syncedWallpaperUrl });
      setSyncState("synced");
      setStatus("Synced wallpaper applied on this device.");
    } catch {
      setError("Could not download the synced wallpaper.");
    } finally {
      setBusy(false);
    }
  }

  const syncLabel =
    syncState === "syncing"
      ? "Syncing…"
      : syncState === "synced"
        ? `Synced${syncedAt ? ` · ${new Date(syncedAt).toLocaleDateString()}` : ""}`
        : syncState === "dirty"
          ? "Sync changes"
          : "Sync to my account";

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="font-display text-[17px] text-ink">Appearance</h2>
      <p className="mt-0.5 text-[13px] text-ink-soft">
        Theme and wallpaper live on this device. Nothing uploads unless you press Sync.
      </p>

      {/* Mode switch */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setTheme(m.key)}
              aria-pressed={active}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[13.5px] font-semibold transition-colors",
                active
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-canvas text-ink-soft hover:text-ink",
              )}
            >
              <Icon className="h-4 w-4" /> {m.label}
            </button>
          );
        })}
      </div>

      {/* Custom colors */}
      {mode === "custom" && (
        <div className="mt-4 rounded-xl border border-border bg-canvas p-3">
          <div className="flex flex-wrap gap-2">
            {CUSTOM_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => updateCustom(p.theme)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft hover:text-ink"
              >
                <span className="flex -space-x-1">
                  {[p.theme.canvas, p.theme.brand, p.theme.ink].map((c) => (
                    <span
                      key={c}
                      className="h-4 w-4 rounded-full border border-border"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                {p.name}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {COLOR_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5">
                <input
                  type="color"
                  value={custom[f.key]}
                  onChange={(e) => updateCustom({ [f.key]: e.target.value })}
                  className="h-7 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  aria-label={f.label}
                />
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-ink">{f.label}</span>
                  <span className="block truncate font-mono text-[10.5px] text-ink-faint">
                    {custom[f.key]}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              clearCustomTheme();
              const d = { ...CUSTOM_PRESETS[0].theme };
              setCustom(d);
              applyCustomTheme(d);
            }}
            className="mt-2 text-[12.5px] font-semibold text-ink-faint hover:text-event"
          >
            Reset custom colors
          </button>
        </div>
      )}

      {/* Wallpaper */}
      <div className="mt-4 border-t border-border pt-4">
        <h3 className="text-[14px] font-bold text-ink">Wallpaper</h3>
        <p className="text-[12.5px] text-ink-soft">
          Any photo works — squeezed to a ≤1.5 MB JPG, kept on this device.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void pickWallpaper(e.target.files)}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {(wallpaper || preview) && (
            <div className="relative h-20 w-32 overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview ?? wallpaper ?? ""}
                alt="Wallpaper preview"
                className="h-full w-full object-cover"
              />
              {preview && (
                <span className="absolute bottom-1 left-1 rounded-full bg-ink/80 px-2 py-0.5 text-[10.5px] font-bold text-white">
                  Preview
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex h-20 w-32 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-canvas text-ink-soft disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-[11px] font-semibold">{busy ? "Reading…" : "Pick photo"}</span>
          </button>
        </div>

        {preview && (
          <button
            type="button"
            onClick={applyPreview}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-[13.5px] font-semibold text-white"
          >
            <Check className="h-4 w-4" /> Apply on this device
          </button>
        )}

        {!wallpaper && !preview && syncedWallpaperUrl && (
          <button
            type="button"
            disabled={busy}
            onClick={useSynced}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-border bg-canvas px-4 py-2 text-[13.5px] font-semibold text-ink disabled:opacity-60"
          >
            <Upload className="h-4 w-4" /> Use my synced wallpaper
          </button>
        )}

        {wallpaper && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={syncState === "syncing" || syncState === "synced"}
              onClick={syncNow}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13.5px] font-semibold",
                syncState === "synced"
                  ? "border border-market bg-market-tint text-market"
                  : "bg-brand text-white disabled:opacity-60",
              )}
            >
              {syncState === "syncing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : syncState === "synced" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {syncLabel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={removeWallpaper}
              className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-[13px] font-semibold text-event disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
            <label className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-soft">
              <input
                type="checkbox"
                checked={removeSynced}
                onChange={(e) => setRemoveSynced(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-event)]"
              />
              also delete synced copy
            </label>
          </div>
        )}

        {status && <p className="mt-2 text-[12.5px] text-ink-soft">{status}</p>}
        {error && <p className="mt-2 text-[13px] text-event">{error}</p>}
      </div>
    </section>
  );
}
