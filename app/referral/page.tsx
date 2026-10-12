import { FeedPage } from "@/components/feed-page";

export default function ReferralPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <FeedPage
      basePath="/referral"
      initialTab="referral"
      title="Referrals"
      subtitle="Internships and job leads from verified students, with deadlines and applicant counts."
      searchParams={searchParams}
    />
  );
}
