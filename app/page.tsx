import { FeedPage } from "@/components/feed-page";
import { getMyProfile } from "@/lib/profile";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { profile } = await getMyProfile();
  const displayName = profile?.fullName ?? (profile ? `@${profile.handle}` : null);
  return (
    <FeedPage
      basePath="/"
      initialTab="all"
      title="Campus Feed"
      subtitle="Real-time peer bulletin verified with student credentials."
      searchParams={searchParams}
      pinned
      displayName={displayName}
    />
  );
}
