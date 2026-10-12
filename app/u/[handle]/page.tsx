import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProfileAbout } from "@/components/profile-about";
import { ProfileHeader } from "@/components/profile-header";
import { ProfileTabs } from "@/components/profile-tabs";
import { createClient } from "@/lib/supabase/server";
import { getAnswerCount, getPostsByAuthor, getProfileByHandle } from "@/lib/profile";

export default async function UserPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

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
  const isOwner = me !== null && me === profile.id;

  const [allPosts, answers] = await Promise.all([
    getPostsByAuthor(profile.id),
    getAnswerCount(profile.id),
  ]);
  // Doubt anonymity: hide doubt post bodies from non-owners (count only).
  const hiddenDoubts = isOwner ? 0 : allPosts.filter((p) => p.type === "doubt").length;
  const posts = isOwner ? allPosts : allPosts.filter((p) => p.type !== "doubt");

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">
        <ProfileHeader
          profile={profile}
          stats={{ posts: allPosts.length, going: 0, applied: 0, answers }}
          editable={false}
        />
        {hiddenDoubts > 0 && (
          <p className="mt-3 text-[12.5px] text-ink-faint">
            {hiddenDoubts} anonymous doubt{hiddenDoubts === 1 ? "" : "s"} hidden for privacy.
          </p>
        )}
        {isOwner && (
          <p className="mt-3 text-[12.5px] text-ink-soft">
            This is your public page.{" "}
            <Link href="/profile" className="font-semibold text-brand">
              Open your full profile
            </Link>
            .
          </p>
        )}
        <ProfileTabs
          posts={posts}
          going={[]}
          applied={[]}
          showPrivate={false}
          about={<ProfileAbout profile={profile} isOwner={isOwner} />}
        />
      </div>
    </AppShell>
  );
}
