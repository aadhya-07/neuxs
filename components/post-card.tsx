import Link from "next/link";
import { MODULE_META } from "@/lib/constants";
import type { Post } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import {
  ArrowBigUp,
  Bookmark,
  CalendarDays,
  Clock,
  MapPin,
  MessageCircle,
  Share2,
  Tag,
  ThumbsUp,
  Users,
  Send,
  BadgeCheck,
} from "lucide-react";
import { ModuleTag, StatusChip } from "./pill";
import { VerifiedCheck } from "./verified-check";
import { Button } from "./ui/button";
import { PostMenu } from "./post-menu";

const accentClass = {
  lost_found: "border-l-lost",
  marketplace: "border-l-market",
  doubt: "border-l-doubt",
  referral: "border-l-referral",
  event: "border-l-event",
} as const;

function formatPrice(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function eventDateParts(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()).padStart(2, "0"),
    time: d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

function Avatar({ post }: { post: Post }) {
  const initial = (post.anonymous ? "?" : post.authorName.charAt(0) || "S").toUpperCase();
  const cover = !post.anonymous && post.images?.[0];
  if (cover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cover}
        alt=""
        loading="lazy"
        className="h-9 w-9 shrink-0 rounded-full border border-border object-cover ring-2 ring-canvas"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white ring-2 ring-canvas"
      style={{ background: MODULE_META[post.type]?.color }}
    >
      {initial}
    </span>
  );
}

function ContextArea({ post }: { post: Post }) {
  if (post.type === "marketplace" && post.price != null)
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-display text-[16px] text-market">{formatPrice(post.price)}</span>
        <StatusChip status={post.status === "open" ? "Available" : post.status} />
        {post.location && <span className="text-xs text-ink-faint">· {post.location} pickup</span>}
      </div>
    );
  if (post.type === "event") {
    const parts = eventDateParts(post.startsAt);
    if (parts)
      return (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-event px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase">
            Open RSVP
          </span>
          <span className="text-[13px] font-medium text-ink-soft">
            {post.rsvps ?? 0} attending · {parts.month} {parts.day}, {parts.time}
          </span>
        </div>
      );
  }
  if (post.type === "referral")
    return (
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-referral-tint px-2 py-0.5 text-[11px] font-bold text-referral">
          {post.applicants ?? 0} applied
        </span>
        {post.category && (
          <span className="rounded bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-soft">
            {post.category}
          </span>
        )}
        {post.deadlineAt && (
          <span className="inline-flex items-center gap-1 rounded bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-soft">
            <Clock className="h-3 w-3" /> ends {timeAgo(post.deadlineAt)}
          </span>
        )}
      </div>
    );
  const tags: React.ReactNode[] = [];
  if (post.location)
    tags.push(
      <span
        key="loc"
        className="inline-flex items-center gap-1 rounded border border-border bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-soft"
      >
        <MapPin className="h-3 w-3" /> {post.location}
      </span>,
    );
  if (post.category)
    tags.push(
      <span
        key="cat"
        className="inline-flex items-center gap-1 rounded border border-border bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-soft"
      >
        <Tag className="h-3 w-3" /> {post.category}
      </span>,
    );
  if (!tags.length) return null;
  return <div className="mb-3 flex flex-wrap gap-1.5">{tags}</div>;
}

