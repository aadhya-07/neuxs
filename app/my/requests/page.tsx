import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Feed } from "@/components/feed";
import { getFeed } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

export default async function MyRequestsPage() {
  let me: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    me = user?.id ?? null;
    if (!me) redirect("/login");
    const { data: apps } = await supabase
      .from("applications")
      .select("post_id")
      .eq("applicant_id", me!);
    const ids = new Set((apps ?? []).map((a) => a.post_id as string));
    const { posts, live } = await getFeed({ scope: "all", limit: 100 });
    const mine = posts.filter((p) => ids.has(p.id));
    return (
      <AppShell>
        <Feed
          basePath="/my/requests"
          initialTab="referral"
          title="My Requests"
          subtitle="Referrals you applied to — posters see your note."
          posts={mine}
          live={live}
          initialScope="all"
        />
        <p className="mt-4 text-center text-[12.5px] text-ink-faint">
          Find more? <Link href="/referral" className="font-semibold text-brand">Referrals →</Link>
        </p>
      </AppShell>
    );
  } catch {
    redirect("/login");
  }
}
