import { FeedPage } from "@/components/feed-page";

export default function DoubtPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <FeedPage
      basePath="/doubt"
      initialTab="doubt"
      title="Doubt board"
      subtitle="Ask anonymously, get answers ranked by upvotes. Identity stays verified but hidden."
      searchParams={searchParams}
    />
  );
}
