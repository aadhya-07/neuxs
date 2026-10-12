<div align="center">

# 🛠️ Supabase Setup Guide — Nexus Campus OS

### From empty project → working auth + database + storage + realtime

*Follow top to bottom. ~30 minutes. No step is optional unless marked.*

</div>

---

## 🗺️ What Supabase does for Nexus

| Need | Supabase service | Where in code |
|---|---|---|
| Login (Google / GitHub) | **Auth** | `app/login/page.tsx` → `app/auth/callback/route.ts` |
| Email-link fallback | **Auth (Email OTP)** | `app/auth/confirm/route.ts` |
| All data (posts, clubs, chat…) | **Postgres 17** | `supabase/migrations/0001–0014` |
| Auto-create profile on signup | **DB trigger** `handle_new_user()` | migrations `0002`, `0004`, `0005` |
| Who can see / edit what | **Row Level Security (RLS)** | migrations `0003`, `0006`, `0012` |
| Avatars + post photos | **Storage** (`avatars`, `post-images`) | migrations `0009`, `0013`, `0014` |
| Live chat + live feed | **Realtime** | migration `0007` |
| Session on every page | **@supabase/ssr + proxy.ts** | `lib/supabase/*`, `proxy.ts` |

> **Mental model:** Next.js is the waiter, Supabase is the kitchen. The waiter never touches food directly — every read/write goes through Supabase with the user's session cookie.

---

## Part 0 — Create the project (5 min)

