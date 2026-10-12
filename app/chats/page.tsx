import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { VerifiedCheck } from "@/components/verified-check";
import { getMyThreads } from "@/lib/engagement";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/utils";

export default async function ChatsPage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  } catch {
    redirect("/login");
  }
  const threads = await getMyThreads();

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="font-display text-[26px] text-ink">Chats</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Marketplace conversations, live via realtime.
        </p>
        {threads.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <p className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-market-tint text-market">
              <MessageCircle className="h-5 w-5" />
            </p>
            <p className="mt-3 font-display text-[16px] text-ink">No chats yet</p>
            <p className="mt-1 text-[13.5px] text-ink-soft">
              Open a marketplace listing and message the seller — offers and meetup plans live here.
            </p>
            <Link
              href="/marketplace"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-market px-4 py-2 text-[14px] font-semibold text-white"
            >
              Browse marketplace
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {threads.map((t) => {
              const last = t.messages[0];
              return (
                <li key={t.id}>
                  <Link
                    href={`/marketplace/${t.listingId}/chat?cid=${t.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition-transform hover:-translate-y-0.5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-market-tint text-[14px] font-bold text-market">
                      {t.listingTitle.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[15px] text-ink">
                        {t.listingTitle}
                      </span>
                      <span className="flex items-center gap-1 text-[12.5px] text-ink-soft">
                        <span className="truncate">{t.otherHandle}</span>
                        <VerifiedCheck />
                        {last && (
                          <span className="truncate text-ink-faint">
                            · {last.mine ? "You: " : ""}{last.body.slice(0, 60)}
                          </span>
                        )}
                      </span>
                    </span>
                    {last && (
                      <span className="shrink-0 text-[11px] text-ink-faint">
                        {timeAgo(last.createdAt)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
