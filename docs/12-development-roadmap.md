# EPE-LAWA — Development Roadmap

**Status:** Active. Scope is the all eight client-approved web sections in `docs/01-product-requirements.md`, plus cross-cutting requirements. No out-of-scope modules are planned in this release.

## Product and delivery rules

The eight sections are Trending News, Itan Ilu Mi / My Community History, Chat Forum / Digital Village Square, Map & Navigation, Epe Business Directory & Marketplace, Historical Sites & Tourism, EPE LAWA Radio, and Who is Who in Epe. Native mobile apps alone are deferred. Keep section 5 future enhancements in the complete roadmap: event ticketing, emergency contacts, scholarship/job board, e-learning, English/Yoruba support, AI-powered local assistant. Rebuild the web experience using Sckooly’s public-site structure, original EPE-LAWA content and the latest owner-approved cobalt palette, compact 90% typography and a full from-scratch UI rebuild informed by Sckooly, GetQuant and JĀSĀB. Do not copy assets or invent facts/content. Test content remains private in isolated environments; production is read-only.

A verified staff member with `article.publish` may publish directly without a second reviewer. Reject stale revisions and audit transitions. Do not claim email, Paystack, or Maps API integrations are operational without verification. Current map functionality uses safe outbound Google Maps search/directions URLs; offline maps are optional future work.

## Work sequence and gates

| Workstream | Required work | Acceptance evidence |
| --- | --- | --- |
| Foundation and UI | Public shell, responsive eight-module navigation, staff/public boundaries, honest states | Typecheck/build/tests; route audit; Playwright at 320/375/768/1024/1440; no dead links or false content |
| Member identity | Signup, verification, login/logout, recovery; secure member sessions | Isolated account and negative access tests; generic recovery/sign-in responses |
| Staff/admin | Verified staff sessions, fresh capability checks, admin analytics from real queries, audit | Unauthorized and authorized Playwright checks; no service credentials in browser bundle |
| Trending News | Published-only listing/search; private drafts/previews; revision-aware direct publish, corrections and audit | Isolated private draft/publish/stale revision tests; public reads exclude drafts |
| Community History | Provenance, consent, private contribution, review, correction/dispute/takedown | Private fixtures and access tests; only approved records public |
| Digital Village Square | Authenticated threads/replies/reports; reasoned moderation and audit | Member/moderator Playwright and negative permission tests |
| Map & Navigation | Manual search and safe external directions handoff | Verify URL safety, labels, no default GPS/private address exposure; no API integration claim |
| Directory & Marketplace | Reviewed listings, real products, protected order/payment paths as configured | Isolated data; real provider sandbox required before enabling payment; production read-only |
| Historical Sites & Tourism | Sourced destination records, approved descriptions and verified visit details | Source review; location facts and map handoff checked; empty/error states verified |
| EPE LAWA Radio | Stream player, status, schedule/archive where approved records exist | Rights/URL/format/playback evidence; unavailable state checked; no invented programming |
| Who is Who in Epe | Searchable verified public profiles and correction path | Human verification evidence for roles; privacy/public-field audit and correction tests |
| Transactional email | Branded verification/recovery templates and essential notices | Template rendering; provider delivery only claimed after authenticated sender and test evidence |
| Integrated QA/release | Full Playwright, accessibility, responsive, privacy and security pass | Record actual command/browser results; unresolved external gates remain blockers |

## Section 5 future enhancements (retained in full roadmap)
These are future roadmap items, not a reason to omit them or imply they are already implemented: event ticketing; emergency contacts; scholarship/job board; e-learning; English/Yoruba support; and an AI-powered local assistant. Sequence and acceptance gates require owner planning and evidence. Native mobile applications alone are deferred from the current web scope.
Do not mark any gate complete without evidence. No commit, push or merge is implied by this roadmap.

## Known status

A supplied Vercel log documents an older `main` build failure at `8885e16` from unresolved helper imports and Turbo-filtered environment variables. Helpers now exist in the worktree, but a current build and preview have not thereby been proven. The public alias returned older site content and does not verify this branch. No isolated Supabase development branch was created. Email sender authentication and Paystack setup remain unconfirmed. The map page does not use a configured Google Maps API, Places or geocoding integration.


## 2026-11-09 — Community History correction disclosure (PR #30)

The public Itan Ilu Mi archive and staff History review page now state that published-record correction/removal handling is **Coming Soon**. The current contribution queue is explicitly described as new-contributions-only; no nonfunctional form or false delivery promise was added. This is a truthful disclosure, not an implemented correction workflow. No existing record is edited or withdrawn.