- [ ] 1. Go to [supabase.com](https://supabase.com) → **New project**
- [ ] 2. Name: `nexus` · pick region **closest to your college** (e.g. Mumbai `ap-south-1` for India) · set a strong DB password (save it!)
- [ ] 3. Wait ~2 min for provisioning → open the project
- [ ] 4. Go to **Project Settings → API** and copy these three values (you'll need them in Part 1):

```
Project URL          → NEXT_PUBLIC_SUPABASE_URL
anon / publishable   → NEXT_PUBLIC_SUPABASE_ANON_KEY
service_role (secret)→ SUPABASE_SERVICE_ROLE_KEY   ⚠️ server only!
```

> `anon` key is safe in the browser (RLS protects data). `service_role` **bypasses RLS** — never prefix it with `NEXT_PUBLIC_`, never commit it.

---

## Part 1 — Wire up `.env.local` (3 min)

- [ ] 1. In project root:
```bash
cp .env.example .env.local
```
- [ ] 2. Fill `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # from API settings, secret!

# Pilot mode: leave empty to allow ANY email (gmail, outlook…)
NEXT_PUBLIC_ALLOWED_DOMAINS=

# Campus-only later: uncomment this, restart server — no code change needed
# NEXT_PUBLIC_ALLOWED_DOMAINS=*.ac.in
```

- [ ] 3. Restart dev server: `pnpm dev`
- [ ] 4. Sanity check: open `http://localhost:3000` — if envs are missing, `lib/supabase/client.ts` throws a friendly error telling you exactly what's wrong.

> ✅ `.env.example` is committed. `.env.local` is git-ignored and **never** pushed.

---

## Part 2 — Auth setup (10 min)

Nexus uses **OAuth first** (Google / GitHub). Email-link (`verifyOtp`) exists as fallback via `/auth/confirm`.

### 2A. Redirect URLs (do this FIRST — most common bug)

Supabase **rejects any callback domain you don't allow-list**. Your app redirects to `<origin>/auth/callback?next=/` after the provider approves (see `app/login/page.tsx:35` and `app/auth/callback/route.ts`).

- [ ] 1. Dashboard → **Authentication → URL Configuration**
- [ ] 2. **Site URL:** `http://localhost:3000` (local) — later your Vercel URL
- [ ] 3. **Redirect URLs → Add:**
```
http://localhost:3000/auth/callback
http://localhost:3000/auth/confirm
https://<your-vercel-app>.vercel.app/auth/callback
https://<your-vercel-app>.vercel.app/auth/confirm
```

> Missing entry = `redirect_uri_mismatch` or bounce to `/auth/error`. If login fails, check this list first.

### 2B. Enable Google

- [ ] 1. **Authentication → Providers → Google → Enable**
- [ ] 2. Google Cloud Console → APIs & Services → Credentials → **OAuth client ID** (Web):
  - Authorized JS origin: `https://xyzcompany.supabase.co`
  - Authorized redirect URI: `https://xyzcompany.supabase.co/auth/v1/callback`
- [ ] 3. Paste **Client ID + Client Secret** into Supabase → Save

### 2C. Enable GitHub (optional but recommended)

- [ ] 1. GitHub → Settings → Developer settings → **New OAuth App**:
  - Homepage: `http://localhost:3000`
  - Callback: `https://xyzcompany.supabase.co/auth/v1/callback`
- [ ] 2. Paste Client ID + Secret into Supabase → **Providers → GitHub → Enable**

### 2D. Email OTP (fallback + magic links)

- [ ] 1. **Authentication → Providers → Email → Enable** (Confirm signup ON for pilot)
- [ ] 2. **Authentication → Email Templates** → set `{{ .RedirectTo }}` links to point at `/auth/confirm` (that's the `verifyOtp` handler — **not** `/auth/callback`, which is OAuth-only via `exchangeCodeForSession`)
- [ ] 3. Pilot can stay on Supabase's built-in SMTP. Before launch, add custom SMTP to avoid spam filters on `*.ac.in`:
  - **Authentication → SMTP → Custom SMTP** → host `smtp.resend.com`, user `resend`, password = `RESEND_API_KEY`

### 2E. How login actually flows (read once)

```
[Login page]  Continue with Google
      │  signInWithOAuth({ redirectTo: <origin>/auth/callback?next=/ })
      ▼
[Google approves] → Supabase → redirects to /auth/callback?code=…
      │  exchangeCodeForSession(code)  ← OAuth only!
      │  isAllowedEmail(user.email)?  ← NEXT_PUBLIC_ALLOWED_DOMAINS check
      │     ✗ → signOut → /login?error=domain-not-allowed
      │     ✓ → stamp profiles.provider → redirect next (/)
      ▼
[Feed]  proxy.ts refreshes session on every request via @supabase/ssr
        signed out → /login · /moderation without claim → /
```

> Email-link flow is parallel: click link → `/auth/confirm?token_hash=…&type=…` → `verifyOtp()` → same session. Never swap the two functions — `exchangeCodeForSession` is OAuth-only, `verifyOtp` is email-only (both route files have this warning in comments).

---

## Part 3 — Database migrations (10 min)

All schema lives in `supabase/migrations/` — **14 files, must run in order**. Never edit an old migration after it's pushed; always add a new one.

### Option A — Supabase CLI (recommended)

```bash
npm i -g supabase          # CLI 2.x
supabase login
supabase link --project-ref xyzcompany   # from Project Settings → General
supabase db push           # pushes 0001 → 0014 in order
```

### Option B — Dashboard SQL Editor (no CLI)

1. Dashboard → **SQL Editor → New query**
2. Paste each file **in filename order**, Run, confirm success, next file.

### What each migration does

| # | File | What it creates / why |
|---|---|---|
| 0001 | `init` | Extensions (`pg_trgm`, `pgcrypto`) · enums (`post_type`, `post_status`) · `allowed_domains` · `profiles` · `clubs` + `club_managers` · **`posts`** (single table for all 5 modules) |
| 0002 | `profiles_trigger` | `handle_new_user()` trigger — auto-creates `profiles` row on every signup (bypasses RLS as `security definer`) + self-service policies |
| 0003 | `post_owner_mutations` | Authors can update own posts (`open` → `claimed/sold/resolved/closed`) |
| 0004 | `open_email_policy` | **Pilot policy:** any email that completes signup = verified (`is_verified=true`). Domain gating moves to app config, not DB |
| 0005 | `oauth_profile_metadata` | Pulls `full_name` + `avatar_url` from Google/GitHub metadata instead of email-derived handle |
| 0006 | `engagement_rls` | Opens RLS for `answers`, `votes`, `applications`, `rsvps`, `conversations`, `messages`, `reports`, `karma_events` (0001 created them default-deny) |
| 0007 | `realtime_messages` | Adds tables to `supabase_realtime` publication — **without this, chat sends but live incoming never arrives** |
| 0008 | `calendar_indexes` | Indexes on `starts_at` (events) + `deadline_at` (referrals) |
| 0009 | `avatars_storage` | Bucket `avatars` (public read, 100KB JPG, `{userId}/avatar.jpg`) + owner-only write policies |
| 0010 | `profile_provider` | Column `profiles.provider` (`google`/`github`/`email`) — public pages show "via Google" without reading `auth.users` |
| 0011 | `profile_bio_links` | Columns `bio` + `links` (JSON, max 6, validated in Server Action) |
| 0012 | `club_governance` | Locks down `clubs`/`club_managers` RLS + lets managers mutate their club's event posts |
| 0013 | `post_images_offers` | Bucket `post-images` (5MB, jpg/png/webp) + marketplace **offers** table (Offer → Counter → Deal) |
| 0014 | `wallpaper_sync` | Bucket `wallpapers` + opt-in cross-device wallpaper copy (`{userId}/wallpaper.jpg`) |

Verify after push: **Database → Tables** should show `profiles, clubs, club_managers, posts, answers, votes, applications, rsvps, conversations, messages, reports, karma_events, allowed_domains` (+ `offers` if 0013 adds it).

---

## Part 4 — Storage check (2 min)

Migrations create the buckets — you just verify:

- [ ] Dashboard → **Storage** → you see `avatars`, `post-images` (and `wallpapers`)
- [ ] Each bucket: **Public = ON** (images are served via CDN `?width=800&quality=75`)
- [ ] **Policies** tab:
  - `SELECT` → `public` (anyone can view)
  - `INSERT/UPDATE/DELETE` → `authenticated` + `auth.uid()::text = foldername(name)[1]` (users only touch their own folder)
- [ ] Upload a test avatar: app → Profile → upload → file appears as `<uuid>/avatar.jpg`

> "Upload works but image 403s" = bucket not public. "Upload rejected" = wrong MIME/size (avatars: JPG ≤100KB, posts: jpg/png/webp ≤5MB — client compresses first via `browser-image-compression`).

---

## Part 5 — Realtime check (1 min)

- [ ] Dashboard → **Database → Replication** → `supabase_realtime` publication includes `posts`, `messages` (and votes/RSVPs if your 0007 covers them)
- [ ] Test: open feed in **two browsers** → post in one → appears in other without refresh. Same for chat (`messages:conversation_id=eq.X` channel, buyer+seller only via RLS).

---

## Part 6 — RLS mental model (read once)

- Every table has **RLS ON**. No policy = **deny** (that's why 0006 exists).
- `posts` SELECT: any verified user. INSERT: must be verified. UPDATE: owner (or club manager for club events) — 0003 + 0012.
- `messages` SELECT: only buyer/seller of that conversation.
- Doubt anonymity: app queries view `posts_public` which **omits `author_id`** when `type=doubt` and caller isn't a moderator. UI shows "Anonymous • Verified ✓".
- `service_role` bypasses all of this — only Edge Functions (karma, reminders, domain checks) may use it.

---

## Part 7 — App wiring checklist

| File | Role | Breaks if… |
|---|---|---|
| `lib/supabase/client.ts` | Browser client (`createBrowserClient`) | envs missing → throws with fix instructions |
| `lib/supabase/server.ts` | Server client (reads/writes cookies) | — |
| `proxy.ts` | Refreshes session every request; guards routes | deleted → logged-out users see feed; `/moderation` open to all |
| `app/login/page.tsx` | OAuth buttons → `signInWithOAuth` | provider not enabled in dashboard → "provider not enabled" error |
| `app/auth/callback/route.ts` | OAuth code exchange + domain allow-list + provider stamp | redirect URL not allow-listed → `/auth/error` |
| `app/auth/confirm/route.ts` | Email-link `verifyOtp` | email template points at wrong path → link dies |
| `lib/auth.ts` | `isAllowedEmail()` — `*.ac.in` wildcards, `gmail.com` exact | `NEXT_PUBLIC_ALLOWED_DOMAINS` typo → everyone blocked or everyone allowed |

---

## Part 8 — End-to-end test (do this now)

- [ ] 1. `pnpm dev` → `/login` → **Continue with Google** → approve → land on `/` (not `/auth/error`)
- [ ] 2. Dashboard → **Authentication → Users** → your user exists · **Table Editor → profiles** → row with same `id`, `is_verified=true`, `handle` derived from email
- [ ] 3. Create one post of each type (lost, marketplace, doubt, referral, event) → all appear in feed + correct filter tab
- [ ] 4. Upvote a doubt answer + RSVP an event → counts increment live in second browser
- [ ] 5. Marketplace: buyer messages seller → both see messages realtime
- [ ] 6. Domain gate: set `NEXT_PUBLIC_ALLOWED_DOMAINS=nomatch.test`, restart, try a gmail login → bounced to `/login?error=domain-not-allowed`. Set back to empty, restart.
- [ ] 7. Storage: upload avatar + post image → both render via CDN URL

All green? **Supabase is done.** 🎉

---

## Part 9 — Troubleshooting (most common first)

| Symptom | Cause → Fix |
|---|---|
| `redirect_uri_mismatch` / lands on `/auth/error` | Redirect URL not allow-listed → Part 2A, add **both** `/auth/callback` and `/auth/confirm` for localhost + Vercel |
| "provider not enabled" on login | Google/GitHub toggled off or missing client secret → Part 2B/2C |
| Login loops back to `/login` | `proxy.ts` can't read session (envs wrong) or cookies blocked (incognito/third-party) → check `.env.local`, try normal window |
| New user has no `profiles` row | Trigger missing → re-run 0002/0004/0005; check **Database → Triggers** on `auth.users` |
| `new row violates RLS` on post/vote/RSVP | Migrations out of order or 0006 not run → `supabase db push` again; check policies in Table Editor |
| Chat sends but other side never receives | 0007 not applied → check Replication publication |
| OTP "rate limit / 429" | Supabase throttles free-tier email hourly → wait, check spam, add Resend SMTP (Part 2D) |
| Images 403 / upload rejected | Bucket not public / wrong MIME/size → Part 4 |
| `NEXT_PUBLIC_ALLOWED_DOMAINS` seems ignored | Forgot server restart after editing `.env.local` → restart `pnpm dev` |

---

## Part 10 — Going live (Vercel + prod Supabase)

- [ ] 1. Vercel → import repo → **Environment Variables** → copy all of `.env.local` (use prod Supabase URL/keys)
- [ ] 2. Supabase prod project → repeat Parts 2A (add Vercel URLs), 2B–2D, 3 (`supabase link --project-ref PROD && supabase db push`)
- [ ] 3. Recommended: separate **staging** Supabase project → point Vercel previews at staging, production at prod
- [ ] 4. Turn on **Database → Backups** (daily) + **Auth → SMTP** (Resend) before inviting the campus
- [ ] 5. Make yourself moderator + seed clubs via SQL (see below)

```sql
-- make yourself moderator (replace with your auth user id)
update profiles set is_moderator = true
where id = 'PASTE-YOUR-USER-UUID';

-- seed a club + make yourself its manager
insert into clubs (slug, name, verified)
values ('robotics', 'Robotics Club', true)
returning id;

insert into club_managers (club_id, user_id)
values ('PASTE-CLUB-UUID', 'PASTE-YOUR-USER-UUID');
```

---

*Back to [`README.md`](./README.md) · Specs: [`PRD.md`](./PRD.md) · [`TAD.md`](./TAD.md) · [`design.md`](./design.md)*
