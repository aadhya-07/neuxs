import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-[26px] text-ink">Link expired</h1>
      <p className="mt-1 text-[13.5px] text-ink-soft">
        That sign-in link is invalid, expired, or was already used. Request a
        fresh code to sign in.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-[14px] font-semibold text-white"
      >
        Back to sign in
      </Link>
    </div>
  );
}
