import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Handles emailed sign-in links: Supabase redirects here with
// ?token_hash=…&type=… after the user clicks the link. verifyOtp (not
// exchangeCodeForSession — that's OAuth-only) establishes the session.
// NOTE: emailRedirectTo must point here (see login/verify pages), and any
// non-localhost domain must be allow-listed in Supabase Dashboard →
// Authentication → URL Configuration → Redirect URLs.
function safeNext(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
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
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return success;
  }

  return NextResponse.redirect(new URL("/auth/error", request.url));
}
