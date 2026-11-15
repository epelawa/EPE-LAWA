# EPE LAWA — Canonical Project Status & Full UI Implementation Checklist

- **Status snapshot:** 15 November 2026, 15:03 WAT (UTC+01:00)
- **Repository:** [`epelawa/EPE-LAWA`](https://github.com/epelawa/EPE-LAWA)
- **Verified `main` SHA:** `45aee2788f0c9b6a986dcb6181fa6d98434fdfc2`
- **Purpose:** one current status and acceptance checklist for the complete product redesign. Refresh the snapshot after material merges or new test evidence.

> **Owner’s target:** a coherent, professional, production-grade redesign of the whole relevant product—public pages, member/auth interfaces, Admin, forms, and end-to-end journeys—along with a stronger, better-organized codebase. The current work is only a first slice. Improve the existing system deliberately; do not rush a wholesale rewrite or discard its security and data boundaries.

## How to read this checklist

- **Done** means named evidence exists for the exact SHA and scope stated. It does not imply the whole product is complete.
- **Partial** means routes, components, or focused work exist, but the complete journey, redesign, or release evidence has not been signed off.
- **Pending / blocked** means no sufficient evidence is recorded, a test is unresolved, or an owner/provider/legal/data decision is needed. It does **not** assert that no code exists.
- A route in the source tree, a passing focused test, a green deployment check, or an HTTP 200 response is not by itself end-to-end acceptance.

## Where the project is now

| Area | Verified state | What it means |
|---|---|---|
| `main` | GitHub reports [`45aee2788f0c9b6a986dcb6181fa6d98434fdfc2`](https://github.com/epelawa/EPE-LAWA/commit/45aee2788f0c9b6a986dcb6181fa6d98434fdfc2), the PR #106 merge commit. On this exact commit, `CI / verify`, `CI / CodeQL security analysis`, Supabase Preview, Vercel, and `Vercel Deployments – Epe Lawa` all succeeded (checked 14:15 WAT). PR #106 did not trigger a Production deployment. | Merge and post-merge checks are confirmed. This is not whole-product UI acceptance or proof of current Production behavior. |
| PR [#105](https://github.com/epelawa/EPE-LAWA/pull/105) | Merged earlier at `8dcbaa60a38798b2a6c7a02fc60999d4316aaf89`. Its PR head was `397f80664586959661165f2c587ffdb2f4846fe1`; CI verify, CodeQL, and Vercel checks passed on that head. | **Done:** CI/CodeQL release-gate work. PR #105 did not redesign the product UI. |
| PR [#106](https://github.com/epelawa/EPE-LAWA/pull/106) | **Merged** at `45aee2788f0c9b6a986dcb6181fa6d98434fdfc2` on 15 November at 13:12:17Z; base `8dcbaa60…`, head `9ed92960b0ee9917270a92700b752e7a579298b2`. Its seven PR check entries were six successful (CI, CodeQL and Vercel preview checks) plus the documented Supabase Preview skip. Only the Tourism server action, parser, and tests changed; the action rejects oversized and whitespace-padded fields before contacting Supabase. No schema/migration/Production-data change and no Production deployment was triggered. | **Merged narrow backend validation only.** Its exact tests and merge checks passed; this is not the broad UI redesign. |
| PR #106 exact-head verification | Tester reran exact SHA `9ed92960b0ee9917270a92700b752e7a579298b2` in an isolated worktree using Node 22.23.5/pnpm 10.34.9 and a complete frozen install: build passed; `pnpm test` passed with 279 passed, 0 failed, 1 documented PGlite skip (280 total). The earlier five Next-dependent and four fetch failures were setup-related. Focused Tourism tests passed 12/12; the independent parser/action review approved with no code blocker. No GitHub review was submitted. | **Exact-SHA full-suite gate: passed and merge confirmed.** Supabase Preview was skipped on the PR head; the narrow slice is not full UI acceptance. |
| PR [#101](https://github.com/epelawa/EPE-LAWA/pull/101) | Open, draft, and dirty/conflicted at head `47a71652c813ae9871b45683a8269dfa9cef3b84`; it does not include the four-tab bar. Its prior browser smoke predates the `45aee278…` merge and is stale. The current first UI slice is separate draft [PR #109](https://github.com/epelawa/EPE-LAWA/pull/109) at exact head `81b2344c7ab19fa3725d27d9eab21ef8ce7c7758`. | **Not merged or accepted.** PR #101 remains a limited News/navigation/Admin slice, not the requested complete redesign. |
| Draft harness PR [#108](https://github.com/epelawa/EPE-LAWA/pull/108) | Test/docs/CI-only, open and draft, head `2c0e2514eee88aadf9a0d59c2659f4aa95286d41`, base `main` at `45aee2788f0c9b6a986dcb6181fa6d98434fdfc2`. Its unchanged current-main browser smoke remains **11 passed, 2 failed**, only the News bottom-bar assertions at 320px and 375px ([hosted run](https://github.com/epelawa/EPE-LAWA/actions/runs/43718884822)). **Latest diagnostic on old PR #109 SHA `81b2344c7ab19fa3725d27d9eab21ef8ce7c7758`: 10/13 pass.** The false `/tourism` fallback is removed and a direct keyboard News-tab check is included. The three remaining failures appear to be harness locator issues—not confirmed UI defects: (1) 375px desktop/mobile landmark ambiguity, (2) drawer closes before lookup at 768px, and (3) desktop disclosure selector scope. Tester is correcting selectors; the run predates the gutter fix and is preliminary. This supersedes the earlier 12/13 diagnostic. | **Open acceptance gap.** Preserve the 11/2 current-main baseline; corrected-selector rerun and a new exact candidate are pending. |
| Draft UI PR [#109](https://github.com/epelawa/EPE-LAWA/pull/109) | Remote PR remains open/draft at exact head `81b2344c7ab19fa3725d27d9eab21ef8ce7c7758`, base `main` `45aee2788f0c9b6a986dcb6181fa6d98434fdfc2`. **Latest diagnostic on this old head is 10/13 pass**, superseding the earlier 12/13 run: the `/tourism` false fallback was removed and direct keyboard News-tab check included; three remaining failures appear to be locator issues (375px desktop/mobile landmark ambiguity, 768px drawer closes before lookup, desktop disclosure selector scope), not confirmed UI defects. Tester is correcting selectors. This diagnostic predates the gutter fix and is preliminary. New local candidate `b447a5a` reports exact-local typecheck/build/tests (287 passed, 1 skipped), nine-width smoke, direct News keyboard activation working, gutters 16px at 320px / 20px at 375px, and named landmark/four routes intact. **It is not pushed**; README SHA/build statement is still being updated. Treat these as local preliminary results only until a new exact head is pushed and retested/reviewed. No Vercel project is connected for a hosted UI preview. Full-product acceptance remains open. | **Conditionally blocked, not rejected or accepted.** Gutter fix and new local checks are not yet on the PR head. Await README SHA/build update, corrected-selector rerun, new exact pushed candidate, independent review, and hosted checks. Safe public News query/no schema-service-role change remains a separate backend finding, not UI or Production-News sign-off. |
| Bottom navigation | **Current-main baseline:** draft PR #108 at `2c0e251…` on `45aee278…` remains 11 pass / 2 fail on News bottom-bar assertions at 320px and 375px ([hosted run](https://github.com/epelawa/EPE-LAWA/actions/runs/43718884822)). **Latest old-head diagnostic:** #109 SHA `81b2344…` is 10/13 pass; false `/tourism` fallback removed, direct keyboard News-tab test included, and three remaining failures appear to be locator issues: 375px landmark ambiguity, 768px drawer closes before lookup, desktop disclosure selector scope. Tester is correcting selectors. This run predates the gutter fix and is preliminary. New local candidate `b447a5a` reports passing local typecheck/build/tests (287/1 skip), nine-width smoke, direct News keyboard success, and 16px/20px gutters; it is not pushed, and README SHA/build statement is in progress. | **Open; not signed off.** Correct selectors without losing coverage, complete README SHA/build evidence, push the corrected candidate, rerun on its exact SHA, and finish independent review. No hosted preview or full-product acceptance is established. |
| Full UI and journeys | Draft UI PR #109 is a clean pushed first slice at exact head `81b2344…`, but it covers only selected home/news/navigation work. Whole-product route-by-route redesign, auth/member/Admin flows, forms, persistence, permissions, and end-to-end acceptance remain unfinished. No Vercel project is connected for a hosted UI preview; green Vercel status contexts alone are not full-product preview or acceptance evidence. | **Partial overall; broad acceptance remains.** Do not present this slice or its local screenshots as full-product sign-off. |
| Production, scope, and operations | This documentation pass did not freshly verify the Production deployment SHA, live Supabase schema/ledger, live user journeys, custom-domain DNS/TLS, or provider operation. | Keep the blockers below explicit. No production writes are part of this checklist or the docs PR. |

## What is done—and what is not

### Evidence-backed done

- [x] **CI foundation merged:** PR #105 added CI/CodeQL release checks; its merge commit `8dcbaa60…` passed CI verify, CodeQL, Supabase Preview, and Vercel.
- [x] **PR #106 merged after exact-SHA verification:** head `9ed92960b0ee9917270a92700b752e7a579298b2` passed the complete frozen workspace install/build and `pnpm test` (279 passed, 0 failed, 1 documented PGlite skip); focused Tourism tests passed 12/12 and the independent parser/action review found no code blocker. All post-merge checks passed on `45aee2788f0c9b6a986dcb6181fa6d98434fdfc2`. This is a narrow backend slice, not full UI acceptance; no Production deployment was triggered.
- [x] **The complete source text of all three supplied audit/blueprint documents is preserved** as dated readable archive copies, and the exact uploaded files are retained in a linked bundle. The archive note records whitespace-only normalization and original SHA-256 values; this PR adds a canonical checklist rather than overwriting prior documents.

### Partial or unresolved

- [~] PR #106 did not trigger a Production deployment. The exact Production deployment SHA and live public/member journey behavior remain unverified in this documentation snapshot.
- [~] The repository has many page, authentication, member, and staff implementations and prior focused tests/screenshots. These are useful starting points, not evidence that all forms, routes, responsive states, and end-to-end journeys meet the owner’s new full-product bar.
- [~] PR #101 has a prior UI preview/check history but is still draft and dirty. It is not the accepted full redesign and must not be treated as merged work.

### Explicitly not signed off

- [ ] The full professional redesign across every public, auth/member, and Admin route.
- [ ] News **and** dashboard bottom navigation, including 320/375px overlap, focus/touch, and active-route acceptance.
- [ ] All forms and member/staff interaction journeys, including persistence, error handling, permissions, and honest unavailable states.
- [ ] Exact-head acceptance and screenshot-to-SHA matching. The latest Tester diagnostic on old #109 SHA `81b2344c7ab19fa3725d27d9eab21ef8ce7c7758` is **10/13 pass**: false `/tourism` fallback removed, direct keyboard News-tab check included, and the three remaining failures appear to be locator issues (375px desktop/mobile landmark ambiguity, 768px drawer closes before lookup, desktop disclosure selector scope), not confirmed UI defects. Tester is correcting selectors. This run predates the gutter fix and is preliminary. New local candidate `b447a5a` reports typecheck/build/tests 287 passed / 1 skipped, nine-width smoke, direct News keyboard activation working, and 16px/20px gutters; it remains unpushed, with README SHA/build statement being updated. Do not mark these as pushed-SHA acceptance. Corrected-selector rerun, new exact candidate, hosted check, and independent review remain pending.
- [ ] Production readiness, final product scope, legal review, production schema reconciliation, and any custom-domain launch decision.

## Full route inventory and acceptance status

The route list below is present in the current source inventory and repository sitemap. **Presence is not completion.** For each route, check off the full redesign/flow only after the exact acceptance evidence is recorded. Where a feature is intentionally unavailable, acceptance means a truthful, accessible unavailable state—not a fake working form or success message.

| Surface and route inventory | Current status | Required redesign and journey acceptance |
|---|---|---|
| **Public shell and institutional pages:** `/`, `/about`, `/contact`, `/advertise`, `/privacy`, `/terms`, `/guidelines`, `/photo-credits`, `/gallery` | Partial; full-page sign-off not evidenced. | Redesign to the approved EPE LAWA visual system; verify header/footer, legal links, local image rights/credits, navigation, mobile layout, reduced motion, and loading/empty/error states. Contact, newsletter, advertising, correction, and privacy-request actions must remain clearly unavailable unless a monitored, persistent path is proven. |
| **News:** `/news`, `/news/[slug]` | Partial; broader visual and live-flow sign-off not evidenced. | Verify published-only feed and exact published-version body, approved story metadata and credits, search/filter/pagination state where present, empty/error/not-found states, share/canonical metadata, and no draft leakage through direct URLs, search, metadata, or sitemap. Keep the layout truthful if data is unavailable. |
| **Community history:** `/itan-ilu-mi` | Partial; durable correction/takedown is not evidenced. | Redesign the archive and contribution experience; show provenance, uncertainty, consent, privacy, review status, and source attribution. Keep submissions private until approved. Do not accept corrections, disputes, or takedowns as if they are durably handled unless an audited persistence path exists. |
| **Forum:** `/forum`, `/forum/category/[slug]`, `/forum/thread/[slug]`, `/forum/new` | Partial; full member/moderator E2E is not evidenced. | Redesign category, thread, reply, poll, report, and create-thread interfaces. Test sign-in gating, validation, safe return paths, private identity, moderation states, rate limits/abuse handling, and reasoned audit records. |
| **Map & navigation:** `/map` | Partial; external-link behavior must remain explicit. | Redesign search/results and opt-in location handoff. Verify safe outbound Google Maps URLs and mobile controls. No default GPS request, fake pins/distances/hours, or claim of Places/geocoding unless configured and tested. |
| **Business directory:** `/business-directory`, `/business-directory/[slug]`, `/business-directory/submit`, `/business-directory/orders` | Partial; order route is scope-sensitive. | Redesign search/filter/list/detail/submission forms with real verification states, privacy notice, validation, review confirmation, and honest empty/error states. Treat orders/checkout/payments/delivery as unavailable or later-phase until explicitly approved and securely end-to-end tested. |
| **Tourism:** `/tourism`, `/tourism/[slug]` | Partial; source-verified content and full visit workflow are not signed off. | Redesign index/detail and contribution/review states. Use only approved destinations and licensed, credited imagery; source-check facts and visitor details; omit unknown hours, prices, access, and safety claims. |
| **Radio:** `/radio` | Partial; actual stream/rights/uptime are not fully verified here. | Redesign player, play/pause, status, schedule, archive, and failure states. Test real playback and browser behavior only with confirmed rights and endpoint; never invent “LIVE,” schedule, or episodes. |
| **Who is Who:** `/who-is-who`, `/who-is-who/[slug]` | Partial; profile provenance, consent, and correction workflow need sign-off. | Redesign search/list/detail and verification/correction states. Publish only approved public profiles; verify identity/role and permissions; keep private details out of public views. |
| **Member and authentication:** `/auth` (signup), `/auth/verify`, `/auth/callback` handler, `/auth/complete`, `/login`, logout action, `/forgot-password`, `/auth/new-password`, `/auth/link-expired`, `/auth/link-problem`, `/dashboard` | Partial; complete secure E2E is not evidenced by the current main snapshot. | Redesign every form and status screen. Test signup, verification/resend, callback, sign-in/out, recovery, password update, expired/problem links, generic account-existence-safe messages, session lifecycle, and own-profile edits. Verify actual email delivery only with an authenticated sender and isolated recipient. |
| **Member-only actions:** posting, replying, voting/polls, liking/commenting, business/history contribution, reports/corrections where supported | Partial; each action requires its own E2E evidence. | Test authenticated and unauthenticated paths, permission-denied and suspended states, validation, persistence, error recovery, privacy, rate limits, audit/moderation, and no false success. Provide a safe, validated same-origin return path after sign-in. |
| **Staff/Admin:** `/admin/login`, `/admin`, `/admin/newsroom`, `/admin/newsroom/new`, `/admin/newsroom/[id]`, `/admin/newsroom/settings`, `/admin/users`, `/admin/roles`, `/admin/people`, `/admin/tourism`, `/admin/radio`, `/admin/moderation/forum`, `/admin/itan-ilu-mi/review`, `/admin/business-review`, `/admin/business-review/moderation`, `/admin/orders` | Partial; source contains both `frontend/apps/admin` and same-origin Admin route files in `frontend/apps/main`. | Redesign the operational workspace and every form/list/detail/review state. Decide and test one canonical staff implementation or a deliberate compatibility layer. Verify capability-filtered UI **and** server/database enforcement, actual-data metrics, unavailable-vs-zero, direct unauthorized requests, audit history, responsive tables, and every route’s loading/empty/error/denied/success state. Orders remain scope-gated. |

## Forms and interaction checklist

- [ ] **Auth/profile:** signup, verify/resend, login/logout, password recovery/new password, callback/expired/problem handling, dashboard/profile edit, session expiry, and generic safe errors.
- [ ] **News:** search/filter/pagination if supported, share, sign-in prompt for member actions, article save/preview/publish/edit/unpublish where authorized, current-revision conflict, image/source/license validation, and accurate save/publish feedback.
- [ ] **Business:** listing submission and moderation; ownership/verification evidence; contact actions only when valid; order request only if in approved release scope. Payment state must come from trusted server/provider records, never browser input.
- [ ] **Forum:** create thread, reply, poll creation/vote, report, moderation response, rate-limit/ban behavior, and reasoned audit trail.
- [ ] **History:** contribution with consent/provenance, private review, approved publication, and correction/dispute/takedown only when a durable audited path exists.
- [ ] **Map:** manual search, result selection, safe external directions, and user-triggered location handoff; no location permission prompt on page load.
- [ ] **Tourism, Radio, Who is Who:** all authoring/review forms, approved content/provenance, stream/player state, profile verification, and honest unavailable/error paths.
- [ ] **Admin:** staff invite/deactivate, role/capability edits, newsroom settings, moderation/review decisions, and all high-impact confirmations; enforce authorization server-side and audit privileged transitions.
- [ ] **Contact, reports, privacy requests, corrections, newsletter, advertising:** show unavailable status until a secure, persistent, monitored, disclosed path has been tested. No inert forms, fake success toasts, or unmonitored `mailto:` presented as a submitted ticket.

Across every form, verify visible labels, keyboard/focus order, inline and announced validation, pending/disabled states, server-confirmed success only, preserved safe input after validation errors, duplicate submission protection where relevant, and mobile keyboard behavior.

## Ordered remaining implementation phases

### Phase 0 — Resolve scope, release baseline, and ownership blockers

- [ ] Confirm a written scope crosswalk: the repository master plan says all eight web modules are current-release scope, while the repository audit records earlier Phase 1 boundaries and listings-only business scope. The owner’s full-redesign request sets the **design target**; it does not by itself approve marketplace checkout, payment, delivery, or new provider operations.
- [ ] Confirm the release domain decision. Current repository sitemap says `https://epelawa.vercel.app/` with same-origin `/news` and `/admin`, and marks the older `epelawa.ng` / `news.epelawa.ng` / `admin.epelawa.ng` split superseded unless the owner changes it. If a custom-domain launch is expected, verify ownership, DNS, TLS, redirects, cookie scope, canonical metadata, sitemap, and robots before calling it ready.
- [ ] Choose the canonical Admin app/route boundary and define whether the other tree is a tested compatibility layer.
- [ ] Reconcile production database state read-only before any database change. Audit documents disagree on migration-file/ledger counts and whether the News cover migration is applied. Obtain a reliable ledger/catalog diff and verified backup/restore path; resolve duplicate migration versions and rehearse additive changes in an isolated environment. Do not fake ledger entries or replay migrations.
- [ ] Confirm legal owner/controller identity, actual data collection and retention, processors/transfers, privacy/correction/report handling, governing terms, and who monitors public contact channels. Obtain Nigerian legal-professional review before publication-grade legal claims.
- [ ] Record the exact production deployment SHA and verify real News, auth, and other critical public behaviors read-only. Do not infer this from a green Vercel check.

**Exit:** approved scope, domain/host arrangement, canonical app boundary, legal/data owners, and a documented safe production baseline—or explicit release blockers where those decisions are not available.

### Phase 1 — Design system, shared components, and navigation

- [ ] Reconcile one token/typography/spacing/color system with `docs/05-design-system.md`; use semantic tokens, approved local fonts, real credited imagery, and consistent focus/error/success/unavailable states.
- [ ] Redesign public header, footer, page frames, typography, buttons, search/filters, cards, form fields, status badges, dialogs/drawers, pagination, and empty/loading/error components.
- [ ] Complete and verify responsive bottom navigation on **both `/news` and `/dashboard`**, in the order **Home, News, Discover/Explore, Account**. PR #108 current-main baseline remains 11 pass / 2 fail. Latest old-head #109 diagnostic on `81b2344…` is 10/13 pass, with the false `/tourism` fallback removed and direct keyboard News-tab check included. Its three remaining failures appear to be harness locator issues (375px desktop/mobile landmark ambiguity; 768px drawer closes before lookup; desktop disclosure selector scope), not confirmed UI defects; Tester is correcting selectors. It predates the gutter fix and is preliminary. New local candidate `b447a5a` reports direct News keyboard activation working, intact named landmark/four routes, 16px gutter at 320px and 20px at 375px, plus 287 passed / 1 skipped local tests and nine-width smoke. It remains unpushed; README SHA/build statement is being updated. Corrected-selector rerun on a new exact head is pending. No schema/service-role change and safe public query are separate from UI acceptance.
- [ ] Review navigation reachability and active state across mobile/tablet/desktop; menus cannot rely on hover and must not trap focus.

**Exit:** shared shell/components pass keyboard, touch, responsive and accessibility checks; bottom-nav screenshots and tests are linked to the exact UI candidate SHA.

### Phase 2 — Public information and editorial experience

- [ ] Complete the homepage, About, News list/article, contact/advertising status, legal/policy, gallery, and photo-credit redesigns.
- [ ] Verify real public News data, published-version privacy, article metadata, image attribution, and all empty/error/not-found behavior.
- [ ] Complete business-directory listing/search/detail/submission UI only within approved scope; keep orders/payments explicitly unavailable if not approved.

**Exit:** public pages share one deliberate identity, every CTA is truthful, content is source-backed, and public forms cannot silently drop user input.

### Phase 3 — Authentication, member profile, and member actions

- [ ] Redesign all auth/status screens and the member dashboard/profile form.
- [ ] Verify signup, verification delivery, callback, sign-in/out, recovery, link expiry, own-profile edits, and session/capability boundaries in an isolated Supabase environment.
- [ ] Complete member-only posting/reply/vote/report/contribution journeys that are approved and persist safely; retest News and dashboard bottom navigation.

**Exit:** member paths work end-to-end with truthful delivery and server-confirmed states; anonymous, expired, suspended, and unauthorized paths fail safely.

### Phase 4 — Community and discovery modules

- [ ] Redesign History, Forum, Map, Tourism, Radio, and Who-is-Who pages and their forms/review states.
- [ ] Verify sourcing, consent, publication/privacy boundaries, reports/moderation, abuse controls, map handoff, image rights, and actual stream status.
- [ ] Keep missing data/providers represented as deliberate unavailable states; do not invent content to fill layouts.

**Exit:** each approved module has evidence-backed public and member journeys, trustworthy empty/error states, and the relevant server/database tests.

### Phase 5 — Staff/Admin workspace and operational workflows

- [ ] Redesign the Admin shell, dashboard, newsroom list/editor/settings, users/roles, people, Tourism, Radio, Forum moderation, History review, business review/moderation, and scope-approved order operations.
- [ ] Verify staff login, direct unauthorized requests, least-privilege roles, current capability checks, stale revision rejection, audit events, actual metric/error handling, and form persistence.
- [ ] Consolidate the parallel Admin route trees deliberately; do not allow divergent dashboards or rely on hidden controls as the security boundary.

**Exit:** authorized staff can complete approved work; unauthorized users cannot; UI, server and database policy agree; mobile/table and error states are usable.

### Phase 6 — Full-product verification and release

- [ ] Run release gates on the exact pushed candidate SHA (commands and environment below).
- [ ] Test every route and key journey in the matching preview with isolated fixtures and least-privilege test identities. Capture route/state screenshots and label local-only captures as local.
- [ ] Complete accessibility and responsive checks, including 320/375/390/768/1024/1280/1440px, keyboard, screen-reader names/landmarks, 200% zoom/reflow, reduced motion, focus, touch target, and no horizontal overflow.
- [ ] Verify integrations only with appropriate isolated credentials and test recipients. Keep contact/newsletter, email, Storage uploads, Maps API, Radio, Paystack and payments unavailable until their complete paths and ownership are proven.
- [ ] Merge only through the normal review path with healthy exact-head checks. After merge, verify the exact Production deployment SHA and run read-only smoke tests; do not write production test content or perform unapproved schema/account changes.

**Exit:** the reviewed source SHA, hosted checks, preview URL, screenshot set, isolated end-to-end results, production deployment SHA, scope decision, and remaining blockers are all recorded together.

## Release and evidence gates

### Exact-SHA code and hosted checks

For each UI/product PR, record the commit SHA and run the pinned Node.js 22 / pnpm 10.34.9 workspace gates: frozen-lockfile install, `pnpm typecheck`, production builds for both maintained apps, full `pnpm test`, the configured high-severity dependency audit, and `git diff --check`. Do not waive unexplained failures. A documented PGlite exclusion-constraint skip is not a live Supabase test. Require healthy hosted CI/CodeQL and a Vercel preview tied to the same head; Supabase Preview must be reported as passed or explicitly skipped with its reason.

### Route, flow, preview, and screenshot evidence

- Test the complete route and journey inventory above, not only the homepage or a focused unit-test slice.
- Cover success, loading, empty, unavailable, error, denied/unauthenticated, expired-link, stale-revision, and no-results states where applicable.
- Capture at minimum desktop 1440px and mobile 390px for each route group, plus 320/375px stress captures for critical pages/forms and the News/dashboard bottom nav. Include open navigation and relevant empty/error/denied states.
- Every screenshot README must record exact SHA, preview URL or `local` label, date, viewport, fixture/data source, and test role (never credentials). A local screenshot or a Vercel “success” status alone is not hosted visual sign-off.

### Data, security, accessibility, and production safety

- Use only approved content, credited/licensed media, and isolated synthetic data. No production test articles, orders, payments, accounts, or migration writes.
- Exercise anonymous/member/staff boundaries, RLS, capability revocation, private drafts/submissions, own-row updates, server-side input validation, stale revisions, audit events, and safe error messages.
- Keep service-role secrets out of browser bundles and docs. Do not trust client-submitted payment state, role, ownership, or success claims.
- Verify keyboard, focus, screen-reader labels, contrast (WCAG 2.2 AA target), reduced motion, 200% zoom/reflow, and touch targets; automated accessibility tooling is not certification.
- After normal merge, verify the deployed SHA and public read-only behavior. Production schema changes require a reconciled ledger/catalog, backup/restore rehearsal, isolated rehearsal, and explicit authorization.

## Open blockers and scope boundaries

1. **Full redesign acceptance:** draft UI PR #109 provides a first slice but is on conditional hold pending gutters, accessibility/route fixes, a corrected SHA-tagged screenshot README, a passing exact-head harness rerun, and independent review. It is not the complete route-by-route redesign; public, auth/member, Admin routes, forms, persistence, permissions, and end-to-end workflows remain unfinished. No Vercel project is connected for the hosted UI preview.
2. **Bottom navigation:** PR #108 (`2c0e251…`, based on `45aee278…`) retains its current-main baseline of 11 pass / 2 fail. Latest diagnostic on old PR #109 SHA `81b2344…` is 10/13 pass, with false `/tourism` fallback removed and direct keyboard News-tab check included. Three remaining failures appear to be harness locator issues—not confirmed UI defects: 375px desktop/mobile landmark ambiguity, drawer closes before lookup at 768px, and desktop disclosure selector scope. Tester is correcting selectors. This run predates the gutter fix and is preliminary. New local candidate `b447a5a` reports 287 passed / 1 skipped tests, nine-width smoke, direct News keyboard activation working, and 16px/20px gutters, but remains unpushed; README SHA/build statement is in progress. Keep these local results separate from the old PR head. Await corrected-selector rerun and new exact candidate before sign-off. No hosted UI preview or full-product acceptance is established; safe query/no schema-service-role findings remain separate from UI acceptance.
3. **Scope:** all eight modules appear in the current master plan, but historical Phase 1 scope differed. Resolve the crosswalk. Marketplace checkout, payments, delivery, paid placements, and order management are not approved merely by a request to redesign the whole UI.
4. **Production schema/data:** historical audits disagree on migration inventory and ledger state, including the News cover migration. No current read-only schema/ledger reconciliation or verified restore procedure is recorded here. Freeze production writes until it is reconciled.
5. **Domain/deployment:** repository canonical origin is currently `epelawa.vercel.app`; a custom-domain launch and DNS/TLS verification are not evidenced in this snapshot. Do not claim custom-domain readiness or change canonical hosts without owner approval.
6. **Legal and contact/report operations:** privacy, terms, moderation/corrections, retention, controller identity and legal jurisdiction require factual owner input and Nigerian legal review. Contact/report/privacy/correction/newsletter/advertising intake remains unavailable unless a monitored, persistent path is demonstrated.
7. **Providers and data:** email delivery, Storage uploads, Maps API/Places/geocoding, Radio stream rights/availability, and Paystack/payment operation require provider-specific configuration and isolated end-to-end tests. No fake live, success, schedule, map, or payment state.

## Preserved sources and related project documents

The complete source text is preserved in dated readable copies, with the exact uploads retained in a compressed bundle. The readable copies normalize only trailing Markdown hard-break whitespace and the final blank line for repository whitespace checks; see the [archive note, checksums, and exact-originals bundle](archive/source-audits/2026-11-15/README.md). None of the supplied originals was deleted or silently overwritten:

- [Full UI blueprint and AI implementation brief](archive/source-audits/2026-11-15/2026-11-15-full-ui-blueprint.md)
- [Complete UI/UX audit and redesign direction](archive/source-audits/2026-11-15/2026-11-15-ui-ux-audit.md)
- [Overall repository, product, and production-readiness audit](archive/source-audits/2026-11-15/2026-11-15-overall-repository-audit.md)

Use this document as the current status/checklist snapshot, alongside the existing [master plan](00-master-plan.md), [product requirements](01-product-requirements.md), [user journeys](02-user-journeys.md), [sitemap](03-sitemap.md), [design system](05-design-system.md), [permissions/security](08-permissions-security.md), [testing acceptance](11-testing-acceptance.md), [roadmap](12-development-roadmap.md), and [owner requirements checklist](17-owner-requirements-checklist.md). Where scope, domain, legal, or production facts conflict, keep the issue marked open until the owner and appropriate evidence settle it.
