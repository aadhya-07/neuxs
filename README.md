<div align="center">

# 🎓 NEXUS — Campus OS

### WhatsApp groups are dead. Nexus is your campus super-app.

One verified feed for **Lost & Found** · **Marketplace** · **Doubts** · **Referrals** · **Events**

<br/>

![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_17-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4.3-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

*Built for one college. Loved by every student in it.*

[✨ Features](#-features--the-5-modules) · [🚀 Quickstart](#-quickstart--run-it-in-5-minutes) · [🏗️ Architecture](#️-architecture) · [🎨 Design](#-design-system) · [🤝 Contributing](#-contributing)

</div>

---

## 💡 What is Nexus?

Every college runs on **15–20+ chaotic WhatsApp groups** — lost wallets, second-hand cycles, doubt threads, referral forwards, event posters. All of it scrolls away in hours.

**Nexus replaces all of that with one clean, verified, searchable home feed.**

> A student loses a wallet → posts in Nexus → fuzzy search surfaces a matching "found wallet" post → claims it → post marked resolved.
>
> A senior has a referral slot → posts with a deadline → juniors apply in one tap → poster sees applicant count.
>
> A club announces a fest → posts as the club → students RSVP → get reminders → find it on the calendar.

No noise. No strangers. No scams. **Every post is tied to a verified student.**

### Why it's different from WhatsApp

| WhatsApp groups | Nexus ✅ |
|---|---|
| No search — posts vanish | 🔍 Full-text + fuzzy search across all 5 modules |
| No history — "is it still available?" | 🏷️ Statuses: open / claimed / sold / resolved / closed |
| Anyone can post — spam & scams | ✅ Verified identity + blue check everywhere |
| One noisy thread for everything | 🗂️ 5 modules, one feed, filter pills |
| Chronological only | 📈 Smart ranking: recency + engagement + karma |
| Refresh to see anything new | ⚡ Real-time posts, votes, RSVPs, chat |

---

## ✨ Features — The 5 Modules

All five live in **one unified feed** (`/`). Filter with tabs: `All / Lost & Found / Marketplace / Doubts / Referrals / Events`. Search works across everything at once.

### 🟧 1. Lost & Found
> *Never lose anything twice.*

- Post **lost** or **found** items with description, photo, location
- **Smart matching** — a "lost wallet" composer auto-suggests similar "found wallet" posts via trigram similarity
- Statuses: `open` → `claimed / resolved`
- Resolved posts stay searchable (reference) but drop out of active browsing

### 🟩 2. Marketplace
> *OLX, but only your campus — and you actually trust the seller.*

- Listings with title, price, category (books / electronics / cycles…), up to 4 images
- Filter by category, price range, keyword
- **Real-time buyer ↔ seller chat** (Supabase Realtime, optimistic UI)
- `available` → `sold` — sold items are greyed out, never deleted

### 🟪 3. Doubt Board
> *Ask anything. Anonymously. Get the best answer first.*

- Post questions **anonymously** (platform still knows you for moderation — others don't)
- Answers + **upvotes** — best answer floats to the top, not just the newest
- Karma rewards helpful answers (+10)

### 🟦 4. Referrals & Opportunities
> *Internships and referrals, without the forward-chain.*

- Only verified students can post *and* apply
- Deadlines enforced (`deadline > now`), auto-closes after expiry
- Live **applicant counts** so everyone gauges competition
- Poster sees exactly who applied

### 🩷 5. Events & Club Hub
> *Every fest, hackathon and meetup — in one calendar.*

- **Clubs post as clubs** (verified club badge, not a personal account)
- One-tap **RSVP** with live counts
- **Calendar view** (`/event/calendar`) + feed view
- **Reminders** for RSVP'd users (Resend email + Web Push, 24h / 1h before)

### Cross-cutting superpowers

| Power | How |
|---|---|
| ✅ Verified identity | Google / GitHub OAuth via Supabase + optional `*.ac.in` domain allow-list |
| 🔍 Unified search | Postgres FTS (`tsvector` + `pg_trgm`) on `posts.search_vector` |
| 📈 Ranked feed | SQL view `feed_ranked` — freshness decay + log(engagement) + type boost + karma |
| ⚡ Real-time | Posts, votes, RSVPs, chat — no refresh needed |
| 🛡️ Moderation | Reports queue (`/moderation`), dismiss / delete / karma −20 |
| 🌟 Karma | Visible reputation: helpful +10, return +15, abuse −20 |
| 🌙 Theming | Light / dark / custom colors + wallpaper, no flash on reload |
| 📱 PWA | Installable (`manifest.json`), responsive 3-col → 1-col + FAB |

---

## 🎨 Design System

> *A clean modern noticeboard — not a dashboard template.*

**Color = identity.** Each module owns exactly one color, used only for its tag + card accent:

| Module | Color | Hex | Preview |
|---|---|---|---|
| Lost & Found | Orange | `#E98A1E` | 🟧 |
| Marketplace | Green | `#17A673` | 🟩 |
| Doubts | Purple | `#7C5CF0` | 🟪 |
| Referrals | Blue | `#2F80F0` | 🟦 |
| Events | Pink | `#E23F8E` | 🩷 |
| Brand / Verified | Royal blue | `#2F5CF3` | 🔵 |

Base: canvas `#F6F7F9` · card `#FFFFFF` · ink `#14171F` · border `#E7E9EE` (dark mode: `#0F1115` / `#171A21` / `#EEF0F4`).

**Type:** `Archivo Black` for headlines + post titles · `Inter` for everything else.

**Cards:** white, 1px border, 3px colored left accent, 12px radius, one soft shadow. **Only motion:** lift 2px on hover. No load animations. Ever.

**Layout:**

```
>1100px  ┌────────┬──────────────────┬──────────┐
          │ 240px  │  feed (2-col)    │ 280px    │
          │ sidebar│  cards           │ trending │
860-1100  ┌────────┬──────────────────┐  (rail hides)
<860px    ┌──────────────────────────┐
          │ topbar + pills (scroll)  │  +  FAB (+)
          │ feed (1-col)             │
```

Full spec → [`design.md`](./design.md)

---

## 🏗️ Architecture

**Monolith + BaaS.** Next.js is the only deployable. Supabase is the only backend. Zero DevOps.

```
┌──────────────────────────────────────────────────┐
│  Vercel — Next.js 16 App Router (TS strict)      │
│   Server Components + Server Actions             │
│   Client Components (realtime, chat, filters)    │
│   proxy.ts (auth refresh + route guard)          │
└──────────────┬───────────────────┬───────────────┘
               │ @supabase/ssr     │ Storage CDN
               ▼                   ▼
┌──────────────────────────────────────────────────┐
│  Supabase Cloud (single project, one region)     │
│   Auth (OAuth) + Postgres 17 + Realtime          │
│   Storage (post-images) + pg_cron + Edge Fns     │
└──────────────┬───────────────────────────────────┘
               ▼
   Resend (email)  +  Web Push (VAPID)
```

**Why this stack?** One free-tier BaaS covers auth + relational data + realtime + search + files. No Firebase (weak JOINs/RLS), no separate Socket.io server, no Algolia (overkill for <10k posts). Full rationale → [`TAD.md`](./TAD.md) · Requirements → [`PRD.md`](./PRD.md)

### Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.3 · React 19 · TypeScript 5.9 (strict) |
| Styling | Tailwind CSS 4.3 · shadcn/ui (new-york) · Lucide · next-themes |
| Fonts | Archivo Black + Inter via `next/font` |
| Backend | Supabase — Auth · Postgres 17 · Realtime · Storage · Edge Functions |
| Validation | Zod + React Hook Form |
| Realtime cache | TanStack Query v5 (optimistic upvotes / RSVPs / chat) |
| Search | Postgres FTS + pg_trgm |
| Images | Supabase Storage + `browser-image-compression` (5MB cap, WebP) |
| Dates | date-fns 4 |
| Email / Push | Resend + Web Push (VAPID) |
| Testing | Vitest + Playwright |
| Deploy | Vercel (web) + Supabase Cloud (data) — ~$0/mo at pilot scale |

---

## 🚀 Quickstart — run it in 5 minutes

### Prerequisites

- **Node ≥ 20.9** · **pnpm 9+** (`npm i -g pnpm`)
- A free [Supabase](https://supabase.com) project (or local via Supabase CLI)

### 1. Clone & install

```bash
git clone <your-repo-url> nexus
cd nexus
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Then fill `.env.local` (values from Supabase Dashboard → Project Settings → API):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # server only, never NEXT_PUBLIC_

RESEND_API_KEY=re_...                   # optional until reminders needed
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...        # optional until push needed
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@college.ac.in

# Empty = allow any email (pilot mode).
# Campus-only: NEXT_PUBLIC_ALLOWED_DOMAINS=*.ac.in
NEXT_PUBLIC_ALLOWED_DOMAINS=
```


### 3. Set up the database

Push the 14 versioned migrations (in order — auth → posts → engagement → clubs → polish):

```bash
# via Supabase CLI (recommended)
supabase link --project-ref xyz
supabase db push

# ...or paste each file from supabase/migrations/ into
# Supabase Dashboard → SQL Editor, in filename order
```

Migrations: `0001_init` → `0002_profiles_trigger` → `0003_post_owner_mutations` → `0004_open_email_policy` → `0005_oauth_profile_metadata` → `0006_engagement_rls` → `0007_realtime_messages` → `0008_calendar_indexes` → `0009_avatars_storage` → `0010_profile_provider` → `0011_profile_bio_links` → `0012_club_governance` → `0013_post_images_offers` → `0014_wallpaper_sync`

Also in Supabase Dashboard:
1. **Auth → Providers** → enable Google (and/or GitHub), set redirect to `<origin>/auth/callback`
2. **Storage** → bucket `post-images` is created by migration — set public read

### 4. Run it

```bash
pnpm dev        # → http://localhost:3000
pnpm typecheck  # tsc --noEmit
pnpm lint
pnpm build && pnpm start   # production check
```

### First login

1. Open `http://localhost:3000` → redirected to `/login`
2. **Continue with Google** → approve → `/auth/callback` creates your `profiles` row
3. Post something! Seed data: run `lib/seed.ts` logic or manually create 5–10 posts to feel the feed.

---

## 📁 Project structure

```
nexus/
├── app/                      # Next.js App Router — one folder per route
│   ├── page.tsx              # → unified campus feed (/)
│   ├── login/  auth/         # → OAuth + callback + error
│   ├── clubs/[slug]/         # → club pages          marketplace/[id]/chat/
│   ├── doubt/  event/  post/[id]/  u/[handle]/  profile/  search/  chats/
│   ├── my/ (questions/requests/rsvps)  moderation/  new/  referral/
│   ├── layout.tsx            # fonts + themes + no-flash paint script
│   └── globals.css           # Tailwind v4 @theme tokens (design.md)
├── components/               # PostCard, FeedPage, ModuleTag, VerifiedCheck,
│                             # FilterPills, PostComposer, TrendingRail,
│                             # ChatPanel, CalendarMonth, ui/button… (~40)
├── lib/                      # Server Actions + Supabase clients
│   ├── supabase/ (client, server)  feed, auth, clubs, engagement,
│   └── profile, visit, wallpaper, types, utils, constants, seed
├── supabase/migrations/      # 14 versioned SQL migrations (source of truth)
├── public/                   # nexus-logo.png, icon.svg, manifest.json (PWA)
├── proxy.ts                  # session refresh + route guard (Next 16)
├── PRD.md  TAD.md  design.md # product / architecture / design specs
└── .env.example              # safe template (copy → .env.local)
```

---

## 🔐 Auth & roles

```
Click "Continue with Google" → signInWithOAuth → provider approves
  → /auth/callback?code=… → exchangeCodeForSession
  → trigger creates profiles row (name/avatar from OAuth)
  → proxy.ts refreshes session on every request
```

- **Students** — verified on first OAuth sign-in. Disallowed domains bounce to `/login?error=domain-not-allowed` when `NEXT_PUBLIC_ALLOWED_DOMAINS` is set.
- **Clubs** — manual allow-list: admin creates `clubs` + `club_managers` row → manager posts *as the club* (club avatar + pink tag + "Verified Club").
- **Moderators** — `profiles.is_moderator` → access `/moderation` → dismiss / delete / karma −20. All logged in `karma_events`.
- **Doubt anonymity** — DB knows `author_id`, UI shows "Anonymous • Verified ✓". RLS view `posts_public` hides authors for `type=doubt`.

---

## 🧪 Scripts

| Command | What |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` | ESLint (next config) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (ranking / search fns) |
| `pnpm test:e2e` | Playwright (signup → post → RSVP → chat) |

---

## ☁️ Deploy

- **Web → Vercel:** import repo → add the same env vars → deploy. Preview URL per PR.
- **Data → Supabase Cloud:** `supabase db push` promotes migrations. Point Vercel preview at staging project for safe testing.
- **Cost at pilot (100 users, ~500 posts):** Vercel Hobby $0 + Supabase Free $0 + Resend Free $0 = **$0/mo**. Paid path only when storage/MAU exceed free tier.

---

## 🗺️ Roadmap

- [x] Auth + profiles + verified feed + 5 modules + search + ranking
- [x] Images + statuses + chat + RSVP + calendar + karma + moderation
- [ ] Seed script (50 posts) for launch week + resolution-rate analytics
- [ ] Event reminders (pg_cron → Edge Function → Resend + Push)
- [ ] Multi-college (`colleges` + `college_id` RLS) — no frontend rewrite needed
- [ ] Typesense when posts > 50k / search p95 > 300ms

Open questions we're still debating → [`PRD.md` §10](./PRD.md)

---

## 🤝 Contributing

Grassroots project — PRs welcome!

1. Fork → branch (`feat/doubt-sorting`, `fix/chat-scroll`…)
2. `pnpm install && pnpm dev` — keep `design.md` rules (no 6th color, no new fonts, no load animations)
3. `pnpm lint && pnpm typecheck && pnpm test` must pass
4. PR with screenshot (light + dark) for UI changes

---

## 📜 License & credits

Pilot project for a single college. License TBD — ask before reusing club/student data flows.

Built with Next.js, Supabase, Tailwind and a healthy hatred of WhatsApp forwards. 💙

<div align="center">
<br/>

**⭐ Star this repo if your campus needs it. ⭐**

*Questions? Open an issue — or find us on Nexus itself.*

</div>
