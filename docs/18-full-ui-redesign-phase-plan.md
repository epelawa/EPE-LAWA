# EPE LAWA — Full UI redesign phase plan

**Status:** Route/form inventory reviewed against both frontend App Router trees, the sitemap, user journeys, focused tests, and current handoffs on 2026-11-15. **MOUNTED does not mean production-ready.** This plan sequences the work; it does not claim that the whole platform has been redesigned or that blocked provider/schema flows work.

## Current first slice — shared public shell, homepage, News and Contact

The first review PR is deliberately bounded to the shared public shell, homepage, News list/article, truthful Contact/footer availability copy, and mobile bottom navigation. The bottom bar has exactly four tabs—**Home**, **News**, **Discover**, **Account**—to `/`, `/news`, `/tourism`, and `/dashboard`. Forum remains reachable in the existing mobile drawer under **Community**; do not add a fifth tab. This slice is not a complete redesign of all modules, member/auth pages or Admin.

**Candidate status (2026-11-15):** The isolated `feat/epe-lawa-ui-first-slice-20261115` implementation worktree is based on `main` at `45aee2788f0c9b6a986dcb6181fa6d98434fdfc2`. Full workspace typecheck, both production builds and the full test suite passed (286 passed, 0 failed, 1 skipped). Production-mode Chromium passed at nine widths from 320px to 1440px, including the four exact tabs, keyboard-accessible Forum drawer and mobile heading clearance. The screenshot matrix and the missing-Supabase limitation in the isolated News preview are recorded in [`docs/screenshots/ui-first-slice/2026-11-15/README.md`](screenshots/ui-first-slice/2026-11-15/README.md). The exact candidate SHA will be recorded in its PR; hosted checks and independent Tester/reviewer sign-off remain release gates before merging. This candidate is not merged. [Separate PR #101](https://github.com/epelawa/EPE-LAWA/pull/101) is still a conflicting draft and is not the candidate.

Routes/surfaces: `/`, `/news`, `/news/[slug]`, `/contact`, plus shared navigation/footer and the cross-cutting `/status/[code]`, `/robots.txt`, `/sitemap.xml`, and `/llms.txt` behavior. The News form is a GET search/filter interface; the article has share/copy/offline actions and existing comment/report UI behind verified-member and server-side moderation controls. Contact has no collecting form or false delivery success. No News like/reaction route or persistence exists.

Release gate: exact-head tests, typecheck, production build, responsive/keyboard/accessibility evidence, truthful empty/error/denied states, and privacy/indexing checks. Production News has a reported `published_articles.cover_url` schema gap and approved article reads still need anonymous/RLS verification; local tests, a deployment-ready badge, or HTTP 200 alone do not clear that blocker.

## Phase 1 — public information and discovery

**Routes:** `/about`, `/gallery`, `/guidelines`, `/privacy`, `/terms`, `/advertise`, `/photo-credits`, `/itan-ilu-mi`, `/map`, `/tourism`, `/tourism/[slug]`, `/radio`, `/who-is-who`, and `/who-is-who/[slug]`. `/contact` remains truthful and non-collecting until a real intake contract is approved. `/advertise` and `/photo-credits` are source-mounted; their sitemap/indexing decision must be checked explicitly.

**Forms and journeys:** Keep About/legal/guideline/advertising/credit pages readable and factual; Gallery remains honestly empty until licensed media is approved. History and Tourism public pages show only source-backed approved records. Map has manual local search, optional click-only one-shot location permission, and an intentional HTTPS Google Maps handoff—no default GPS request, stored coordinates, live Places API, or offline-map claim. Tourism has GET search/pagination and sourced detail pages; Radio has user-started playback (no autoplay), truthful event/fallback states, and separately sourced programme/schedule/archive states. Who-is-Who has bounded public filters and source-backed person details; report/correction links do not imply an available intake queue.

**Member writes are not part of this read-only phase:** History contribution and Tourism suggestion forms must remain private/pending, consented, provenance-backed, and staff-reviewed until the member/RLS/RPC and staff workflow phase is verified. No invented destinations, visit details, identities, offices, photos, schedule entries, stream uptime, or live service claims.

**Acceptance:** Test search, detail, empty, unavailable, error, not-found, permission-denied, timeout and manual fallback states at required widths and with keyboard/focus/reduced-motion/200% reflow. Verify source/credit/license visibility, explicit public-field allowlists, SEO/canonical behavior, environment-aware robots/sitemap and no private data in cache, metadata or structured data. Production schema for History/Tourism and publication metadata for Radio require read-only preflight before any live acceptance claim.

## Phase 2 — member identity and community participation

**Member routes:** `/login`, `/auth`, `/forgot-password`, `/auth/new-password`, `/auth/callback`, `/auth/complete`, `/auth/verify`, `/auth/link-expired`, `/auth/link-problem`, and `/dashboard`.

**Community routes/interactions:** `/forum`, `/forum/category/[slug]`, `/forum/thread/[slug]`, `/forum/new`, private contribution behavior on `/itan-ilu-mi`, and comment/reply/report behavior on `/news/[slug]`.

**End-to-end journeys:** Complete signup through OTP or secure email link, safe same-origin callback, verified profile completion, sign-in/out, password recovery and own-profile editing. Members browse the public forum, create a thread and optional single-choice poll, reply one level, vote once, and privately report content. Members may submit a History account with mandatory consent/provenance/rights evidence to a private pending queue. A verified-email member may comment/reply/report on a published News article; staff moderation remains a later protected phase. Sharing is not liking: News likes/reactions are a separate unimplemented feature.

**Acceptance and blockers:** Auth errors remain generic and enumeration-safe; callback return paths are constrained; private routes are noindex and fail closed. Dashboard reads/updates only the authenticated member's own display name/handle. Every write is revalidated and authorized server-side with RLS/RPC, active/non-banned membership, duplicate/replay checks, audit records, and server-side abuse/rate-limit controls. Test all verification/recovery/profile-race states in an isolated provider project; hosted email delivery is unverified and Google sign-in stays disabled. Forum relations/RPCs/ACLs, News comment schema/RLS/RPCs and History migration/consent-version ordering need exact read-only catalog/ledger preflight and isolated E2E before writes can be claimed. History correction/takedown remains unavailable until a separate persisted, private, audited workflow exists.

## Phase 3 — business directory and unpaid marketplace requests

**Routes:** `/business-directory`, `/business-directory/[slug]`, `/business-directory/submit`, `/business-directory/orders`, `/admin/business-review`, `/admin/business-review/moderation`, and `/admin/orders`.

**Forms and journeys:** Visitors filter published listings and inspect only approved public business/product/review fields. Verified members submit listings (always pending/unpublished), add one review (pending moderation), and may request an available item through an explicitly unpaid order flow. Server code recomputes price/stock, stores immutable line-price snapshots and order history, and never collects payment/card details. Authorized seller/staff status changes keep delivery data private and use audited transitions. Staff review listings with evidence/reasons and moderate reviews with a reason.

**Open contract:** `/business-directory/orders` is currently seller-oriented in source, while the intended member journey reads like buyer order history. Decide whether to separate buyer history from seller management or rename/copy the destination truthfully before calling order handling complete. Owner product editing is not mounted.

**Acceptance and blockers:** The reported live catalog is missing business/marketplace relations, public views and RPCs; reconcile only this domain with fresh read-only preflight and normal reviewed additive migrations. Verify member/buyer/seller/staff RLS and unauthorized negatives, all result/loading/empty/error/denied states, and responsive form behavior in isolated browser journeys. Paystack checkout, webhook verification, paid transitions, refunds and paid sponsorship are not implemented; do not expose payment UI or success claims. No production fixtures or orders.

## Phase 4 — protected staff/Admin workspaces and governance

**Routes:** `/admin/login`, `/admin`, `/admin/newsroom`, `/admin/newsroom/new`, `/admin/newsroom/[id]`, `/admin/newsroom/settings`, `/admin/itan-ilu-mi/review`, `/admin/moderation/forum`, `/admin/business-review`, `/admin/business-review/moderation`, `/admin/orders`, `/admin/people`, `/admin/radio`, `/admin/tourism`, and `/admin/[...unknown]`. `error.tsx` and `not-found.tsx` are framework fallback surfaces, not extra URLs. The workspace's mirrored Admin app does not create separate same-origin public paths.

**Forms and journeys:** Verified staff authenticate to sanitized same-origin admin paths. Newsroom editors create private drafts, edit/save with expected revisions, create correction versions, manage categories/bylines, and publish/unpublish through audited server RPCs. History reviewers inspect private evidence and publish only a separately entered redacted public version, request revision, or reject with an auditable decision. Forum moderators resolve private reports as hide/restore/dismiss with required reasons and no reporter identity exposure. Business reviewers verify/publish/reject listings and moderate pending reviews with reasons. People staff manage source-backed profiles, sources/offices, verification and corrections. Radio staff manage programme/schedule/episode records with revision and private rights notes. Tourism staff verify provenance/rights and only publish sourced visitor facts. The Admin orders page remains unavailable until its actual action contract is implemented and verified.

**Acceptance and blockers:** Every page, action and RPC independently verifies current staff identity and effective server-side capability; navigation filtering is convenience only. Preserve host-only Secure/HttpOnly/SameSite staff sessions, private/no-store/noindex responses, revision conflict handling, audit events, and no private drafts/evidence in public/cache/SEO surfaces. Require isolated authenticated Playwright coverage for allowed/denied/revoked/stale/concurrent cases, responsive admin forms/queues, safe error messaging and audit verification. Production schema/RPC/ACL/RLS gaps are reported across Newsroom, History, Forum, business, People, Radio and Tourism; preflight each domain separately. Do not bulk-replay migrations, seed Production, or infer readiness from mounted routes.

## Phase 5 — staff identity administration and external-provider capabilities

**Routes:** `/admin/roles` and `/admin/users`.

**Forms and journeys:** Primary-authorized staff manage roles/capabilities and staff assignments through server-side audited operations; staff invitations and active/deactivated state use only server-side provider configuration. A user may not deactivate themself. Effective access is recomputed for each protected request.

**Acceptance and blockers:** The configurable-role migration/RPCs are reported unapplied or blocked. Staff invitation requires the approved server configuration, Auth email provider and isolated delivery test. Verify capability revocation, concurrent edits, self-deactivation denial, invitation lifecycle and audit behavior in an isolated environment. Do not expose service-role credentials or create staff accounts in Production during this redesign.

## Explicitly not working or not yet mounted

Keep these capabilities visibly unavailable until a separately approved product/schema/provider design, secure persistence, abuse/privacy controls and complete isolated end-to-end evidence exist: Contact/Advertise/newsletter intake; correction/takedown intake; News likes/reactions; buyer order-history contract; business owner product editor; Paystack checkout/webhooks/refunds/paid sponsorship; media uploads without a configured storage policy; Google Maps/Places/geocoding or offline maps; continuous Radio uptime, camera studio/live broadcast/recording/archive. Do not invent activity metrics, published content, facts, identities, prices, services, or successful submissions.

## Cross-cutting completion gates for every phase

1. Keep production read-only for this planning/review work. Local tests, PGlite, synthetic screenshots, `READY` deployments and HTTP 200 are not live workflow evidence.
2. Run exact-head typecheck, build, full tests and route-focused Playwright journeys; record the SHA tested. Use only isolated fixtures and authorized test recipients.
3. Cover every mounted route/form at 320/375/768/1024/1440 CSS px, plus keyboard-only, focus order, accessible names/states, reduced motion, 200% zoom/reflow, loading/empty/error/denied/not-found and safe navigation return paths.
4. Validate public/member/staff boundaries with negative tests, RLS/RPC/capability denial, revoked access, privacy/cache/SEO/header checks, audit records, duplicate/replay behavior and server-side rate limits.
5. Keep the shared cobalt/type/icon system, public shell and mobile navigation consistent without flattening module-specific meaning or replacing existing working routes. The mobile bottom bar remains four tabs; Forum remains in the Community drawer.
6. Open a focused PR for each coherent phase. Merge only after exact-head local and hosted checks, screenshot evidence, independent Tester/reviewer verification, and a clean merge state; verify the resulting `main` commit afterward.
