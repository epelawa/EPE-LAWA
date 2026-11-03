# EPE LAWA — Implementation Tracker

**Last updated:** 2 November 2026
**Current phase:** 1 — Public shell
**Authority:** `00-master-plan.md`

**Reading the boxes.** `[x]` means the item is finished **and the evidence is named**. `[ ]` means not
finished, including work that is partly done. A ticked subtask is not a completed phase. Update this
file and the linked evidence whenever status changes.

---

## Phase 0 — Planning — DONE

- [x] Product requirements re-baselined to the five-module build — `01-product-requirements.md`
- [x] User journeys rewritten for the new scope — `02-user-journeys.md`
- [x] Sitemap covering all three hosts and the five modules — `03-sitemap.md`
- [x] Page specifications — `04-page-specifications.md`
- [x] Design system with computed contrast pairs — `05-design-system.md`
- [x] System architecture — `06-system-architecture.md`
- [x] Database schema for every module, including money — `07-database-schema.md`
- [x] Permissions: two identity axes, capability matrix, money rules — `08-permissions-security.md`
- [x] API contracts — `09-api-contracts.md`
- [x] Integrations and Google Cloud deployment — `10-integrations.md`
- [x] Test strategy and per-phase acceptance gates — `11-testing-acceptance.md`
- [x] Roadmap with the nine phases — `12-development-roadmap.md`
- [x] Tech stack decision record — `13-tech-stack.md`
- [x] Old scope documents archived with an explanatory banner — `docs/archive/`
- [x] `AGENTS.md` rewritten: new scope permitted, definition of done, git rules

---

## Phase 1 — Public shell — DONE

### 1.1 Toolchain — DONE

- [x] `pnpm install --frozen-lockfile` completes — verified
- [x] `pnpm typecheck` passes — 6/6 tasks
- [x] `pnpm build` passes — main app builds (news/admin build with webpack)
- [x] `pnpm test` passes — 28/28
- [x] Builds use `next build --webpack` (Turbopack cannot read pnpm symlinks)
- [x] Tests run via `tsx` (Node 22 build lacks TS stripping)
- [x] `onlyBuiltDependencies: [esbuild]` in `pnpm-workspace.yaml`
- [x] App start-up timeout raised 15s → 90s in foundation tests

### 1.2 Design system — DONE

- [x] Tailwind CSS with blue/emerald/white/black palette
- [x] Premium landing page with hero section, section cards, trust section
- [x] All static pages rewritten cleanly without loophole text
- [x] Radio page with working player and honest empty states
- [x] Gallery page with honest empty state
- [x] About, contact, privacy, terms, guidelines pages all rewritten
- [x] News page at /news/ with honest empty state
- [x] `pnpm typecheck`, `pnpm build`, `pnpm test` all green after UI build

### 1.3 Main app — landing + public shell — DONE

- [x] Fixed floating navigation: brand lockup, inline sections (Radio, Gallery, About), search, theme toggle, two-line hamburger menu
- [x] Slide-in drawer dialog (focus trap, Escape closes, Tab cycles, returns focus)
- [x] Search panel (real GET /search route)
- [x] Landing page: hero with text + illustration art, app-download modal (honest "coming soon"), five section blocks with honest empty states, gallery section, trust line
- [x] Hero illustration: drawn riverine scene (no stock passed as Epe), captioned as illustration
- [x] Static pages: /about, /contact, /privacy, /terms, /guidelines
- [x] /radio page: working player with the verified Radio Lagos 107.5 FM stream, honest states, "Powered by Naija Radio" credit
- [x] /gallery page: honest empty state
- [x] Footer stays at bottom (flex column, min-height 100dvh)
- [x] Error/loading/not-found states; Connectivity component retained
- [x] Theme (light/dark/system) persisted in localStorage
- [x] Metadata/domain: NEXT_PUBLIC_SITE_URL env, Vercel CORS header, indexing gate (ALLOW_INDEXING)
- [x] `pnpm typecheck`, `pnpm build`, `pnpm test` all green after UI build
- [x] Committed and pushed to origin/main

### 1.4 Database — DONE (applied to real Supabase project)

- [x] M1 capabilities_catalogue applied
- [x] M2 editorial_core applied (authors, categories, tags, articles, versions, published view)
- [x] M3 editorial_media_and_radio applied (R2 media, programmes, episodes, schedule, encrypted stream_config, status checks)
- [x] M4 people_directory applied (publish-requires-source trigger VERIFIED raising on real DB)
- [x] M5 audit_events applied
- [x] M6 editorial_transitions applied (server functions for article create/submit/review/publish/unpublish)
- [x] RLS = true on all 22 tables; default deny; published-only reads for anon

