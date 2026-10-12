export type PostType =
  | "lost_found"
  | "marketplace"
  | "doubt"
  | "referral"
  | "event";

export type PostStatus =
  | "open"
  | "claimed"
  | "sold"
  | "resolved"
  | "closed";

export interface Post {
  id: string;
  type: PostType;
  title: string;
  body: string;
  images: string[];
  status: PostStatus;
  authorName: string;
  authorHandle: string;
  authorId?: string | null;
  clubId?: string | null;
  clubSlug?: string | null;
  verified: boolean;
  anonymous?: boolean;
  createdAt: string;
  location?: string;
  price?: number | null;
  category?: string | null;
  upvotes?: number;
  applicants?: number;
  rsvps?: number;
  replies?: number;
  deadlineAt?: string | null;
  startsAt?: string | null;
}
