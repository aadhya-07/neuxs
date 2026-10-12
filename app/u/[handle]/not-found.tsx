import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function UserNotFound() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-md py-16 text-center">
        <h1 className="font-display text-[26px] text-ink">No such student.</h1>
        <p className="mt-2 text-[13.5px] text-ink-soft">
          That handle doesn’t match any verified profile.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-brand px-4 py-2.5 text-[14px] font-semibold text-white"
        >
          Back to feed
        </Link>
      </div>
    </AppShell>
  );
}
