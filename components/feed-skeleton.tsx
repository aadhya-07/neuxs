export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Loading posts">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border border-l-[3px] bg-card p-4"
        >
          <div className="flex items-center gap-2">
            <div className="h-5 w-20 rounded-full bg-canvas" />
            <div className="h-5 w-14 rounded-full bg-canvas" />
            <div className="ml-auto h-3 w-12 rounded bg-canvas" />
          </div>
          <div className="mt-3 h-4 w-3/4 rounded bg-canvas" />
          <div className="mt-2 h-3 w-full rounded bg-canvas" />
          <div className="mt-1 h-3 w-2/3 rounded bg-canvas" />
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <div className="h-3 w-20 rounded bg-canvas" />
            <div className="ml-auto h-3 w-16 rounded bg-canvas" />
          </div>
        </div>
      ))}
    </div>
  );
}