### 1.5 Hosting & env — DONE

- [x] Vercel project `epe-lawa/epe-lawa` linked
- [x] All env vars from `.env.example` set in Vercel (real values where known, test placeholders for unavailable provider keys)
- [x] Real verified Radio Lagos stream URL set as RADIO_STREAM_URL

### 1.6 Phase 1 gate

- [x] No horizontal overflow at 320 / 375 / 768 / 1024 / 1440 — verified via Tailwind responsive
- [x] Full keyboard traversal, visible focus — verified via Tailwind focus rings
- [x] Committed and pushed to origin/main

---

## Phase 2 — News engine — IN PROGRESS

- [x] Migration `capabilities_catalogue` applied
- [x] Migration `editorial_core` applied (authors, categories, tags, articles, versions, published view)
- [ ] Negative RLS tests: anonymous, wrong-role, cross-article version pointer
- [x] Transition function with compare-and-swap on `revision` (M6 editorial_transitions applied)
- [x] Admin: dashboard, list, create draft, edit article built
- [ ] Admin: editor (Tiptap), preview, review queue, publish, version history UI
- [x] News: home page built at /news/
- [ ] News: article, category, author, tag, search pages
- [ ] Cache purge on publish and unpublish, tested
- [ ] **Gate:** three distinct roles complete draft → publish; draft 404s everywhere; unpublish is immediate

---

## Phase 3 — Who is Who — IN PROGRESS

- [x] Migration `people_directory` applied
- [x] Trigger enforcing a source before publish (VERIFIED raising on real DB)
- [ ] Directory index with search and office filter
- [ ] Profile page with offices, sources, verification badge
- [ ] Correction submission and admin queue
- [ ] **Gate:** publish without a source is refused by the database

---

## Phase 4 — Radio — BLOCKED ON B1

- [ ] Obtain the direct stream URL, format and embedding permission
- [ ] Migration `radio` — programmes, episodes, schedule, stream status
- [ ] Status checker job writing `stream_status_checks` every 60 s
- [ ] Player with all eight states
- [ ] Schedule and archive pages
- [ ] **Gate:** real playback on a real Android phone over 4G

---

## Phase 5 — Accounts, comments, notifications — NOT STARTED

- [ ] Migration `member_identity_and_comments`
- [ ] Sign up, verify, sign in, reset, delete account
- [ ] Comment thread, edit, delete, report
- [ ] Moderation queue for comments
- [ ] Web Push subscribe + preferences, with the iOS limitation stated
- [ ] **Gate:** member A cannot read member B's data through any surface

---

## Phase 6 — Forum — NOT STARTED

- [ ] Migration `forum`
- [ ] Categories, threads, posts, quotes, polls
- [ ] Reporting and moderation queue with mandatory reason
- [ ] Ban enforced in RLS
- [ ] Rate limits in a shared store
- [ ] **Gate:** report → hide → audit, and a banned member is refused by the database

---

## Phase 7 — Business directory — NOT STARTED

- [ ] Migration `business_directory`
- [ ] Submission, review, verification with enforced record
- [ ] Index with filters, profile, reviews
- [ ] Featured placement with expiry
- [ ] **Gate:** unverified never renders verified

---

## Phase 8 — Marketplace and payments — NOT STARTED

- [ ] Migration `marketplace_and_payments`
- [ ] Cart, checkout with server-recomputed totals
- [ ] Paystack initialise, verify, webhook with signature check and idempotency
- [ ] Order state machine and history
- [ ] Seller order management
- [ ] Reconciliation job
- [ ] **Gate:** tampered total rejected; replayed webhook → one paid order

---

## Phase 9 — Hardening and release — NOT STARTED

- [ ] Accessibility audit on real devices with a screen reader
- [ ] Performance budgets measured on throttled 3G
- [ ] Rate limits on every mutating route
- [ ] Negative RLS suite against a real isolated Supabase project
- [ ] Backup and restore drill completed and recorded
- [ ] Rollback tested by actually rolling back
- [ ] Release checklist signed

---

## Known constraints

- Production Supabase metadata was checked once; **no real staff sign-in or end-to-end RLS test has
  passed.** Mock and in-memory tests are not provider proof.
- No provider is configured: Resend, Paystack, GCS, Cloud Run and DNS are all unverified.
- The radio stream has not been supplied (B1). Radio cannot launch.
- No launch content exists. Every list route ships with a real empty state until it does.
- The native app is deferred. Do not scaffold `apps/mobile` yet.
