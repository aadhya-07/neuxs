import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("localhost:54321") || key.includes("placeholder")) {
    throw new Error(
      "Supabase is not configured. Create a `.env.local` file in the project root with " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from your Supabase " +
        "dashboard (Project Settings → API), then restart `pnpm dev`. " +
        "Note: `.env.example` is only a template and is never loaded.",
    );
  }
  return createBrowserClient(url, key);
}
