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

## Phase 1 — Public shell — IN PROGRESS

### 1.1 Toolchain

- [x] `pnpm install --frozen-lockfile` completes — 43 packages, verified 2 Nov 2026
- [x] `pnpm typecheck` passes — 6/6 tasks
- [x] `pnpm build` passes for all three apps — 3/3 successful, webpack
- [ ] `pnpm test` passes — see 1.2
- [x] Turbopack build switched to webpack: Turbopack cannot read pnpm symlinks on the current
      filesystem. Documented in `13-tech-stack.md` §2.10
- [x] Test runner switched from `node --experimental-strip-types` to `tsx` — the local Node build
      lacks TypeScript stripping
- [x] `onlyBuiltDependencies: [esbuild]` added to `pnpm-workspace.yaml`

### 1.2 Existing test suite

- [ ] `frontend/tests/*.test.mjs` green under the new runner
- [ ] Foundation smoke tests spawn the built apps and assert real HTTP responses
- [ ] The in-memory RLS simulation is labelled as *not* proof of RLS (it is a fast local check only)

### 1.3 Design tokens in code

- [ ] CSS custom properties for the palette in `docs/05-design-system.md`
- [ ] Tailwind theme extended with the same values — one source of truth, not two
- [ ] Type scale, spacing scale, radius scale, shadow scale, motion scale
- [ ] `prefers-reduced-motion` respected globally

### 1.4 Main app — landing

- [ ] Header with mobile disclosure menu, `aria-expanded`, escape to close
- [ ] Hero: what EPE LAWA is, in plain language, no invented claims
- [ ] The five sections described truthfully, with honest state for what is not live
- [ ] Radio area rendering an honest "not yet available" state (B1)
- [ ] News headline block rendering an honest empty state
- [ ] Footer: about, contact, guidelines, privacy, terms
- [ ] Skip link, landmark structure, single `h1`
- [ ] `/about`, `/contact`, `/privacy`, `/terms`, `/guidelines` pages

### 1.5 News app — structure

- [ ] Masthead and section navigation
- [ ] Home with lead-story slot and empty state
- [ ] Article layout shell
- [ ] `/latest`, `/category/[slug]`, `/author/[slug]`, `/tag/[slug]`, `/search` with real empty states
- [ ] Article structured data, canonical, Open Graph
- [ ] `noindex` until Phase 2 publishes real content

### 1.6 Shared

- [ ] `error.tsx`, `global-error.tsx`, `not-found.tsx` in all three apps
- [ ] Loading skeletons, not blanks
- [ ] Offline fallback page + PWA manifest + icons
- [ ] `sitemap.ts` and `robots.ts` reflecting only real routes
- [ ] Security headers confirmed on every app: `nosniff`, `X-Frame-Options`, `Referrer-Policy`,
      `Permissions-Policy`

### 1.7 Phase 1 gate

- [ ] No horizontal overflow at 320 / 375 / 768 / 1024 / 1440
- [ ] Full keyboard traversal, visible focus on every control
- [ ] Lighthouse accessibility ≥ 95 on landing and news home
- [ ] Every navigation target resolves; no dead link
- [ ] Empty, loading, error and 404 states all reachable and distinguishable
- [ ] Committed and pushed

---

## Phase 2 — News engine — NOT STARTED

- [ ] Migration `capabilities_catalogue`
- [ ] Migration `editorial_core` — authors, categories, tags, articles, versions, `published_articles` view
- [ ] Negative RLS tests: anonymous, wrong-role, cross-article version pointer
- [ ] Transition function with compare-and-swap on `revision`
- [ ] Admin: list, editor (Tiptap), preview, review queue, publish, version history
- [ ] News: home, article, category, author, tag, search
- [ ] Cache purge on publish and unpublish, tested
- [ ] **Gate:** three distinct roles complete draft → publish; draft 404s everywhere; unpublish is
      immediate

---

## Phase 3 — Who is Who — NOT STARTED

- [ ] Migration `people_directory`
- [ ] Trigger enforcing a source before publish
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
