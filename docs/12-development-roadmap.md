# EPE-LAWA — Development Roadmap

**Status:** Active. The release includes all eight client-approved web sections and cross-cutting identity, staff, privacy, performance, accessibility and release requirements. Native mobile apps alone are deferred.

## Product and delivery rules

The eight web sections are Trending News, Itan Ilu Mi / My Community History, Chat Forum / Digital Village Square, Map & Navigation, Epe Business Directory & Marketplace, Historical Sites & Tourism, EPE LAWA Radio, and Who is Who in Epe. Keep section 5 future enhancements in the full roadmap: event ticketing, emergency contacts, scholarship/job board, e-learning, English/Yoruba support, and an AI-powered local assistant. Follow Sckooly’s public-site structure, use original EPE-LAWA content and the approved cobalt palette, and do not copy assets or invent facts/content. Test content remains private in isolated environments.

A verified staff member with `article.publish` may publish directly without a second reviewer. Reject stale revisions and audit transitions. Do not claim email, Paystack, Maps API, or other provider integrations are operational without verification. The current map uses safe outbound Google Maps search/directions URLs; offline maps remain optional future work.

## Work sequence and gates

| Workstream | Required work | Acceptance evidence |
| --- | --- | --- |
| Foundation and UI | Premium responsive shell and all eight module routes, honest states, footer/nav rules | Typecheck/build/tests; current route inventory; required 320/375/768/1024/1440 matrix; accessibility and dead-link audit |
| Member identity | Signup, verification, login/logout, recovery, profile/dashboard, secure sessions | Isolated account and negative access tests; generic recovery/sign-in responses; email delivery only after authenticated sender test |
| Staff/admin | Same-origin `/admin/*`, verified staff session, fresh capability checks, real analytics and audit | Unauthorized/authorized checks; no service credentials in browser; each mounted workflow tested with safe isolated data |
| Trending News | Published-only listing/search, private drafts/previews, revision-aware direct publish and audit | Isolated private draft/publish/stale revision tests; public reads exclude drafts |
| Community History | Provenance, consent, private contribution, review, correction/dispute/takedown | Private fixtures/access tests; only explicitly approved records public |
| Digital Village Square | Authenticated threads/replies/reports, reasoned moderation and audit | Member/moderator and negative permission tests |
| Map & Navigation | Manual search and safe external directions handoff | URL-safety, labels, no default GPS/private address exposure; no API integration claim |
| Directory & Marketplace | Reviewed listings, real products, protected order/payment paths as configured | Isolated data; sandbox provider tests before enabling payment; no production fake orders |
| Historical Sites & Tourism | Sourced destinations, approved descriptions and verified visit details | Source review, location facts/map handoff, empty/error states |
| EPE LAWA Radio | Rights-cleared player/schedule/archive only when approved records exist | Official stream rights/URL/format/playback evidence; truthful unavailable state |
| Who is Who in Epe | Verified public profiles and correction path | Human role-verification evidence, privacy/public-field audit and correction tests |
| Integrated release | Full Playwright, accessibility, responsive, privacy and security review | Record actual commands/results; unverified external gates remain blockers |

## Current handoff — 2026-11-09 12:28 WAT

- Current auth branch: `feat/auth-reference-redesign`; PR #24 is OPEN at https://github.com/epelawa/EPE-LAWA/pull/24. The latest auth source has passed local gates; verify the exact current PR head with GitHub/Vercel CLI before any merge. No browser login.
- PR #24 now uses the supplied auth reference across member/staff login and recovery screens, keeps member signup staged, and preserves server actions/redirects. Google sign-in remains visible but disabled/labeled Coming Soon at every checked width. On 320px screens the shortened art copy is fully readable; all 44px controls fit above the fixed storage notice. Manual pull-to-refresh code was removed while normal document scrolling remains available.
- Node 22.23.4/pnpm 10.34.9: workspace typecheck **5/5 tasks**, both production builds **2/2 tasks**, full suite **138 tests: 137 passed, 0 failed, 1 documented PGlite skip**. The local production-build Playwright matrix passed **30 route/viewport checks** across 320×568, 320×640, 375×812, 768×1024, 1024×768 and 1440×900, plus the recorded login/signup/theme/overscroll interactions. No scroll overflow, card/notice overlap, page errors or external requests were observed.
- Fourteen final local-build captures are in `/workspace/epe-lawa-release-screenshots/pr24-auth-pull-refresh/`; they are not hosted/live screenshots. PR #22 and PR #23 remain previously merged/deployed. No production Supabase schema, migration, auth setting or user content was changed; real email delivery remains unverified.
- The independent newsroom `article.create` gate is now PR #25, OPEN at https://github.com/epelawa/EPE-LAWA/pull/25. It reads only the signed-in user's RLS-scoped active grant while the database RPC remains the write-time enforcement. Production draft creation remains unproved until schema drift is reconciled.
- The previous PR #24 preview redirected to Vercel SSO and GitHub check/status endpoints returned 403. Recheck the exact next pushed head through CLI; required status is not confirmed, so do not merge while that blocker remains. The local nine-stack migration audit still identifies duplicate version `20261107213000`, remote ledger/name conflicts and authorization/schema drift. No production migration has been applied.
- Next: push the fully tested auth branch via CLI, inspect the exact new preview/check state without browser login, leave PR #24 open if checks remain inaccessible, and continue the next independent web fix. Keep PR #25 separate and do not claim staff draft creation works in production.

