"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatBytes } from "@/lib/avatar";

const MAX_IMAGES = 4;
const MAX_RAW_BYTES = 10 * 1024 * 1024;

async function compressPostImage(file: File): Promise<File> {
  const { default: imageCompression } = await import("browser-image-compression");
  const out = await imageCompression(file, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1200,
    initialQuality: 0.8,
    fileType: "image/jpeg",
    useWebWorker: true,
  });
  const name = `${crypto.randomUUID()}.jpg`;
  return new File([out], name, { type: "image/jpeg" });
}

export function ImageUpload({
  type,
  value,
  onChange,
}: {
  type: string;
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    if (value.length + files.length > MAX_IMAGES) {
      setError(`Up to ${MAX_IMAGES} photos per post.`);
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in to upload photos.");
      const urls: string[] = [...value];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) throw new Error("Only images allowed.");
        if (f.size > MAX_RAW_BYTES)
          throw new Error(`That photo is ${formatBytes(f.size)} — pick one under 10 MB.`);
        const compressed = await compressPostImage(f);
        const path = `${type}/${user.id}/${compressed.name}`;
        const { error: upErr } = await supabase.storage
          .from("post-images")
          .upload(path, compressed, { contentType: "image/jpeg", upsert: true });
        if (upErr) throw new Error(upErr.message);
        const { data } = supabase.storage.from("post-images").getPublicUrl(path);
        urls.push(data.publicUrl);
        if (urls.length >= MAX_IMAGES) break;
      }
      onChange(urls.slice(0, MAX_IMAGES));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Upload preview" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/80 text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {value.length < MAX_IMAGES && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-canvas text-ink-soft disabled:opacity-60"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[11px] font-semibold">{busy ? "Uploading…" : "Add photo"}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void pick(e.target.files)}
      />
      <p className="mt-1 text-[11.5px] text-ink-faint">
        {value.length}/{MAX_IMAGES} photos · compressed + served at 800px.
      </p>
      {error && <p className="mt-1 text-[12.5px] text-event">{error}</p>}
    </div>
  );
}