Local verification on Node 22.23.4/pnpm 10.34.9 passed workspace typecheck (5/5), both production builds (2/2), focused History tests (11/11), and the complete suite (140 passed, 0 failed, 1 documented PGlite skip). The final main-app production build was rerun after the temporary screenshot route was removed. Local production-mode screenshots, not hosted captures: `/workspace/epe-lawa-release-screenshots/pr30-history-correction-coming-soon/375x812-public-history.png`, `1440x900-public-history.png`, `375x812-staff-history.png`, and `1440x900-staff-history.png`. The staff screenshots used a temporary local-only fixture inside the same-origin shell; the fixture was removed before the final build.

PR #30 is open and unmerged at `https://github.com/epelawa/EPE-LAWA/pull/30`, head `ce96a1e05049e3264a5d33a618cd820f8f80f36f`. Read-only Vercel CLI inspection reports the exact preview READY, but HTTP redirects to the Vercel SSO login, so hosted page content could not be reviewed. The PR summary is CLEAN; individual GitHub checks are inaccessible through the CLI integration. No production Supabase settings, schema, migrations, or data were changed.

The durable correction intake and audited staff edit/withdraw path remain blocked until migration-ledger conflicts and production schema drift are reconciled. Next gate: produce a read-only CLI reconciliation plan with explicit backup, ledger/schema comparison, migration ordering, and rollback safeguards; do not write production changes while conflicts remain.


## 2026-11-10 — Current release snapshot after PR #30 merge (as of 09:30 WAT)

PR #30 was normally squash-merged at `6a48e5f02d210fef29c471daac9992e1e4693039`; exact merged main passed 5/5 typecheck tasks, 2/2 build tasks, and 140 tests with 0 failures and 1 documented PGlite skip. PR #24's original head passed its exact local gates, but GitHub marked it CONFLICTING after main advanced. The local merge showed conflicts only in the roadmap, tracker, and progress log; main's newer documents were selected, while the auth source merged cleanly. The combined PR #24 merge-forward tree, with main commit `6a48e5f02d210fef29c471daac9992e1e4693039` as its second parent, passes exact-head checks: 5/5 typechecks, 2/2 builds, and 139 tests (0 failures, 1 documented PGlite skip). It is locally committed but not yet pushed; the new Vercel preview and GitHub mergeability must be refreshed before any merge. PR #29 is based on #24 and must be retargeted to `main` after #24 merges. The owner-directed sequence remains normal CLI merges after exact-head checks, followed by testing updated `main` after each merge. Never bypass protections. Hosted `gh pr checks` details remain inaccessible (403), and Vercel previews redirect to SSO; do not claim hosted content or checks are verified.

The production alias `https://epelawa.vercel.app` returned HTTP 200 for the homepage, the eight module routes, `/auth`, and `/admin/login`. This is only an HTTP route-existence check; it does not prove route content, session enforcement, database access, or feature completion. Current local screenshots for PRs #24 and #27–#30 are under `/workspace/epe-lawa-release-screenshots/`; PRs #25 and #26 have no PR-specific captures in the archive. The separate homepage-only cookie-notice worktree is not yet a PR and has no current screenshot.

The 2026-11-09 Supabase CLI audit remains the production blocker. Seven migration versions are recorded remotely, 22 later local files are unrecorded, two local migrations duplicate version `20261107213000`, pending SQL calls an absent `has_capability(text)`, and the live `require_capability(text)` definition/security/grants differ from the local migration. The scoped probe also found key expected objects absent. No complete schema dump or verified backup was possible. Production settings, migrations, roles and data remain untouched; see the read-only details and safe reconciliation sequence in `docs/07-database-schema.md`.

Next: finish the PR #24 main-merge resolution, rerun exact-head gates, push it normally, refresh GitHub/Vercel status, and merge only if clean; test updated `main`. Then retarget PR #29 to `main`, verify and merge it after #24, and continue with independently healthy PRs #25–#28, testing `main` after each. After the existing PRs are resolved, complete the homepage-only cookie notice and remaining safe web features in one comprehensive feature PR with screenshots and synthetic checks. Native mobile remains deferred; production Supabase stays read-only and provider/schema-blocked features stay honestly unavailable.


## 2026-11-10 09:38 WAT — Current release snapshot (supersedes 09:30 status)

