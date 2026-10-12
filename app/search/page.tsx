import { FeedPage } from "@/components/feed-page";

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <FeedPage
      basePath="/search"
      initialTab="all"
      title="Search"
      subtitle="Search across lost items, listings, doubts, referrals, and events."
      searchParams={searchParams}
    />
  );
}
