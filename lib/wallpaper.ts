// Wallpaper — local-first. The choice lives on-device (localStorage data
// URL); the DB copy exists ONLY after the user presses Sync.
// Every stored/uploaded copy obeys one rule: JPG, ≤1.5 MB.

export const WALLPAPER_KEY = "nexus-wallpaper";
export const WALLPAPER_META_KEY = "nexus-wallpaper-meta";
export const MAX_WALLPAPER_BYTES = 1536 * 1024; // 1.5 MB
export const MAX_WALLPAPER_RAW_BYTES = 15 * 1024 * 1024;

export interface WallpaperMeta {
  syncedAt: string | null;
  syncedUrl: string | null;
}

// Compress any image file to a ≤1.5 MB JPEG. Throws human-readable errors
// (mirrors lib/avatar.ts behavior).
export async function compressWallpaper(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file isn't an image — pick a JPG, PNG, WebP or GIF.");
  }
  if (file.size > MAX_WALLPAPER_RAW_BYTES) {
    throw new Error("That photo is too big — pick one under 15 MB.");
  }
  const { default: imageCompression } = await import("browser-image-compression");
  const steps = [
    { maxDim: 1920, quality: 0.85 },
    { maxDim: 1600, quality: 0.8 },
    { maxDim: 1280, quality: 0.75 },
  ];
  try {
    for (const s of steps) {
      const out = await imageCompression(file, {
        maxSizeMB: MAX_WALLPAPER_BYTES / (1024 * 1024) - 0.01,
        maxWidthOrHeight: s.maxDim,
        initialQuality: s.quality,
        fileType: "image/jpeg",
        useWebWorker: true,
      });
      const jpg = new File([out], "wallpaper.jpg", { type: "image/jpeg" });
      if (jpg.size <= MAX_WALLPAPER_BYTES) return jpg;
      file = jpg;
    }
    throw new Error("Could not squeeze that photo under 1.5 MB — try a simpler image.");
  } catch (err) {
    if (err instanceof Error && /squeeze|isn't an image|too big/i.test(err.message)) throw err;
    throw new Error(
      "Couldn't read that image in this browser (HEIC photos aren't supported) — convert to JPG/PNG first.",
    );
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read that file."));
    r.readAsDataURL(file);
  });
}

export function readLocalWallpaper(): string | null {
  try {
    const v = localStorage.getItem(WALLPAPER_KEY);
    return v && v.startsWith("data:image/jpeg") ? v : null;
  } catch {
    return null;
  }
}

export function saveLocalWallpaper(dataUrl: string): void {
  localStorage.setItem(WALLPAPER_KEY, dataUrl);
}

export function clearLocalWallpaper(): void {
  try {
    localStorage.removeItem(WALLPAPER_KEY);
    localStorage.removeItem(WALLPAPER_META_KEY);
  } catch {
    // ignore
  }
}

export function readWallpaperMeta(): WallpaperMeta {
  try {
    const raw = localStorage.getItem(WALLPAPER_META_KEY);
    if (!raw) return { syncedAt: null, syncedUrl: null };
    const v = JSON.parse(raw) as Partial<WallpaperMeta>;
    return {
      syncedAt: typeof v.syncedAt === "string" ? v.syncedAt : null,
      syncedUrl: typeof v.syncedUrl === "string" ? v.syncedUrl : null,
    };
  } catch {
    return { syncedAt: null, syncedUrl: null };
  }
}

export function saveWallpaperMeta(m: WallpaperMeta): void {
  try {
    localStorage.setItem(WALLPAPER_META_KEY, JSON.stringify(m));
  } catch {
    // ignore
  }
}

/** Veil keeps text readable over any photo; canvas-based so it tracks
    the active theme (light/dark/custom) automatically. */
function veil(): string {
  const v = "color-mix(in srgb, var(--color-canvas) 66%, transparent)";
  return `linear-gradient(${v}, ${v})`;
}

/** Apply wallpaper as the page background. Null/empty removes it. */
export function applyWallpaper(dataUrl: string | null): void {
  const root = document.documentElement;
  const body = document.body;
  if (!dataUrl) {
    body.style.backgroundImage = "";
    body.style.backgroundSize = "";
    body.style.backgroundAttachment = "";
    body.style.backgroundPosition = "";
    delete root.dataset.wallpaper;
    return;
  }
  body.style.backgroundImage = `${veil()}, url("${dataUrl}")`;
  body.style.backgroundSize = "cover, cover";
  body.style.backgroundAttachment = "fixed, fixed";
  body.style.backgroundPosition = "center, center";
  root.dataset.wallpaper = "on";
}
