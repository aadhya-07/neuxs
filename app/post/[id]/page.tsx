import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { PostActions } from "@/components/post-actions";
import { AnswersPanel } from "@/components/answers-panel";
import { ApplyPanel } from "@/components/apply-panel";
import { RsvpPanel } from "@/components/rsvp-panel";
import { ReportButton } from "@/components/report-button";
import { MessageSellerButton } from "@/components/message-seller-button";
import { MakeOfferSheet } from "@/components/make-offer-sheet";
import { OfferPanel } from "@/components/offer-panel";
import { ConfirmedDeal } from "@/components/confirmed-deal";
import {
  getAnswers,
  getApplicants,
  getMyApplication,
  getMyRsvp,
  getOffers,
  getPostDetail,
} from "@/lib/engagement";
import { createClient } from "@/lib/supabase/server";
import { isClubManager } from "@/lib/clubs";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostDetail(id);
  if (!post) notFound();

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
  const signedIn = me !== null;
  const isOwner = me !== null && post.authorId != null && me === post.authorId;
  const canManageClub =
    !isOwner && post.clubId ? await isClubManager(me, post.clubId) : false;
  const canEdit = isOwner || canManageClub;

  const [answers, applicants, applied, going, offers] = await Promise.all([
    post.type === "doubt" ? getAnswers(post.id) : Promise.resolve([]),
    post.type === "referral" && isOwner ? getApplicants(post.id) : Promise.resolve([]),
    post.type === "referral" ? getMyApplication(post.id) : Promise.resolve(false),
    post.type === "event" ? getMyRsvp(post.id) : Promise.resolve(false),
    post.type === "marketplace" ? getOffers(post.id) : Promise.resolve([]),
  ]);
  const acceptedOffer = offers.find((o) => o.status === "accepted");

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/" className="text-[13px] font-semibold text-ink-soft hover:text-ink">
          ← Feed
        </Link>
        <div className="mt-3">
          <PostCard post={post} action={<PostActions post={post} forceMine={canEdit} />} />
        </div>
        {post.type === "doubt" && (
          <AnswersPanel postId={post.id} initialAnswers={answers} signedIn={signedIn} />
        )}
        {post.type === "referral" && (
          <ApplyPanel
            postId={post.id}
            deadline={post.deadlineAt}
            initialApplied={applied}
            initialCount={post.applicants ?? applicants.length}
            isOwner={isOwner}
            initialApplicants={applicants}
            signedIn={signedIn}
          />
        )}
        {post.type === "event" && (
          <RsvpPanel
            postId={post.id}
            initialGoing={going}
            initialCount={post.rsvps ?? 0}
            signedIn={signedIn}
          />
        )}
        {post.type === "marketplace" && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-referral-tint px-3.5 py-2.5 text-[12.5px] font-medium text-referral">
            <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-referral text-[12px] font-bold text-white">✓</span>
            Nexus Verified Trade — meet on campus, pay cash, confirm the deal here.
          </div>
        )}
        {post.type === "marketplace" && !isOwner && (
          <>
            <MessageSellerButton listingId={post.id} />
            <MakeOfferSheet listingId={post.id} price={post.price ?? null} />
          </>
        )}
        {post.type === "marketplace" && signedIn && (
          <OfferPanel
            initialOffers={offers}
            isSeller={isOwner || canManageClub}
            signedIn={signedIn}
          />
        )}
        {post.type === "marketplace" && acceptedOffer && (
          <ConfirmedDeal
            offer={acceptedOffer}
            listingTitle={post.title}
            chatHref={`/marketplace/${post.id}/chat`}
          />
        )}
        {post.type === "marketplace" && isOwner && (
          <p className="mt-6 text-[13px] text-ink-soft">
            Your chats for this listing live under{" "}
            <Link href={`/marketplace/${post.id}/chat`} className="font-semibold text-brand">
              Messages
            </Link>
            .
          </p>
        )}
        <ReportButton postId={post.id} />
      </div>
    </AppShell>
  );
}
