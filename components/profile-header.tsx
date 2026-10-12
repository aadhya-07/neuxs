"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Github } from "lucide-react";
import { VerifiedCheck } from "@/components/verified-check";
import { updateProfile } from "@/lib/actions";
import { compressAvatar, formatBytes, MAX_AVATAR_BYTES } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/client";
import type { ProfileDTO } from "@/lib/profile";
import { cn } from "@/lib/utils";

export function providerLabel(p: string | null): string | null {
  if (p === "google") return "Google";
  if (p === "github") return "GitHub";
  if (p === "email") return "Email";
  return null;
}

const inputClass =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-brand";

export function ProfileHeader({
  profile,
  stats,
  editable,
}: {
  profile: ProfileDTO;
  stats: { posts: number; going: number; applied: number; answers: number };
  editable: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile.fullName ?? "");
  const [handle, setHandle] = useState(profile.handle);
  const [picked, setPicked] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [links, setLinks] = useState<{ label: string; url: string }[]>(
    profile.links.length ? profile.links.map((l) => ({ ...l })) : [],
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Local wallpaper wins; synced profile copy is the fallback.
  const [banner, setBanner] = useState<string | null>(profile.wallpaperUrl);
  useEffect(() => {
    let alive = true;
    (async () => {
      let local: string | null = null;
      try {
        const v = localStorage.getItem("nexus-wallpaper");
        if (v && v.startsWith("data:image/jpeg")) local = v;
      } catch {
        // ignore — synced copy (or none) stays
      }
      if (alive && local) setBanner(local);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Revoke object URLs when replaced / unmounted (avoids blob leaks).
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const initial = (profile.fullName ?? profile.handle).charAt(0).toUpperCase() || "S";
  const shownAvatar = removePhoto ? null : (preview ?? profile.avatarUrl);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("That file isn't an image — pick a JPG, PNG, WebP or GIF.");
      return;
    }
    setError(null);
    setRemovePhoto(false);
    setPicked(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
    setStatus(`${formatBytes(f.size)} selected — will compress to ≤100 KB JPG on Save.`);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let avatarUrl = profile.avatarUrl ?? "";
      if (removePhoto) {
        avatarUrl = "";
      } else if (picked) {
        setStatus(`Compressing ${formatBytes(picked.size)}…`);
        const jpg = await compressAvatar(picked);
        if (jpg.size > MAX_AVATAR_BYTES) {
          throw new Error("Compressed photo is still over 100 KB — try a simpler image.");
        }
        setStatus(`Uploading ${formatBytes(jpg.size)} JPG…`);
        const supabase = createClient();
        const path = `${profile.id}/avatar.jpg`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, jpg, { contentType: "image/jpeg", upsert: true });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = data.publicUrl;
        setStatus(null);
      }
      const res = await updateProfile({ fullName, handle, avatarUrl, bio, links });
      setEditing(false);
      setPicked(null);
      setRemovePhoto(false);
      // Handle may have changed → public URL changes too.
      if (res.handle !== profile.handle) router.push("/profile");
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setEditing(false);
    setPicked(null);
    setRemovePhoto(false);
    setBio(profile.bio ?? "");
    setLinks(profile.links.length ? profile.links.map((l) => ({ ...l })) : []);
    setStatus(null);
    setError(null);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      {banner && (
        <div className="relative h-28 w-full bg-canvas">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner} alt="" aria-hidden className="h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
        </div>
      )}
      <div className="p-5">
      <div className="flex items-center gap-4">
        {shownAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shownAvatar}
            alt={profile.handle}
            className="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand text-[28px] font-bold text-white">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-display text-[20px] text-ink">
              {profile.fullName ?? `@${profile.handle}`}
            </span>
            {profile.isVerified && <VerifiedCheck />}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[13px] text-ink-soft">
            <span>@{profile.handle}</span>
            {(() => {
              const via = providerLabel(profile.provider);
              if (via) {
                return (
                  <span className="inline-flex items-center gap-1">
                    ·
                    {profile.provider === "github" && <Github className="h-3 w-3" />}
                    via {via}
                  </span>
                );
              }
              // Provider unknown (row predates migration 0010 / never re-logged in).
              if (profile.collegeDomain) return <span>· {profile.collegeDomain}</span>;
              return null;
            })()}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="rounded-full bg-canvas px-2 py-0.5 font-bold text-ink">
              ⭐ {profile.karma} karma
            </span>
            {profile.isModerator && (
              <span className="rounded-full bg-brand px-2 py-0.5 font-bold text-white">mod</span>
            )}
          </div>
        </div>
        {editable && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-xl border border-border bg-canvas px-3.5 py-2 text-[13px] font-semibold text-ink hover:text-brand"
          >
            Edit profile
          </button>
        )}
      </div>

      {/* IG-style stat row */}
      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border pt-4 text-center">
        {[
          { n: stats.posts, label: "posts" },
          { n: stats.going, label: "going" },
          { n: stats.applied, label: "applied" },
          { n: stats.answers, label: "answers" },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-[18px] font-bold text-ink">{s.n}</p>
            <p className="text-[11.5px] font-semibold uppercase text-ink-faint">{s.label}</p>
          </div>
        ))}
      </div>

      {editing && (
        <form onSubmit={save} className="mt-4 space-y-2 border-t border-border pt-4">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Display name"
            maxLength={60}
            className={inputClass}
          />
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="handle (3–20, lowercase)"
            maxLength={20}
            className={cn(inputClass, "font-mono")}
          />
          <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-1 rounded-xl border border-border bg-canvas px-4 py-2 text-[13.5px] font-semibold text-ink"
            >
              {picked ? "Change photo…" : shownAvatar ? "Upload new photo…" : "Upload photo…"}
            </button>
            {(shownAvatar || picked) && (
              <button
                type="button"
                onClick={() => {
                  setPicked(null);
                  setRemovePhoto(true);
                  setPreview((old) => {
                    if (old) URL.revokeObjectURL(old);
                    return null;
                  });
                  setStatus("Photo will be removed on Save.");
                }}
                className="rounded-xl border border-border px-4 py-2 text-[13.5px] font-semibold text-event"
              >
                Remove
              </button>
            )}
          </div>
          {status && <p className="text-[12.5px] text-ink-soft">{status}</p>}
          <p className="text-[11.5px] text-ink-faint">
            Any image works — it’s compressed to a ≤100 KB JPG before upload.
          </p>
          <div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="About you — skills, interests, what you're into…"
              rows={4}
              maxLength={1000}
              className={cn(inputClass, "resize-y")}
            />
            <p className="mt-1 text-right text-[11.5px] text-ink-faint">{bio.length}/1000</p>
          </div>
          <div className="space-y-2">
            <p className="text-[12.5px] font-semibold text-ink-soft">Links ({links.length}/6)</p>
            {links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={l.label}
                  onChange={(e) =>
                    setLinks((old) => old.map((row, j) => (j === i ? { ...row, label: e.target.value } : row)))
                  }
                  placeholder="Label (Portfolio)"
                  maxLength={30}
                  className={cn(inputClass, "w-1/3")}
                />
                <input
                  value={l.url}
                  onChange={(e) =>
                    setLinks((old) => old.map((row, j) => (j === i ? { ...row, url: e.target.value } : row)))
                  }
                  placeholder="https://…"
                  className={cn(inputClass, "flex-1 font-mono")}
                />
                <button
                  type="button"
                  onClick={() => setLinks((old) => old.filter((_, j) => j !== i))}
                  aria-label="Remove link"
                  className="shrink-0 rounded-xl border border-border px-3 text-[14px] font-bold text-event"
                >
                  ×
                </button>
              </div>
            ))}
            {links.length < 6 && (
              <button
                type="button"
                onClick={() => setLinks((old) => [...old, { label: "", url: "" }])}
                className="w-full rounded-xl border border-dashed border-border px-4 py-2 text-[13px] font-semibold text-ink-soft"
              >
                + Add link
              </button>
            )}
          </div>
          {error && <p className="text-[13px] text-event">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancel}
              className="flex-1 rounded-xl border border-border px-4 py-2 text-[13.5px] font-semibold text-ink-soft"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-brand px-4 py-2 text-[13.5px] font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
      </div>
    </div>
  );
}