PR #30 is merged to `main` at `6a48e5f02d210fef29c471daac9992e1e4693039`. PR #24 is pushed at `7ac8afada2a6d05738f9ee0e8b2dbfdabf8c3747`; its exact local gates pass 5/5 typechecks, 2/2 builds and 139 passed / 0 failed / 1 documented PGlite skip. The new Vercel branch deployment is READY (`epe-lawa-9yjvqm7j3-epe-lawa.vercel.app`) and the alias returns HTTP 302 to SSO; deployment JSON does not expose a commit SHA. GitHub reports `mergeable=MERGEABLE`, but `mergeStateStatus=UNSTABLE`; `gh pr checks` returns 403. Keep #24 open until status is clean and required checks are understood.

PR #25's original head `09a2470d50e0eff6ff3ee98a54568799478475f0` passed 5/5 typechecks, 2/2 builds and 140 passed / 0 failed / 1 documented skip. After merging updated main locally, conflicts were limited to status documents; source changes merged automatically. The combined, not-yet-committed PR #25 candidate passes 5/5 typechecks, 2/2 builds and 142 passed / 0 failed / 1 documented skip. Its GitHub state is currently UNKNOWN and its branch alias resolves to an older READY preview created 2026-11-09 11:14 UTC; a fresh preview is needed after pushing the sync commit. PRs #26–#28 still require current-state refresh; PR #29 remains dependent on #24.

Next: commit and push the tested PR #25 main-sync without force; refresh its Vercel deployment and GitHub state; merge only via the normal CLI if healthy, then retest updated `main`. Keep PR #24 open while UNSTABLE and resume it when GitHub reports clean. Continue through the independent PRs; after those are resolved, complete the homepage-only cookie notice and the safe remaining web features in the comprehensive feature PR. Native mobile stays deferred; production Supabase remains read-only while migration drift is unresolved.


## 2026-11-10 09:40 WAT — PR #25 exact-head checkpoint

PR #25's local merge-forward now includes the original newsroom-gate commit `09a2470d50e0eff6ff3ee98a54568799478475f0` and updated-main parent `6a48e5f02d210fef29c471daac9992e1e4693039`. Exact local gates pass with Node 22.23.4/pnpm 10.34.9: 5/5 typechecks, 2/2 builds and 142 passed / 0 failed / 1 documented PGlite skip. It is committed locally but not yet pushed; after the non-force push, verify a new Vercel deployment and GitHub mergeability. The previous PR #25 preview is from Nov 9 and does not cover this tree. GitHub status details remain inaccessible. PR #24 remains open while GitHub reports UNSTABLE despite its local gates and READY preview; do not merge until status is clean.


## 2026-11-10 09:49 WAT — Post-PR #25 merge and PR #26 checkpoint

PR #25 was normally squash-merged to `main` as `0bd1fd1eac09fa5905dc6f4437723fd209124fa8`. Exact updated-main verification on Node 22.23.4/pnpm 10.34.9 passed 5/5 typechecks, 2/2 builds and 142 passed / 0 failed / 1 documented PGlite skip. The post-merge Vercel Production deployment `epe-lawa-13fhfmmoz-epe-lawa.vercel.app` is READY, and `https://epelawa.vercel.app/` returns HTTP 200; this confirms deployment and route response only, not full feature behavior.

PR #26 original head `c8d0cbae86a421c4eae2c70d1c600a231990338f` passed 5/5 typechecks, 2/2 builds and 139 passed / 0 failed / 1 documented skip. Its local merge-forward now uses latest main parent `0bd1fd1eac09fa5905dc6f4437723fd209124fa8`; only the three status documents conflicted, while code merged automatically. The combined candidate passed `git diff --check`, has zero unresolved paths, and passed 5/5 typechecks, 2/2 builds, and 143 passed / 0 failed / 1 documented skip. It is still an uncommitted local merge candidate; after this status update, rerun exact-head gates, commit, and push without force. GitHub currently reports UNKNOWN and the old Vercel preview is SSO-protected; a fresh deployment/status check is required after push.

PR #24 remains OPEN at `7ac8afada2a6d05738f9ee0e8b2dbfdabf8c3747`. After main advanced, GitHub now reports `mergeable=UNKNOWN` / `mergeStateStatus=UNKNOWN`; individual checks still return 403. Do not merge until its branch is updated with latest main, exact gates pass, and GitHub returns a healthy clean state. PR #29 remains dependent on #24. Production Supabase stays read-only during migration reconciliation.


## 2026-11-10 09:51 WAT — PR #26 exact merge-commit verification

