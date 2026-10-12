"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Sidebar entry visible to moderators only. Client-side so AppShell stays
// client-safe (lib/engagement pulls next/headers and can't ship to browsers).
export function ModerationLink() {
  const [mod, setMod] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !alive) return;
        const { data } = await supabase
          .from("profiles")
          .select("is_moderator")
          .eq("id", user.id)
          .single();
        if (alive && data?.is_moderator) setMod(true);
      } catch {
        if (alive) setMod(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!mod) return null;
  return (
    <Link
      href="/moderation"
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] font-semibold text-ink-soft hover:bg-canvas hover:text-ink"
    >
      <ShieldCheck className="h-4 w-4" /> Moderation
    </Link>
  );
}
