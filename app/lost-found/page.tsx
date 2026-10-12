import { FeedPage } from "@/components/feed-page";

export default function LostFoundPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <FeedPage
      basePath="/lost-found"
      initialTab="lost_found"
      title="Lost & Found"
      subtitle="Lost something? Found something? Match it here instead of a WhatsApp thread."
      searchParams={searchParams}
    />
  );
}
