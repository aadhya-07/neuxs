# Graph Report - NEXUS  (2026-10-11)

## Corpus Check
- 112 files · ~45,944 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 1, .ico 1, .css 1)

## Summary
- 570 nodes · 1468 edges · 26 communities (22 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- actions.ts
- engagement.ts
- cn
- AppShell
- appearance-panel.tsx
- next
- profile.ts
- package.json
- compilerOptions
- dependencies
- PRD — Nexus (Campus OS)
- TAD — Nexus (Campus OS)
- layout.tsx
- devDependencies
- Nexus — UI design system
- validation.ts
- manifest.json
- scripts
- mcp
- eslint.config.mjs
- README.md
- .opencode/opencode.json
- AGENTS.md
- postcss.config.mjs
- createClient

## God Nodes (most connected - your core abstractions)
1. `AppShell()` - 53 edges
2. `next` - 52 edges
3. `createClient()` - 46 edges
4. `cn()` - 44 edges
5. `Feed()` - 34 edges
6. `createClient()` - 27 edges
7. `lucide-react` - 27 edges
8. `react` - 27 edges
9. `AppearancePanel()` - 25 edges
10. `getFeed()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `10. Build order (maps to PRD §8 metrics)` --references--> `PostCard()`  [INFERRED]
  TAD.md → components/post-card.tsx
- `5. Frontend — maps 1:1 to `design.md`` --references--> `CalendarMonth()`  [INFERRED]
  TAD.md → components/calendar-month.tsx
- `5. Frontend — maps 1:1 to `design.md`` --references--> `VerifiedCheck()`  [INFERRED]
  TAD.md → components/verified-check.tsx
- `5. Frontend — maps 1:1 to `design.md`` --references--> `FilterPills()`  [INFERRED]
  TAD.md → components/filter-pills.tsx
- `5. Frontend — maps 1:1 to `design.md`` --references--> `ModuleTag()`  [INFERRED]
  TAD.md → components/module-tag.tsx

## Import Cycles
- None detected.

## Communities (26 total, 4 thin omitted)

### Community 0 - "actions.ts"
Cohesion: 0.06
Nodes (51): ModerationPage(), AnswersPanel(), submit(), vote(), ApplyPanel(), apply(), ClubCreateForm(), submit() (+43 more)

### Community 1 - "engagement.ts"
Cohesion: 0.11
Nodes (38): ChatsPage(), ClubPage(), PostPage(), ConfirmedDeal(), QUICK, PostActions(), VerifiedCheck(), ClubDTO (+30 more)

### Community 2 - "cn"
Cohesion: 0.09
Nodes (40): BottomNav(), TABS, activeClass, Dot(), FilterPills(), ModuleTag(), tintClass, accentClass (+32 more)

### Community 3 - "AppShell"
Cohesion: 0.09
Nodes (43): ClubNotFound(), DoubtPage(), EventPage(), Loading(), LostFoundPage(), MarketplacePage(), MyQuestionsPage(), MyRequestsPage() (+35 more)

### Community 5 - "appearance-panel.tsx"
Cohesion: 0.11
Nodes (37): AppearancePanel(), applyPreview(), pickWallpaper(), removeWallpaper(), syncNow(), updateCustom(), useSynced(), COLOR_FIELDS (+29 more)

### Community 6 - "next"
Cohesion: 0.18
Nodes (10): CalendarPage(), monthBounds(), CalendarDay, CalendarDayPost, CalendarMonth(), getCalendarItems(), seedCalendarItems(), nextConfig (+2 more)

### Community 7 - "profile.ts"
Cohesion: 0.19
Nodes (22): ProfilePage(), UserPage(), hostOf(), ProfileAbout(), mapRow(), attachCounts(), fetchProfileRow(), getAnswerCount() (+14 more)

### Community 8 - "package.json"
Cohesion: 0.10
Nodes (20): name, packageManager, private, version, babel-plugin-react-compiler, class-variance-authority, date-fns-tz, @hookform/resolvers (+12 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, browser-image-compression, class-variance-authority, date-fns, date-fns-tz, @hookform/resolvers, lucide-react, next (+12 more)

### Community 11 - "PRD — Nexus (Campus OS)"
Cohesion: 0.12
Nodes (16): 10. Open questions, 1. Summary, 2. Problem statement, 3. Goals, 4. Non-goals (out of scope for v1), 5. Target users, 6.1 Lost & Found, 6.2 Marketplace (buy/sell) (+8 more)

### Community 12 - "TAD — Nexus (Campus OS)"
Cohesion: 0.09
Nodes (20): GET(), safeNext(), config, proxy(), PUBLIC_PATHS, @supabase/ssr, @supabase/supabase-js, 10. Build order (maps to PRD §8 metrics) (+12 more)

### Community 13 - "layout.tsx"
Cohesion: 0.16
Nodes (11): archivoBlack, caveat, editorial, inter, metadata, RootLayout(), round, viewport (+3 more)

### Community 14 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, babel-plugin-react-compiler, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node, @types/react (+3 more)

### Community 15 - "Nexus — UI design system"
Cohesion: 0.20
Nodes (9): Color palette, Components, Concept, Layout, Module colors, Motion, Nexus — UI design system, Typography (+1 more)

### Community 16 - "validation.ts"
Cohesion: 0.20
Nodes (9): doubtSchema, eventSchema, lostFoundSchema, marketplaceSchema, postBaseSchema, PostInput, postSchema, referralSchema (+1 more)

### Community 17 - "manifest.json"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 18 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, start, test, test:e2e, typecheck

### Community 19 - "mcp"
Cohesion: 0.14
Nodes (13): type, url, mcp, context7, playwright, shadcn, command, enabled (+5 more)

### Community 20 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 21 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 26 - "createClient"
Cohesion: 0.07
Nodes (47): GET(), safeNext(), LoginForm(), oauth(), LoginPage(), Provider, PROVIDERS, ListingChatPage() (+39 more)

## Knowledge Gaps
- **194 isolated node(s):** `$schema`, `plugin`, `archivoBlack`, `inter`, `caveat` (+189 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 210 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `actions.ts`, `engagement.ts`, `cn`, `AppShell`, `profile.ts`, `package.json`, `TAD — Nexus (Campus OS)`, `layout.tsx`, `createClient`?**
  _High betweenness centrality (0.189) - this node is a cross-community bridge._
- **What connects `$schema`, `plugin`, `archivoBlack` to the rest of the system?**
  _194 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.061507936507936505 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `engagement.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11378353376503238 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `cn` to `actions.ts`, `AppShell`, `appearance-panel.tsx`, `next`, `createClient`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.09225589225589226 - nodes in this community are weakly interconnected._