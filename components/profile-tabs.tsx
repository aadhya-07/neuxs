"use client";

import { useState } from "react";
import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { PostActions } from "@/components/post-actions";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "posts" | "going" | "applied" | "about";

export function ProfileTabs({
  posts,
  going,
  applied,
  about,
  showPrivate,
}: {
  posts: Post[];
  going: Post[];
  applied: Post[];
  about: React.ReactNode;
  showPrivate: boolean;
}) {
  const [tab, setTab] = useState<Tab>("posts");
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "posts", label: "Posts", count: posts.length },
    ...(showPrivate
      ? [
          { key: "going" as Tab, label: "Going", count: going.length },
          { key: "applied" as Tab, label: "Applied", count: applied.length },
        ]
      : []),
    { key: "about", label: "About" },
  ];

  const list = tab === "posts" ? posts : tab === "going" ? going : applied;

  return (
    <div className="mt-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-[13.5px] font-semibold",
              tab === t.key ? "bg-ink text-card" : "border border-border bg-card text-ink-soft",
            )}
          >
            {t.label}
            {t.count != null ? ` · ${t.count}` : ""}
          </button>
        ))}
      </div>

      {tab === "about" ? (
        <div className="mt-3">{about}</div>
      ) : list.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-8 text-center text-[14px] text-ink-soft">
          Nothing here yet.{" "}
          <Link href={tab === "going" ? "/event" : tab === "applied" ? "/referral" : "/new"} className="font-semibold text-brand">
            {tab === "posts" ? "Create your first post" : tab === "going" ? "Browse events" : "Browse referrals"}
          </Link>
          .
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          {list.map((p) => (
            <PostCard key={p.id} post={p} action={<PostActions post={p} />} />
          ))}
        </div>
      )}
    </div>
  );
}
