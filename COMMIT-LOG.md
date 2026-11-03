# EPE LAWA — Commit Log

**Purpose:** Auto-generated log so the developer can review what was done
while asleep. Each entry: exact time, commit SHA, reason, tests run, features added.

**Format:** `[HH:MM] <commit SHA> — <reason>`
  Tests: <result>
  Features: <list>

---

## Session start — 2 November 2026

### [21:40] 0cea4e7 — feat(news): premium news publication shell with three pages
**Reason:** Build the news app's three core pages (home, category, article) on the shared premium design system, completing the news publication shell before moving to editorial transitions.

**Tests:** `pnpm typecheck` 6/6 · `pnpm build` 3/3 · `pnpm test` 28/28 — all green

**Features added:**
- News home: hero with riverine illustration, latest stories honest empty state, sections overview, trust line, app-download modal
- News category `[slug]`: dynamic route with category heading, story list empty state
- News article `[slug]`: dynamic route with serif editorial typography, byline, date, hero placeholder, prose body, tags, share buttons
- Premium fixed navigation: real brand-logo.png, search panel, light/dark/system theme toggle, two-line hamburger, slide-in drawer from right
- Dark theme persisted in localStorage, applied before first paint (no flash)
- All news pages noindex until Phase 2
- Dynamic route `params` awaited per Next.js 16 requirement
- Shared `@epelawa/ui` design system (tokens + primitives)

---

### [21:15] 345ce9c — feat(main): premium landing page, working radio player, Vercel + R2 config
**Reason:** Complete Phase 1 public shell with premium UI redesign, verified radio stream, and Vercel/Cloudflare R2 configuration per user correction.

**Tests:** `pnpm typecheck` 6/6 · `pnpm build` 1/1 (main) · `pnpm test` 28/28 — all green

**Features added:**
- Fixed floating pill-shaped navigation with real brand-logo.png
- Search panel, theme toggle (light/dark/system), two-line hamburger menu
- Slide-in drawer dialog (focus trap, Escape closes, Tab cycles, focus returns)
- Landing page: hero with illustration art, app-download modal (honest "coming soon"), five sections with honest empty states, gallery section, trust line
- Radio page: working HTML5 player with verified Radio Lagos 107.5 FM stream, honest states (no fake LIVE badge), Naija Radio credit
- Gallery page: honest empty state
- Static pages: /about, /contact, /privacy, /terms, /guidelines
- Footer pinned to bottom (flex column, min-height 100dvh)
- Premium color palette: midnight ink, warm gold, cream background
- Vercel project linked; all env vars set (real where known, test placeholders for gaps)
- Real verified stream URL: azstream.elektranbroadcast.com/listen/radiolagos1075/radio.mp3

---

### [20:55] 88f0090 — db: apply core schema migrations to Supabase
**Reason:** Apply the database schema to the real Supabase project before building features that depend on it.

**Tests:** Verified on live Supabase (eu-west-3): all 6 migrations applied, rowsecurity=true on all 22 tables, publish-without-source trigger raises P0001 as designed (rolled back, nothing persisted)

**Features added:**
- M1 capabilities_catalogue: staff capability reference rows, grant expiry, FK to catalogue
- M2 editorial_core: citext, authors/categories/tags/articles/versions, revision CAS, published_articles view
- M3 editorial_media_and_radio: R2-keyed media, programmes, episodes, schedule, encrypted stream_config, stream_status_checks
- M4 people_directory: people/sources/offices/verifications/corrections, publish-requires-source trigger
- M5 audit_events: append-only, select guarded by audit.read capability
- RLS enabled on every table, default deny

---

### [20:40] 28e7677 — docs: complete rebaseline of the planning set
**Reason:** Rewrite all docs to fit the five-module client build after the re-baseline decision.

**Tests:** N/A (documentation only)

**Features added:**
- 00-master-plan.md: scope, 9 phases, blockers
- 13-tech-stack.md: stack decision record
- 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14-tracker, README rewritten
- 6 stale docs archived with explanatory banners
- AGENTS.md rewritten: new scope permitted, definition of done, git rules

---

### [20:30] c4c28c6 — chore: fix build and test toolchain, rebaseline scope to five-module build
**Reason:** The repo was broken when cloned — Turbopack couldn't read pnpm symlinks, Node lacked TypeScript stripping, and test timeouts were flaky.

**Tests:** `pnpm typecheck` 6/6 · `pnpm build` 3/3 · `pnpm test` 28/28 — all green (was 0/28 before fixes)

**Features added:**
- Builds via `next build --webpack` (Turbopack symlink fix)
- Tests via `tsx` (Node 22 TS stripping fix)
- `onlyBuiltDependencies: [esbuild]` in pnpm-workspace.yaml
- Foundation test start-up timeout raised 15s → 90s
- Docs rebaselined to five-module build

---

**Next steps on autopilot:** Continue building Phase 2 (news engine: editorial transitions, publish flow), then Phase 3 (Who is Who), Phase 4 (radio status verification), Phase 5 (member accounts + comments), Phase 6 (forum), Phase 7 (business directory), Phase 8 (marketplace + Paystack payments), Phase 9 (hardening + release). Commit after every verified step. Update this log with each commit.

### [Tue Nov 03] 9403a45 — feat(admin): restore supabase-access adapter with cookie-based sessions
**Reason:** Recreate the admin auth adapter that tests depend on, with all session/token verification functions. Admin pages now build and render a real dashboard (no longer 503).

**Tests:** supabase-adapter, supabase-password, supabase-session pass. `pnpm typecheck` 6/6, `pnpm build` 3/3.

**Features added:**
- getAdminAccessForToken, signInAdminWithPassword, signOutAdminSession, getAdminAccessForSession, respondToAdminRead
- Admin dashboard, newsroom list, create draft, edit article pages
- Direct publishing (no review gate) per product decision

---

### [Tue Nov 03] 2009326 — feat: direct publishing — articles publish immediately, no review gate
**Reason:** Per user instruction, articles publish immediately when staff publish them — no separate review/approve gate.

**Tests:** `pnpm typecheck` 6/6, `pnpm build` 3/3.

**Features added:**
- Removed review/approve workflow from docs (master plan, roadmap, PRD)
- Removed review queue and publish queue from admin navigation
- Dashboard quick actions updated to 'Publish approved'

---

### [Tue Nov 03] 76e02b9 — feat(admin): staff dashboard, newsroom list, create draft, edit article
**Reason:** Build the admin Phase 2 pages for editorial operations.

**Tests:** `pnpm typecheck` 6/6, `pnpm build` 3/3 (admin build passes).

**Features added:**
- Admin dashboard with real counts (drafts/review/approved/total)
- Newsroom article list with state filter
- Create draft page (server action → article_create RPC)
- Edit article page (submit for review → article_submit RPC)
- Premium header/footer shared with main app
- supabase server client using service-role key

---

**Current state:** 21/28 tests pass. 7 failing:
- 4 supabase-auth tests now pass (adapter recreated)
- 3 remaining: foundation smoke test 'admin remains unavailable' (expects 503 but admin now renders dashboard), plus 2 others to investigate

**Next:** Update admin dashboard test assertion, then continue Phase 3 (Who is Who), Phase 4 (radio status verification).
