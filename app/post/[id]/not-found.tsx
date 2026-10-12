import Link from "next/link";

export default function PostNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-[26px] text-ink">Post not found</h1>
      <p className="mt-2 text-[13.5px] text-ink-soft">
        It may have been deleted — or the database query failed just now
        (check the dev terminal for a <span className="font-mono">[post]</span>{" "}
        line). Go back to the feed and try again.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-[14px] font-semibold text-white"
      >
        Back to feed
      </Link>
    </div>
  );
}