## Section 5 future enhancements (retained in full roadmap)

These are future roadmap items, not a reason to omit them or imply they are already implemented: event ticketing; emergency contacts; scholarship/job board; e-learning; English/Yoruba support; and an AI-powered local assistant. Native mobile applications alone are deferred from the current web scope.

## Known blockers and release rules

Production Supabase currently has remote migration-ledger/name conflicts and schema drift found by read-only CLI inspection. No migration, auth-setting or unrelated production-data writes have been made in this batch. Reconcile the migration files and data/authorization semantics locally, run local schema/tests and CLI dry-run/ledger review, then apply only the owner-authorized migration plan. Do not claim a hosted preview, production build or provider-delivery success for a branch until it has been checked.


### 2026-11-09 11:35 WAT — PR #24 opened

PR #24 is open at https://github.com/epelawa/EPE-LAWA/pull/24 on `feat/auth-reference-redesign`. Its initial implementation commit is `5a6ca448f941992a37cdcae006c16bd09a7f2453`; this branch also has a follow-up documentation update in progress. The Vercel preview and hosted checks have not yet been inspected. Continue through the authenticated GitHub CLI wrapper and read-only Vercel CLI only; do not browser-login or merge until the exact latest preview/check state is healthy.


### 2026-11-09 11:38 WAT — PR #24 preview and check-access result

Vercel CLI confirmed deployment `epe-lawa-h90vmkk31-epe-lawa.vercel.app` READY for exact head `3e143f6ed9e514c24c52b8a1be74d19cd0b5e7ea`. An unauthenticated HTTP request redirects to Vercel SSO, so the protected preview was not opened or presented as reviewed; the local-production screenshots remain the honest visual evidence. GitHub `pr checks`, REST commit status and deployment listing all return HTTP 403 for this connector. PR #24 is OPEN and MERGEABLE, but required-check state cannot be confirmed; **do not merge**. Continue the separate local newsroom permission fix without browser login or production Supabase writes.


### 2026-11-09 14:05 WAT — PR #29 staff-login short-height layout

PR #29 is open at https://github.com/epelawa/EPE-LAWA/pull/29 on `fix/staff-login-short-height`, stacked on PR #24’s `feat/auth-reference-redesign` base. It contains only the staff-login error-state layout, the conditional scroll fallback, and its focused regression coverage. Keep the PR open for review.

Final Node 22.23.4/pnpm 10.34.9 gates: workspace typecheck **5/5 tasks**, both production builds **2/2 tasks**, and full suite **138 tests: 137 passed, 0 failed, 1 documented PGlite skip**. Local production-mode Chromium captures cover 320×568 clean/error, 375×568 error, 320×640 error and a 320×480 fallback exercise. At 320×568 and 375×568 the card, submit button and staff links sit above the fixed notice with no document overflow; all measured submit/switch actions remain 44px high. At 320×640 the error form is centered. The injected error copy is a local visual fixture; no credentials were submitted.

Screenshot artifacts: `/workspace/epe-lawa-release-screenshots/pr29-staff-login-shortheight/after-clean-320x568.png`, `after-error-320x568.png`, `after-error-375x568.png`, `after-error-320x640.png`, and `after-error-fallback-320x480.png`. These are local captures, not Vercel or production screenshots. Exact-head Vercel deployment and GitHub check visibility are still to be inspected with CLI; do not claim hosted review or merge. No production Supabase settings, schema, migrations, content, or account data were changed.
