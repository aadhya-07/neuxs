import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Feed } from "@/components/feed";
import { getFeed } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

export default async function MyRsvpsPage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: rows } = await supabase.from("rsvps").select("post_id").eq("user_id", user.id);
    const ids = new Set((rows ?? []).map((r) => r.post_id as string));
    const { posts, live } = await getFeed({ scope: "all", limit: 100 });
    const mine = posts.filter((p) => ids.has(p.id));
    return (
      <AppShell>
        <Feed
          basePath="/my/rsvps"
          initialTab="event"
          title="My RSVPs"
          subtitle="Events you're going to — reminders land before start."
          posts={mine}
          live={live}
          initialScope="all"
        />
        <p className="mt-4 text-center text-[12.5px] text-ink-faint">
          Discover more?{" "}
          <Link href="/event" className="font-semibold text-brand">
            Events →
          </Link>{" "}
          · <Link href="/event/calendar" className="font-semibold text-brand">Calendar →</Link>
        </p>
      </AppShell>
    );
  } catch {
    redirect("/login");
  }
}
