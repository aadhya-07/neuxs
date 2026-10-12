import { FeedPage } from "@/components/feed-page";

export default function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <FeedPage
      basePath="/marketplace"
      initialTab="marketplace"
      title="Marketplace"
      subtitle="Buy and sell with verified students. Payment happens outside the app."
      searchParams={searchParams}
    />
  );
}
