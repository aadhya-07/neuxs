"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addClubManager, removeClubManager } from "@/lib/actions";
import type { ClubManagerDTO } from "@/lib/clubs";

const inputClass =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-brand";

export function ClubManage({
  clubId,
  managers,
  me,
}: {
  clubId: string;
  managers: ClubManagerDTO[];
  me: string;
}) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await addClubManager(clubId, handle);
      setHandle("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add manager.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(targetUserId: string) {
    setBusy(true);
    setError(null);
    try {
      await removeClubManager(clubId, targetUserId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove manager.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <h2 className="font-display text-[15px] text-ink">Managers ({managers.length})</h2>
      <ul className="mt-2 space-y-1.5">
        {managers.map((m) => (
          <li key={m.userId} className="flex items-center gap-2 text-[13.5px]">
            <span className="font-semibold text-ink">
              {m.fullName ?? `@${m.handle}`}
            </span>
            <span className="text-ink-faint">@{m.handle}</span>
            {m.userId !== me && (
              <button
                onClick={() => remove(m.userId)}
                disabled={busy}
                className="ml-auto text-[12.5px] font-semibold text-event hover:underline disabled:opacity-60"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@handle of new co-manager"
          maxLength={25}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-xl bg-brand px-4 py-2 text-[13.5px] font-semibold text-white disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-[13px] text-event">{error}</p>}
    </div>
  );
}