PR #26 merge-forward commit `43772f73adc65f1f791dafd660e77080b0747db0` has PR #26 original head `c8d0cbae86a421c4eae2c70d1c600a231990338f` as first parent and latest main `0bd1fd1eac09fa5905dc6f4437723fd209124fa8` as second parent. Exact-head Node 22.23.4/pnpm 10.34.9 gates pass: 5/5 typechecks, 2/2 builds, 144 tests total (143 passed, 0 failed, 1 documented PGlite skip), with `git diff --check` clean. The branch remains local and unpushed; push through the authenticated CLI without force, then verify the new Vercel deployment and GitHub mergeability. Old preview readiness does not cover this commit. Do not merge unless the current PR state is clean/healthy; retest main after any merge.


## 2026-11-10 09:57 WAT — PR #27 main-sync verification

PR #27 original head `e241c2d5a5cb92711fd2703f66c79a3205430a14` passed 5/5 typechecks, 2/2 builds and 139 passed / 0 failed / 1 documented skip. Its local merge-forward includes updated main parent `0bd1fd1eac09fa5905dc6f4437723fd209124fa8`; conflicts were limited to the three status documents. The first combined typecheck found stale generated `.next` declarations for the removed screenshot-only `/radio-error-preview` route. That route is absent in source; after clearing only the unused admin `.next` directory (no dev server used it), a fresh combined gate passed 5/5 typechecks, 2/2 builds, 144 total tests (143 passed, 0 failed, 1 documented skip). This is a tested local candidate, not yet committed/pushed; repeat the exact-head gates after the current-status doc update.

PR #27 currently remains OPEN at its old remote head; GitHub reports UNKNOWN for mergeability, and individual checks return 403. Do not merge until the synced branch is pushed, its new preview is READY, and the normal CLI merge state is clean/healthy. PR #26's pushed preview is READY but GitHub state remains UNSTABLE; PR #24 is UNKNOWN after the latest main update. PR #25 is merged at `0bd1fd1eac09fa5905dc6f4437723fd209124fa8`; post-merge main tests passed and the production deployment is READY (homepage HTTP 200 only). Production Supabase stays read-only.


## 2026-11-10 09:58 WAT — PR #27 exact merge-commit checkpoint

PR #27's local merge-forward commit `a05061a22e67f7d537223ebd3851ec67a121103e` has original head `e241c2d5a5cb92711fd2703f66c79a3205430a14` and latest main parent `0bd1fd1eac09fa5905dc6f4437723fd209124fa8`. Exact-head Node 22.23.4/pnpm 10.34.9 gates pass: 5/5 typechecks, 2/2 builds, 144 tests (143 passed, 0 failed, 1 documented PGlite skip); `git diff --check` is clean. The branch is committed locally but not pushed; after including this status entry, rerun exact-head gates, push without force, and verify a fresh preview and current GitHub status. The existing visual evidence is `/workspace/epe-lawa-release-screenshots/pr27-radio-error-local/1440x900-radio-read-failure-local.png` and `/workspace/epe-lawa-release-screenshots/pr27-radio-error-local/375x812-radio-read-failure-local.png`.

PR #27 is still OPEN on its previous remote head; GitHub had reported UNKNOWN after main advanced, and individual checks remain inaccessible. PR #26's preview is READY but its merge state is UNSTABLE; PR #24 is UNKNOWN. No merge until the current PR is healthy. PR #25 remains merged, with exact post-merge main tests and a READY production deployment. Production Supabase remains read-only.


## 2026-11-10 10:01 WAT — PR #27 final branch verification

The final PR #27 branch head is `e6186c3c90fc9179d1995b0e1718e292d38b44f0`, with source merge commit `a05061a22e67f7d537223ebd3851ec67a121103e` and updated main parent `0bd1fd1eac09fa5905dc6f4437723fd209124fa8`. Final exact-branch checks on Node 22.23.4/pnpm 10.34.9 pass 5/5 typechecks, 2/2 builds, and 144 tests (143 passed, 0 failed, 1 documented PGlite skip). The progress log's full history was restored and verified; there is one PR #27 09:57 and one 09:58 heading. Local desktop/mobile screenshots exist at `/workspace/epe-lawa-release-screenshots/pr27-radio-error-local/1440x900-radio-read-failure-local.png` and `/workspace/epe-lawa-release-screenshots/pr27-radio-error-local/375x812-radio-read-failure-local.png`.

This final branch head is locally committed but not yet pushed. Push without force, then verify the exact new Vercel preview and current GitHub state; no merge until the deployment is READY and GitHub reports a clean healthy state. PR #26's pushed preview is READY but its merge state remains UNSTABLE, and PR #24 remains UNKNOWN. PR #25 is merged; no production database, Auth, role, or user-data changes were made.
