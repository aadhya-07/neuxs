"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClub } from "@/lib/actions";

const inputClass =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-brand";

export function ClubCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await createClub({ name, slug });
      setName("");
      setSlug("");
      router.push(`/clubs/${res.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create club.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border border-border bg-card p-4">
      <h2 className="font-display text-[15px] text-ink">Register a new club</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">
        You become its first manager — add the real managers on the club page.
      </p>
      <div className="mt-3 space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Club name (Coding Club)"
          maxLength={80}
          className={inputClass}
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug (codingclub)"
          maxLength={30}
          className={`${inputClass} font-mono`}
        />
      </div>
      {error && <p className="mt-2 text-[13px] text-event">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-3 w-full rounded-xl bg-brand px-4 py-2 text-[13.5px] font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create club"}
      </button>
    </form>
  );
}
