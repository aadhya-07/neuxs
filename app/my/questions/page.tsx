import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Feed } from "@/components/feed";
import { getFeed } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

export default async function MyQuestionsPage() {
  let me: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    me = user?.id ?? null;
  } catch {
    me = null;
  }
  if (!me) redirect("/login");
  const { posts, live } = await getFeed({ scope: "all", limit: 100 });
  const mine = posts.filter((p) => p.type === "doubt" && p.authorId === me);
  return (
    <AppShell>
      <Feed
        basePath="/my/questions"
        initialTab="doubt"
        title="My Questions"
        subtitle="Doubts you asked — track answers and upvotes."
        posts={mine}
        live={live}
        initialScope="all"
      />
      <p className="mt-4 text-center text-[12.5px] text-ink-faint">
        Looking for everything? <Link href="/doubt" className="font-semibold text-brand">Doubt board →</Link>
      </p>
    </AppShell>
  );
}
