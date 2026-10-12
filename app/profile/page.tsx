import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AppearancePanel } from "@/components/appearance-panel";
import { ProfileAbout } from "@/components/profile-about";
import { ProfileHeader } from "@/components/profile-header";
import { ProfileTabs } from "@/components/profile-tabs";
import {
  getAnswerCount,
  getAppliedPosts,
  getMyProfile,
  getPostsByAuthor,
  getRsvpPosts,
} from "@/lib/profile";

export default async function ProfilePage() {
  const { profile, userId } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="font-display text-[26px] text-ink">Profile</h1>
          <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-8 text-center text-[14px] text-ink-soft">
            Your profile row isn’t set up yet.{" "}
            <Link href="/new" className="font-semibold text-brand">
              Make your first post
            </Link>{" "}
            and it will be created automatically.
          </p>
        </div>
      </AppShell>
    );
  }

  const [posts, going, applied, answers] = await Promise.all([
    getPostsByAuthor(profile.id),
    getRsvpPosts(profile.id),
    getAppliedPosts(profile.id),
    getAnswerCount(profile.id),
  ]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">
        <ProfileHeader
          profile={profile}
          stats={{ posts: posts.length, going: going.length, applied: applied.length, answers }}
          editable
        />
        <ProfileTabs
          posts={posts}
          going={going}
          applied={applied}
          showPrivate
          about={<ProfileAbout profile={profile} isOwner />}
        />
        <div className="mt-4">
          <AppearancePanel syncedWallpaperUrl={profile.wallpaperUrl} />
        </div>
      </div>
    </AppShell>
  );
}
