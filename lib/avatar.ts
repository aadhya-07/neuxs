// Avatar compression — any user-supplied image becomes a ≤100 KB JPG.
// Runs entirely in the browser (canvas + Web Worker) before upload, so the
// Storage bucket only ever receives small files (migration 0009 caps at
// 100 KB server-side as well).

export const MAX_AVATAR_BYTES = 100 * 1024;
export const MAX_RAW_BYTES = 15 * 1024 * 1024;

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// Compress any image file to a ≤100 KB JPEG. Throws a human-readable error
// when the input isn't an image, exceeds the raw cap, can't be decoded
// (e.g. HEIC on most browsers), or won't squeeze under the target.
export async function compressAvatar(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file isn't an image — pick a JPG, PNG, WebP or GIF.");
  }
  if (file.size > MAX_RAW_BYTES) {
    throw new Error(
      `That photo is ${formatBytes(file.size)} — pick one under ${formatBytes(MAX_RAW_BYTES)} and try again.`,
    );
  }
  // Dynamic import: browser-only APIs (canvas/Worker) must never evaluate on the server.
  const { default: imageCompression } = await import("browser-image-compression");

  const pass = async (input: File | Blob, maxDim: number, quality: number): Promise<File> => {
    const out = await imageCompression(input as File, {
      maxSizeMB: MAX_AVATAR_BYTES / (1024 * 1024) - 0.005,
      maxWidthOrHeight: maxDim,
      initialQuality: quality,
      fileType: "image/jpeg",
      useWebWorker: true,
    });
    return new File([out], "avatar.jpg", { type: "image/jpeg" });
  };

  try {
    let jpg = await pass(file, 512, 0.85);
    if (jpg.size <= MAX_AVATAR_BYTES) return jpg;
    // Stubborn file (busy photo / high-entropy PNG) — shrink harder once more.
    jpg = await pass(jpg, 256, 0.7);
    if (jpg.size <= MAX_AVATAR_BYTES) return jpg;
    throw new Error("Could not squeeze that photo under 100 KB — try a simpler image.");
  } catch (err) {
    if (err instanceof Error && /squeeze|isn't an image|under 15|under 100/i.test(err.message)) {
      throw err;
    }
    throw new Error(
      "Couldn't read that image in this browser (HEIC photos aren't supported) — convert to JPG/PNG first.",
    );
  }
}
