// Email domain policy — who may sign in.
//
// NEXT_PUBLIC_ALLOWED_DOMAINS = comma-separated allow-list, e.g.
//   "gmail.com,outlook.com"      exact domains
//   "*.ac.in"                    wildcard (matches apex + any subdomain)
//   "gmail.com,outlook.com,*.ac.in"
// Unset or empty = allow any domain (email ownership is still proven by OTP).
//
// To re-tighten to campus-only later, set NEXT_PUBLIC_ALLOWED_DOMAINS=*.ac.in
// and restart the server. No code or DB change needed.

function getAllowedDomains(): string[] {
  const raw = process.env.NEXT_PUBLIC_ALLOWED_DOMAINS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string): boolean {
  const allowed = getAllowedDomains();
  if (allowed.length === 0) return true;
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  if (!domain || !domain.includes(".")) return false;
  return allowed.some((rule) => {
    const suffix = rule.startsWith("*.") ? rule.slice(2) : rule;
    return domain === suffix || domain.endsWith(`.${suffix}`);
  });
}

export function allowedDomainsLabel(): string {
  const allowed = getAllowedDomains();
  return allowed.length > 0 ? allowed.join(", ") : "any email domain";
}

// Supabase sometimes rejects with an empty/useless body (rendered as "{}").
// Normalize any thrown value into a human-readable message.
const USELESS_MESSAGES = new Set([
  "",
  "{}",
  "[]",
  "null",
  "undefined",
  "[object object]",
]);

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many") || m.includes("429"))
    return "Too many codes sent — Supabase throttles OTP email and the quota resets hourly. Wait a while, check spam, then retry. For production limits, connect custom SMTP (Resend) in Supabase Dashboard → Authentication → SMTP.";
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("load failed"))
    return "Network error — check your connection and retry.";
  if (m.includes("provider") && (m.includes("not enabled") || m.includes("disabled") || m.includes("unsupported")))
    return "That sign-in provider isn't enabled. In Supabase Dashboard → Authentication → Providers, enable it and add your OAuth client ID/secret.";
  if (m.includes("smtp") || m.includes("sending") || m.includes("mail"))
    return "Email failed to send. In Supabase Dashboard → Authentication, make sure Email OTP is enabled (custom SMTP via Resend recommended).";
  if (m.includes("expired") || m.includes("invalid token") || m.includes("invalid code"))
    return "That code is invalid or expired. Request a fresh one and try again.";
  return message;
}

export function authErrorMessage(raw: unknown, fallback?: string): string {
  const def =
    fallback ?? "Something went wrong. Check your connection and retry.";
  let msg = "";
  if (raw instanceof Error) msg = raw.message ?? "";
  else if (typeof raw === "string") msg = raw;
  msg = msg.trim();
  if (!msg || USELESS_MESSAGES.has(msg.toLowerCase())) {
    console.error("[auth] non-descriptive error:", raw);
    return def;
  }
  return friendlyAuthError(msg);
}
