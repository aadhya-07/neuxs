"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deletePost, setPostStatus } from "@/lib/actions";
import type { Post, PostStatus } from "@/lib/types";

const OPTIONS: Record<Post["type"], { value: PostStatus; label: string }[]> = {
  lost_found: [
    { value: "open", label: "Open" },
    { value: "claimed", label: "Claimed" },
    { value: "resolved", label: "Resolved" },
  ],
  marketplace: [
    { value: "open", label: "Available" },
    { value: "sold", label: "Sold" },
  ],
  doubt: [
    { value: "open", label: "Open" },
    { value: "resolved", label: "Resolved" },
  ],
  referral: [
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
  ],
  event: [
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
  ],
};

// Owner + club-admin controls (club managers pass forceMine from the
// post/club page). Renders nothing for non-owners / seed data.
export function PostActions({ post, forceMine = false }: { post: Post; forceMine?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mine, setMine] = useState(forceMine);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (forceMine) return;
    if (!post.authorId) return;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (alive) setMine(data.user?.id === post.authorId);
      } catch {
        if (alive) setMine(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [post.authorId, forceMine]);

  if (!mine) return null;

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deletePost(post.id);
      // On the post detail page the post no longer exists — go home.
      // Everywhere else (feed, club, profile) just refresh the list.
      if (pathname === `/post/${post.id}`) router.push("/");
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select
        value={post.status}
        disabled={busy || deleting}
        onChange={async (e) => {
          setBusy(true);
          setError(null);
          try {
            await setPostStatus(post.id, e.target.value as PostStatus);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Update failed.");
          } finally {
            setBusy(false);
          }
        }}
        className="rounded-full border border-border bg-canvas px-3 py-1.5 text-[12px] font-semibold text-ink-soft outline-none focus:border-brand"
      >
        {OPTIONS[post.type].map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleDelete}
        onBlur={() => setConfirming(false)}
        disabled={busy || deleting}
        className={
          confirming
            ? "inline-flex items-center gap-1 rounded-full bg-event px-3 py-1.5 text-[12px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            : "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-ink-faint transition-colors hover:bg-event-tint hover:text-event disabled:opacity-60"
        }
      >
        <Trash2 className="h-3.5 w-3.5" />
        {deleting ? "Deleting…" : confirming ? "Confirm delete?" : "Delete"}
      </button>
      {busy && !deleting && <span className="text-[12px] text-ink-faint">Saving…</span>}
      {error && <span className="text-[12px] text-event">{error}</span>}
    </div>
  );
}
