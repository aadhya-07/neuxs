import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAllowedEmail } from "@/lib/auth";

// OAuth callback: Supabase redirects here with ?code=…&next=… after the
// provider (Google/GitHub) approves. exchangeCodeForSession (PKCE code flow —
// correct here; verifyOtp/token_hash is for email links only) establishes the
// session. NOTE: any non-localhost domain must be allow-listed in Supabase
// Dashboard → Authentication → URL Configuration → Redirect URLs.
function safeNext(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const success = NextResponse.redirect(
      new URL(safeNext(searchParams.get("next")), request.url),
    );
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              success.cookies.set(name, value, options),
            );
          },
        },
      },
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Enforce the email-domain allow-list post-login (we can't pre-check
      // with OAuth — the email is only known after the provider approves).
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email && !isAllowedEmail(user.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(
          new URL("/login?error=domain-not-allowed", request.url),
        );
      }
      // Stamp the OAuth provider on the profile so public pages can show
      // "via Google / GitHub" (self-heals rows the 0010 backfill missed).
      // Fire-and-forget: a sync failure must never block login.
      try {
        const provider = (user?.app_metadata as { provider?: string } | undefined)?.provider;
        if (user && (provider === "google" || provider === "github" || provider === "email")) {
          await supabase.from("profiles").update({ provider }).eq("id", user.id);
        }
      } catch {
        // ignore — profile still loads, provider stays as-is
      }
      return success;
    }
  }

  return NextResponse.redirect(new URL("/auth/error", request.url));
}
