"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CardState {
  loading: boolean;
  signedIn: boolean;
  handle: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  karma: number | null;
}

// Sidebar user card — live pfp + handle + karma. Client-side like
// ModerationLink so AppShell stays client-safe.
export function SidebarProfile({ compact = false }: { compact?: boolean }) {
  const [s, setS] = useState<CardState>({
    loading: true,
    signedIn: false,
    handle: null,
    fullName: null,
    avatarUrl: null,
    karma: null,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (alive) setS({ loading: false, signedIn: false, handle: null, fullName: null, avatarUrl: null, karma: null });
          return;
        }
        const { data } = await supabase
          .from("profiles")
          .select("handle,full_name,avatar_url,karma")
          .eq("id", user.id)
          .single();
        if (!alive) return;
        const row = data as { handle: string; full_name: string | null; avatar_url: string | null; karma: number } | null;
        setS({
          loading: false,
          signedIn: true,
          handle: row?.handle ?? null,
          fullName: row?.full_name ?? null,
          avatarUrl: row?.avatar_url ?? null,
          karma: row?.karma ?? null,
        });
      } catch {
        if (alive) {
          setS({ loading: false, signedIn: false, handle: null, fullName: null, avatarUrl: null, karma: null });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const initial = ((s.handle ?? "S").charAt(0) || "S").toUpperCase();

  const avatar = s.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={s.avatarUrl}
      alt={s.handle ?? "profile"}
      className={compact ? "h-8 w-8 rounded-full object-cover" : "h-10 w-10 rounded-full object-cover"}
    />
  ) : (
    <div
      className={
        compact
          ? "flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white"
          : "flex h-10 w-10 items-center justify-center rounded-full bg-brand text-[14px] font-bold text-white"
      }
    >
      {s.loading ? "S" : initial}
    </div>
  );

  if (compact) {
    return (
      <Link href={s.signedIn ? "/profile" : "/login"} aria-label="My profile">
        {avatar}
      </Link>
    );
  }

  if (!s.loading && !s.signedIn) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-xl border border-border bg-canvas p-2"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
          ?
        </div>
        <div>
          <p className="text-[13px] font-semibold text-ink">Sign in</p>
          <p className="text-[11.5px] text-ink-faint">verified only</p>
        </div>
      </Link>
    );
  }

  return (
    <Link href="/profile" className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-2.5">
      <span className="flex min-w-0 items-center gap-2.5">
        {avatar}
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-bold text-ink">
            {s.loading ? "My profile" : (s.fullName ?? (s.handle ? `@${s.handle}` : "My profile"))}
          </span>
          <span className="block text-[12px] text-ink-faint">View Profile</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
    </Link>
  );
}

// Compact identity chip for the feed topbar (avatar + first name).
// Same profile source as the sidebar card.
export function ProfileChip() {
  const [s, setS] = useState<CardState>({
    loading: true,
    signedIn: false,
    handle: null,
    fullName: null,
    avatarUrl: null,
    karma: null,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (alive) setS((old) => ({ ...old, loading: false }));
          return;
        }
        const { data } = await supabase
          .from("profiles")
          .select("handle,full_name,avatar_url")
          .eq("id", user.id)
          .single();
        if (!alive) return;
        const row = data as { handle: string; full_name: string | null; avatar_url: string | null } | null;
        setS({
          loading: false,
          signedIn: true,
          handle: row?.handle ?? null,
          fullName: row?.full_name ?? null,
          avatarUrl: row?.avatar_url ?? null,
          karma: null,
        });
      } catch {
        if (alive) setS((old) => ({ ...old, loading: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (s.loading || !s.signedIn) return null;
  const first = (s.fullName ?? s.handle ?? "You").trim().split(/\s+/)[0].replace(/^@/, "");
  const initial = (first.charAt(0) || "S").toUpperCase();
  return (
    <Link
      href="/profile"
      className="hidden items-center gap-2 rounded-full border border-border bg-card py-1 pr-2 pl-1 transition-colors hover:bg-canvas sm:inline-flex"
    >
      {s.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
          {initial}
        </span>
      )}
      <span className="max-w-24 truncate text-[13.5px] font-bold text-ink">{first}</span>
      <ChevronDown className="h-3.5 w-3.5 text-ink-faint" />
    </Link>
  );
}
