"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/client";
import { allowedDomainsLabel, authErrorMessage } from "@/lib/auth";

const PROVIDERS = [
  { id: "google", label: "Continue with Google" },
  { id: "github", label: "Continue with GitHub" },
] as const;

type Provider = (typeof PROVIDERS)[number]["id"];

function LoginForm() {
  const params = useSearchParams();
  const [status, setStatus] = useState<string | null>(
    params.get("error") === "domain-not-allowed"
      ? "That email domain isn't allowed on Nexus yet."
      : null,
  );
  const [busy, setBusy] = useState<Provider | null>(null);

  async function oauth(provider: Provider) {
    if (busy) return;
    setStatus(null);
    setBusy(provider);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });
      if (error) throw error;
      // Browser leaves for the provider — no finally reset needed on success.
    } catch (err) {
      setStatus(
        authErrorMessage(
          err,
          `Could not start ${provider} sign-in. Enable it in Supabase Dashboard → Authentication → Providers first.`,
        ),
      );
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <BrandLogo size={48} />
      <h1 className="mt-4 font-display text-[26px] text-ink">
        Nexus<span className="text-brand">.</span>
      </h1>
      <p className="mt-1 text-[13.5px] text-ink-soft">
        Sign in with your account. Your email proves ownership.
      </p>
      <div className="mt-6 space-y-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => oauth(p.id)}
            disabled={busy !== null}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:border-brand disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {busy === p.id ? "Redirecting…" : p.label}
          </button>
        ))}
      </div>
      {status && <p className="mt-3 text-[13px] text-event">{status}</p>}
      <p className="mt-6 text-[11.5px] text-ink-faint">
        Allowed domains: {allowedDomainsLabel()}.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
