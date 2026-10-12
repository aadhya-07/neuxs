import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function ClubNotFound() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-md py-16 text-center">
        <h1 className="font-display text-[26px] text-ink">No such club.</h1>
        <p className="mt-2 text-[13.5px] text-ink-soft">
          That slug doesn’t match any registered club.
        </p>
        <Link
          href="/event"
          className="mt-6 inline-block rounded-xl bg-brand px-4 py-2.5 text-[14px] font-semibold text-white"
        >
          Browse events
        </Link>
      </div>
    </AppShell>
  );
}
