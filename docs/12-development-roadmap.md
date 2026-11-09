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

## Current handoff — 2026-11-09 11:32 WAT

- Current local branch: `feat/auth-reference-redesign`, based on merged PR #23 (`cf7c8f0`). Auth redesign is implemented and locally verified; a PR/hosted preview has not yet been created or checked. Use GitHub CLI wrapper and Vercel CLI only; no browser login.
- This auth batch keeps PR #23’s staged signup/login behavior and server actions, adds the supplied reference composition, accessible password visibility, a visibly disabled Google option, compact storage-notice copy, and responsive no-scroll auth styling. Auth CSS remains scoped. A new screenshot archive is at `/workspace/epe-lawa-release-screenshots/phase6-auth-reference-final/`; captures are from the local production build, not the live site.
- Node 22.23.4/pnpm 10.34.9: workspace typecheck passed **5/5 tasks**; both production builds passed **2/2 tasks**; full suite passed **139 tests: 138 passed, 0 failed, 1 documented PGlite skip**. Local production-build Playwright passed **20 auth route/viewport combinations** at 320/375/768/1024/1440px plus **9 interaction checks**. No vertical overflow, notice/card intersection, external requests or page errors were observed.
- PR #22 same-origin staff routing and PR #23 member auth polish are merged/deployed per earlier CLI verification. This batch made no production Supabase schema/data/auth-setting changes. Email delivery is not live-verified; keep Google disabled.
- A separate newsroom `article.create` gate change and its focused regression are preserved in local stash `Separate newsroom-create-access follow-up`; do not include that independent fix in the auth PR. Reapply it on its own branch and rerun focused/full gates before opening the next PR.
- The local-only migration audit of nine logical stacks found blockers, including duplicate version `20261107213000`, migration-ledger/name conflicts, authorization/schema helper drift, and risk findings requiring code/data-safe corrections across member/forum/business/history/editorial/radio/tourism work. No migration was applied. The owner authorized migration application only after this reconciliation; do not apply production changes before the fixes and full dry-run review.
- Next: commit/push the focused auth change with author and committer email `info.epelawa@gmail.com`, open PR #24 via the authenticated GitHub CLI wrapper, inspect its exact Vercel preview with the saved CLI token, and merge normally only if the preview/checks are healthy. Then handle the separate newsroom gate and migration reconciliation one focused PR at a time.

## Section 5 future enhancements (retained in full roadmap)

These are future roadmap items, not a reason to omit them or imply they are already implemented: event ticketing; emergency contacts; scholarship/job board; e-learning; English/Yoruba support; and an AI-powered local assistant. Native mobile applications alone are deferred from the current web scope.

## Known blockers and release rules

Production Supabase currently has remote migration-ledger/name conflicts and schema drift found by read-only CLI inspection. No migration, auth-setting or unrelated production-data writes have been made in this batch. Reconcile the migration files and data/authorization semantics locally, run local schema/tests and CLI dry-run/ledger review, then apply only the owner-authorized migration plan. Do not claim a hosted preview, production build or provider-delivery success for a branch until it has been checked.


### 2026-11-09 11:35 WAT — PR #24 opened

PR #24 is open at https://github.com/epelawa/EPE-LAWA/pull/24 on `feat/auth-reference-redesign`. Its initial implementation commit is `5a6ca448f941992a37cdcae006c16bd09a7f2453`; this branch also has a follow-up documentation update in progress. The Vercel preview and hosted checks have not yet been inspected. Continue through the authenticated GitHub CLI wrapper and read-only Vercel CLI only; do not browser-login or merge until the exact latest preview/check state is healthy.
