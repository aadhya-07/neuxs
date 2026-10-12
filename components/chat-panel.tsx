"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, ChatThread } from "@/lib/engagement";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function ChatPanel({
  threads,
  activeId,
}: {
  threads: ChatThread[];
  activeId: string | null;
}) {
  const active = threads.find((t) => t.id === activeId) ?? threads[0] ?? null;
  const convId = active?.id ?? null;
  // Parent remounts per thread (key=conversation id), so initial state is fresh.
  const [messages, setMessages] = useState<ChatMessage[]>(active?.messages ?? []);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Live incoming messages for the open thread.
  useEffect(() => {
    if (!convId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const m = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            body: string;
            created_at: string;
          };
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [
              ...prev,
              {
                id: m.id,
                conversationId: m.conversation_id,
                senderId: m.sender_id,
                body: m.body,
                createdAt: m.created_at,
                mine: false,
              },
            ];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !draft.trim() || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: active.id, sender_id: user.id, body: text.slice(0, 1000) })
        .select("id,conversation_id,sender_id,body,created_at")
        .single();
      if (error) throw error;
      setMessages((prev) =>
        prev.some((x) => x.id === data.id)
          ? prev
          : [
              ...prev,
              {
                id: data.id,
                conversationId: data.conversation_id,
                senderId: data.sender_id,
                body: data.body,
                createdAt: data.created_at,
                mine: true,
              },
            ],
      );
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  if (!active) return null;

  return (
    <div className="flex min-h-[50vh] flex-col rounded-xl border border-border bg-card">
      {threads.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-b border-border p-3">
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`?cid=${t.id}`}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold",
                t.id === active.id ? "bg-ink text-card" : "bg-canvas text-ink-soft",
              )}
            >
              {t.otherHandle}
            </Link>
          ))}
        </div>
      )}
      <div className="flex min-h-[300px] flex-1 flex-col gap-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="m-auto text-[13px] text-ink-faint">
            Say hi — negotiate pickup time and place here.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2 text-[13.5px]",
                m.mine ? "bg-brand text-white" : "bg-canvas text-ink",
              )}
            >
              <p>{m.body}</p>
              <p className={cn("mt-0.5 text-[10.5px]", m.mine ? "text-white/70" : "text-ink-faint")}>
                {timeAgo(m.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${active.otherHandle}…`}
          maxLength={1000}
          className="min-w-0 flex-1 rounded-xl border border-border bg-canvas px-3 py-2 text-[13.5px] text-ink outline-none placeholder:text-ink-faint focus:border-brand"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Send"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