function Footer({ post }: { post: Post }) {
  const href = `/post/${post.id}`;
  const ghostIcon =
    "flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-canvas hover:text-ink";
  if (post.type === "marketplace")
    return (
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <Button href={href} className="bg-market">
            <BadgeCheck className="h-4 w-4" /> Make Offer
          </Button>
          <Button href={href} variant="soft">
            <MessageCircle className="h-4 w-4" /> Inquire
          </Button>
        </div>
        <button aria-label="Save listing" className={ghostIcon}>
          <Bookmark className="h-4 w-4" />
        </button>
      </div>
    );
  if (post.type === "doubt")
    return (
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <Button href={href} variant="soft">
            <MessageCircle className="h-4 w-4" /> {post.replies ?? post.upvotes ?? 0} answers
          </Button>
          <span className="inline-flex items-center gap-1 px-1 text-[12px] text-ink-faint">
            <ArrowBigUp className="h-3.5 w-3.5" /> {post.upvotes ?? 0} votes
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button aria-label="Share question" className={ghostIcon}>
            <Share2 className="h-4 w-4" />
          </button>
          <button aria-label="Save question" className={ghostIcon}>
            <Bookmark className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  if (post.type === "referral")
    return (
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <Button href={href} className="bg-referral">
            <Send className="h-4 w-4" /> Request DM
          </Button>
          <Button href={href} variant="soft">
            <MessageCircle className="h-4 w-4" /> {post.applicants ?? 0} requests
          </Button>
        </div>
        <button aria-label="Save referral" className={ghostIcon}>
          <Bookmark className="h-4 w-4" />
        </button>
      </div>
    );
  if (post.type === "event")
    return (
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <Button href={href} className="bg-event">
            <CalendarDays className="h-3.5 w-3.5" /> Confirm Attendance
          </Button>
          <Button href={href} variant="soft">
            <Users className="h-4 w-4" /> {post.rsvps ?? 0} going
          </Button>
        </div>
        <button aria-label="Add to calendar" className={ghostIcon}>
          <CalendarDays className="h-4 w-4" />
        </button>
      </div>
    );
  return (
    <div className="flex items-center justify-between border-t border-border pt-3">
      <div className="flex items-center gap-2">
        <Button href={href} variant="soft">
          <ThumbsUp className="h-4 w-4" /> {post.upvotes ?? 0}
        </Button>
        <Button href={href} variant="ghost">
          <MessageCircle className="h-4 w-4" /> Open
        </Button>
      </div>
      <button aria-label="Share notice" className={ghostIcon}>
        <Share2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function PostCard({
  post,
  action,
  span = false,
}: {
  post: Post;
  action?: React.ReactNode;
  span?: boolean;
}) {
  const displayName = post.anonymous ? "Anonymous" : post.authorName;
  const clubSlug =
    post.clubSlug ?? (post.authorHandle.startsWith("@") ? post.authorHandle.slice(1) : null);
  const profileHref =
    !post.anonymous && post.authorId && post.authorHandle.startsWith("@")
      ? `/u/${post.authorHandle.slice(1)}`
      : !post.anonymous && !post.authorId && clubSlug
        ? `/clubs/${clubSlug}`
        : null;
  const dateParts = post.type === "event" ? eventDateParts(post.startsAt) : null;
  const wide = span || post.type === "event";
  return (
    <article
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-border border-l-[3px] bg-card p-4 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-modal",
        accentClass[post.type] ?? "border-l-border",
        wide && "md:col-span-2",
      )}
      style={{ borderLeftColor: MODULE_META[post.type]?.color }}
    >
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar post={post} />
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-1">
                <span className="truncate text-[12px] font-semibold text-ink">{displayName}</span>
                {!post.anonymous && <VerifiedCheck />}
              </div>
              <span className="truncate text-[11px] text-ink-faint">
                {post.anonymous ? (
                  <>verified student · {timeAgo(post.createdAt)}</>
                ) : profileHref ? (
                  <Link href={profileHref} className="hover:text-brand hover:underline">
                    Verified student · {timeAgo(post.createdAt)}
                  </Link>
                ) : (
                  <>
                    Verified student · {timeAgo(post.createdAt)}
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ModuleTag type={post.type} />
            <PostMenu postId={post.id} title={post.title} />
          </div>
        </div>
        {post.images && post.images.length > 0 && (
          <Link
            href={`/post/${post.id}`}
            className="relative -mx-4 mb-3 block h-48 w-[calc(100%+32px)] overflow-hidden bg-canvas"
            aria-label={post.title}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.images[0]} alt={post.title} loading="lazy" className="h-full w-full object-cover" />
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/5 to-transparent"
            />
            {post.type === "marketplace" && post.price != null && (
              <span className="absolute bottom-2 left-3 rounded-full bg-ink/80 px-2.5 py-0.5 text-[12px] font-bold text-white">
                {formatPrice(post.price)}
              </span>
            )}
            {post.type !== "marketplace" && post.location && (
              <span className="absolute bottom-2 left-3 inline-flex max-w-[70%] items-center gap-1 truncate rounded-full bg-ink/80 px-2.5 py-0.5 text-[12px] font-semibold text-white">
                <MapPin className="h-3 w-3 shrink-0" /> {post.location}
              </span>
            )}
            {post.images.length > 1 && (
              <span className="absolute right-2 bottom-2 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-white">
                +{post.images.length - 1}
              </span>
            )}
          </Link>
        )}
        <div className="flex gap-3">
          {dateParts && (
            <div className="flex h-fit w-[52px] shrink-0 flex-col items-center rounded-lg bg-event-tint px-2 py-1.5 text-event">
              <span className="text-[10px] font-bold tracking-wide">{dateParts.month}</span>
              <span className="font-display text-[18px] leading-none">{dateParts.day}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] leading-snug font-bold text-ink">
              <Link href={`/post/${post.id}`} className="hover:underline">
                {post.title}
              </Link>
            </h3>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">
              {post.body}
            </p>
          </div>
        </div>
        <div className="mt-2">
          <ContextArea post={post} />
        </div>
      </div>
      <div className="mt-1">
        <Footer post={post} />
        {action}
      </div>
    </article>
  );
}
