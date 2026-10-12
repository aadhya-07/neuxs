"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { startConversation } from "@/lib/actions";

export function MessageSellerButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const id = await startConversation(listingId);
      router.push(`/marketplace/${listingId}/chat?cid=${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start chat.";
      if (/sign in/i.test(msg)) router.push("/login");
      else setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        onClick={start}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-market px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-60"
      >
        <MessageCircle className="h-4 w-4" />
        {busy ? "Opening…" : "Message seller"}
      </button>
      {error && <p className="mt-2 text-[13px] text-event">{error}</p>}
    </div>
  );
}
