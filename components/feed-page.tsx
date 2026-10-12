import { AppShell } from "@/components/app-shell";
import { Feed } from "@/components/feed";
import { feedParamsFrom, getFeed } from "@/lib/feed";
import type { ModuleKey } from "@/lib/constants";

export async function FeedPage({
  basePath,
  initialTab,
  title,
  subtitle,
  searchParams,
  pinned = false,
  displayName = null,
}: {
  basePath: string;
  initialTab: ModuleKey;
  title: string;
  subtitle: string;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  pinned?: boolean;
  displayName?: string | null;
}) {
  const fp = feedParamsFrom(await searchParams);
  const { posts, live } = await getFeed(fp);
  return (
    <AppShell>
      <Feed
        basePath={basePath}
        initialTab={initialTab}
        title={title}
        subtitle={subtitle}
        posts={posts}
        live={live}
        initialQuery={fp.q}
        initialCategory={fp.category}
        initialMaxPrice={fp.maxPrice}
        initialScope={fp.scope}
        pinned={pinned}
        displayName={displayName}
      />
    </AppShell>
  );
}
