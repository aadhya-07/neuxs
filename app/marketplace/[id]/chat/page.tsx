import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ChatPanel } from "@/components/chat-panel";
import { getThreadsForListing } from "@/lib/engagement";

export default async function ListingChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const cid = Array.isArray(sp.cid) ? sp.cid[0] : sp.cid;
  const { threads, listingTitle, sellerId, me } = await getThreadsForListing(id);
  if (!me) redirect("/login");

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl">
        <Link href={`/post/${id}`} className="text-[13px] font-semibold text-ink-soft hover:text-ink">
          ← {listingTitle || "Listing"}
        </Link>
        <h1 className="mt-2 font-display text-[22px] text-ink">Messages</h1>
        <div className="mt-3">
          {threads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-[14px] text-ink-soft">
              {sellerId === me ? (
                "No messages yet. Buyers will appear here."
              ) : (
                <>
                  No conversation yet.{" "}
                  <Link href={`/post/${id}`} className="font-semibold text-brand">
                    Message the seller
                  </Link>{" "}
                  from the listing.
                </>
              )}
            </div>
          ) : (
            <ChatPanel
              key={cid ?? threads[0]?.id ?? "none"}
              threads={threads}
              activeId={cid ?? null}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
