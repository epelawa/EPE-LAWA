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

Latest `main` is `203d7cae923a50dff7633a7ced8e77324bfcc06b` after the normal squash merge of [PR #48](https://github.com/epelawa/EPE-LAWA/pull/48); PRs #44, #45 and #46 remain merged. Vercel Production deployment `dpl_52yiTmDzdZwjPiXW357TeSwhNfAN` is `READY` for that exact production-target SHA. A read-only fetch of the [canonical `/auth/verify` route](https://epelawa.vercel.app/auth/verify) shows the branded code-entry screen; no email was sent or code submitted, so hosted email delivery and sender authentication remain unverified. The [canonical newsroom](https://epelawa.vercel.app/news) remains in its honest empty state.

The preserved `feat/full-web-implementation-release` worktree is now rebased onto exact `main` `203d7ca`. All 39 items saved before the rebase (16 tracked, 23 untracked) were byte-verified either in the restored worktree or as identical content already merged in `main`; the safety stash remains intact. Its remaining edits are still uncommitted and not released. A separate Tourism photo-reference candidate on the same base passed local typecheck, build, tests and five-width Playwright; it is not an approved destination listing and is not merged or deployed. PR #47 is open after its normal push onto `203d7ca`; GitHub reports merge state `UNKNOWN`, and the authenticated CLI's `gh pr checks` query is blocked with `Resource not accessible by integration`. No merge was attempted; leave it open until the exact hosted gate is visible and healthy. Production Supabase remains read-only; mail delivery, Paystack and live Maps providers remain unconfirmed.


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


## 2026-11-10 12:10 WAT — PR #26 merged; PR #27 sync candidate

PR #26 was merged normally with the repository’s squash strategy. Current `main` is `9b895366e93a68c5912b0c837c00ff4947ad0785`; the matching Vercel Production deployment is **READY**. Production route checks returned HTTP 200 for `/`, `/itan-ilu-mi`, `/news` and `/contact`. The live History page still displays PR #30’s “Coming Soon” correction badge; PR #32 remains open and has not changed production.

PR #27’s normal merge attempt was blocked by conflicts in `docs/12-development-roadmap.md`, `docs/14-tracker.md` and `docs/16-progress-log.md` after #26 advanced `main`. Its Radio source and focused test merged without conflict. A local merge-forward candidate resolves the three files from the current `main`, refreshes the tracker/roadmap, and includes local desktop/mobile screenshots at `docs/screenshots/pr27-radio-admin-read-errors/`. Exact local gates on Node 22.23.4/pnpm 10.34.9 pass: typecheck **5/5**, builds **2/2**, tests **145 total: 144 passed, 0 failed, 1 documented PGlite skip**. The candidate has not yet been committed or pushed; the existing PR head/preview do not validate it.

Next: commit with the required EPE LAWA identity, push without force, inspect a fresh exact-SHA preview and current GitHub state, then use only a normal merge if GitHub allows. PR #28 and #31 should be synced before merging, then #24 and dependent #29, with PR #32 last due to overlapping public-page/auth/documentation changes. GitHub check detail endpoints remain 403; no branch-protection bypass is permitted. Production Supabase remains read-only until migration drift is safely reconciled; native mobile remains deferred.


## 2026-11-10 12:22 WAT — PR #27 merged; PR #28 sync candidate verified

PR #27 was merged normally by the authenticated GitHub CLI (no branch-protection bypass). Current `main` is `1d41bfae8afa63f9c0558053f3a44368b65ce816`; Vercel Production for that exact SHA is READY. Post-merge verification on Node 22.23.4/pnpm 10.34.9 passed typecheck **5/5**, builds **2/2** and **145 tests: 144 passed, 0 failed, 1 documented PGlite skip**. Production `/radio`, `/admin/radio`, `/admin/login` and `/itan-ilu-mi` returned HTTP 200. The unauthenticated `/admin/radio` response includes a streamed safe redirect to `/admin/login?next=%2Fadmin%2Fradio`; no staff editor is exposed. The public History route still carries the prior “Coming Soon” badge; its replacement is in open PR #32.

PR #28 remains open at its old remote head `c3132dd456d238ae4dbc64f94348406277ad65c1`. Its local merge-forward includes current main and resolves only the three conflicting release documents to main. Ten prior local synthetic screenshots (mobile/desktop for Contact, About, Guidelines, Privacy and Terms) are now tracked under `docs/screenshots/pr28-public-contact-privacy/`; the README identifies these as local, pre-PR31/32 captures. The exact current working-tree candidate passes typecheck **5/5**, builds **2/2**, and **145 tests: 144 passed, 0 failed, 1 documented skip**; `git diff --check` is clean. It still needs a merge-forward commit, normal non-force push and fresh exact-head Vercel check. The current owner instruction is to leave PRs open for review; do not merge.

Production Supabase schema, migrations, authentication settings, roles and user content remain untouched. GitHub’s individual check APIs still return 403; no hosted CI pass is claimed.


## 2026-11-10 12:25 WAT — PR #28 pushed for review

PR #28’s main-sync commit `f422f418f8a4f0487a25c72d590be58d8bcfadcc` was pushed normally to its existing branch. It includes the latest main parent `1d41bfae8afa63f9c0558053f3a44368b65ce816`, refreshed docs and ten local screenshot captures. Exact-head local gates pass: typecheck 5/5, builds 2/2, tests 145 total (144 passed, 0 failed, 1 documented PGlite skip). GitHub reports PR #28 OPEN and CLEAN. Vercel reports the exact commit preview READY at `https://epe-lawa-oq13nm1fe-epe-lawa.vercel.app`; direct requests return HTTP 302 to SSO, so hosted content was not visually reviewed.

The PR description links the local screenshots and accurately notes that the images predate PR #31/#32. Per the owner’s current instruction, leave PR #28 open for review; do not merge. The next work is to sync and verify PR #31, then continue the auth pair and PR #32. Production Supabase remains read-only; native mobile remains deferred.


## 2026-11-10 12:44 WAT — PR #31 homepage-only storage notice

The storage/preferences notice is mounted on the homepage only, floats at a 12px bottom inset, remains dismissible and non-modal, and is hidden on News and Contact. Local production-build Chromium checks at 320×568, 375×812 and 1440×900 verified placement; News/Contact checks at 320px/375px found no notice, and no horizontal overflow was detected at 320px or 375px. Six screenshots and a capture README are tracked under `docs/screenshots/pr31-homepage-only-notice/`.

Node 22.23.4/pnpm 10.34.9 exact local gates pass typecheck 5/5, builds 2/2, and 144 tests passed with 0 failures and 1 documented PGlite skip. The optional CI audit is unavailable because its configured runner `scripts/audit/run.mjs` is missing. The sync candidate is based on current `main` at `5f131ab50e6f0fbd4bc02b4e64a3b5e9956c82a8`; push and exact Vercel preview verification remain pending. Keep PR #31 open for review. No production Supabase changes or native-app work were performed.


## 2026-11-10 13:13 WAT — Full status and resume point

Production `main` is `2446eca26f96f567d5b79e188b7d3a54498fcc20` (PR #31). The Vercel Production-only `NEXT_PUBLIC_SITE_URL` is now `https://epelawa.vercel.app`; the exact deployment is READY, and live homepage, sitemap and robots checks return HTTP 200. The canonical is the approved Vercel host; all 14 sitemap entries and the robots sitemap directive use it. This is a Vercel build-setting change only. Production Supabase remains read-only.

PRs #25–#28, #30 and #31 are merged. PR #24’s auth-reference UI is verified locally against the owner’s visual direction, but the synced tree still needs its normal push, exact preview check and refreshed GitHub state. PR #29 is the dependent short-height staff-login fix. PR #32 is the open module-workflow candidate. Treat PR #32 features as not live until its current branch is synced, tested and normally merged. The required local screenshots for PR #24 are under `docs/screenshots/pr24-auth-reference/`.

| Web area | Verified status | Remaining work or blocker |
| --- | --- | --- |
| Trending News | PR #25’s newsroom authorization-gate repair and the public reader are on `main`. PR #32 proposes headline search, pagination and offline article-copy download. | Recheck the synced PR #32 implementation and tests; keep drafts private and do not publish unapproved stories. Production publishing, stale-revision denial and audit are not proven against reconciled production schema. |
| Itan Ilu Mi / Community History | PR #30 discloses that correction/removal is unavailable; no false intake form was added. | A durable, audited correction/takedown workflow is not built. Keep honest wording until safe persistence and schema reconciliation exist; do not accept submissions that would be lost. |
| Chat Forum / Digital Village Square | PR #26 fixes moderation/report redirect handling. | Authenticated posting, moderation permissions, rate limits and audit remain unverified end to end against isolated data. |
| Map & Navigation | Safe outbound search/directions handoff exists; PR #32 proposes a selected-business directions workflow. | Verify the PR #32 target and URL-safety checks. No Maps API, Places, geocoding or offline map provider is configured; do not claim live maps or request private location by default. |
| Business Directory & Marketplace | Public/admin surfaces exist. | Complete durable listing/order review and payment only after production-safe persistence and a verified payment-provider sandbox. No Paystack readiness or successful payment is claimed. |
| Historical Sites & Tourism | Public routes and staff surfaces exist. | Source and owner-approve destination data and verify visit details. Do not invent attractions, hours or directions. |
| EPE LAWA Radio | PR #27 makes admin read errors distinct from empty records. | Stream rights, endpoint, format, playback, schedule and archive are not verified. Keep the player unavailable rather than falsely showing LIVE. |
| Who is Who in Epe | Public route exists. | No verified public profiles or complete correction/removal workflow are established; do not invent identities or roles. |

Cross-cutting status: the member auth reference layout passes local 320px, 375px and desktop fit checks, but this does not prove hosted mail delivery. Google sign-in stays disabled until the provider is genuinely configured; Supabase SMTP/sender authentication and OTP delivery remain unverified. The homepage-only preferences notice is merged in PR #31. The staff short-height fix is PR #29. The waitlist has no verified persistent live storage route, so no success state may discard submissions. The Codec Pro license was not supplied; use the legally usable Plus Jakarta Sans fallback already in the project. Native mobile remains deferred.

**Resume sequence:** (1) commit and normally push the exact-tested PR #24 sync; refresh its preview/GitHub state and attempt a normal merge only when healthy; (2) retarget/sync PR #29 to updated `main`, run its exact local gates and responsive screenshots, then resolve it normally; (3) sync PR #32 to the latest main, rerun full gates and module screenshots, and audit every remaining placeholder against its real backend/provider dependency; (4) open separate review PRs for safe, implementable gaps and leave genuine schema/provider blockers explicitly unavailable. After each merge, test the resulting `main` and confirm the exact Vercel Production deployment. Do not apply production Supabase migrations or change production Auth/roles/data while migration drift is unresolved.


## 2026-11-13 21:42 WAT — Homepage gallery in Production; theme candidate and full owner checklist

- The current `main` SHA is `9066e56d1c64b9882f8d01d297d06eac7f2177f8`, the normal merge commit for PR #44. Vercel Production deployment `dpl_7wUy2nxbqD2UmHfNec9yfa8rzhuZ` is `READY / PROMOTED`, built from that exact SHA; the canonical homepage returned HTTP 200. Its served HTML contains the requested map-pin location line, **“Epe · Lagos State,” after the hero image**.
- PR #44 supplies the 52-photo sourced Epe-only gallery, optimized responsive AVIF/WebP assets, visible per-image attribution, eager initial image, bounded prefetch, automatic rotation and reduced-motion/Save-Data safeguards. It was merged normally; no bypass was used.
- The homepage system-theme candidate is isolated on `feat/homepage-system-theme`: first visit follows the OS setting; a manual light/dark selection persists; the accessible Appearance switch is in the hamburger drawer at mobile and desktop widths; the one-time explanation remains until dismissed or a manual choice; focused auth screens suppress it. It is not yet merged. Candidate screenshots and local QA are under `docs/screenshots/pr45-system-theme/`.
- Exact local verification on Node 22.23.4/pnpm 10.34.9: workspace typecheck passed; production builds 2/2 passed; full suite 170 total / 169 passed / 0 failed / 1 documented PGlite skip. Responsive Playwright passed at 320/375/768/1024/1440px, including drawer keyboard/focus behavior, persisted overrides, auth suppression, reduced motion and notice separation. This is local evidence, not hosted CI or a hosted preview review.
- The complete owner-request recap and verified done/in-progress/blocked checklist is in [`docs/17-owner-requirements-checklist.md`](17-owner-requirements-checklist.md). The preserved `feat/full-web-implementation-release` worktree remains rebased to this `main` with staged/untracked OTP, form, error-screen and tourism-source changes; none is merged. The News reference candidate at `/workspace/EPE-LAWA-news` is uncommitted and based on pre-PR-44 `2ab88be`; rebase and revalidate it before proceeding.
- **Resume:** finish the focused theme PR through a normal merge when exact-head GitHub status is healthy; verify the resulting `main` and exact Production deployment; then rebase and finish News against current `main` and continue through the remaining pages one at a time. Production Supabase remains read-only; migration drift, provider setup, rate limiting/abuse tracing, live studio and unverified records remain in the dated owner checklist.


## 2026-11-13 22:20 WAT — PR #45 deployed; News reference candidate verified locally

- GitHub confirms PR #44 (52-photo Epe homepage gallery) and PR #45 (system-following theme drawer) were merged normally. The latest Vercel Production deployment is `dpl_HQPPJWFHfLTftzMoAWiXfcceC7b2`, `READY` for exact `main` SHA `d39acdd703321822d470ebc93c33243786c5f037`. A read-only fetch of `https://epelawa.vercel.app/news` still returns the pre-redesign empty newsroom; no live story records were used for candidate screenshots.
- The separate `feat/news-reference-layout` worktree is now rebased on that exact latest `main`. The listing implements the reference hierarchy (featured coverage, accessible compact category tabs, single-row search and recent stories); the article route uses published records, reads the current RLS-visible article version, and builds canonical slug links for metadata/sharing. Synthetic layout records exist only in a localhost HTTPS mock and are visibly labelled as fixtures; production was not written.
- Candidate checks pass: `pnpm typecheck` 5/5 tasks, `pnpm build` 2/2 app builds, `pnpm test` 175 passed / 0 failed / 1 documented PGlite/PostgreSQL-constraint skip (176 total), and production-mode Chromium Playwright at 320/375/768/1024/1440 CSS px for listing and article. Playwright found no horizontal overflow, page/console errors or external requests; it exercised category/search state, canonical metadata and clipboard copy. Ten dated captures and the fixture/test notes are in [`docs/screenshots/news-reference-layout/2026-11-13/`](screenshots/news-reference-layout/2026-11-13/README.md). These are local candidate checks, not hosted CI or a production News release.
- **Resume:** set the required commit identity (`info.epelawa@gmail.com`), commit and push the News candidate without force, open a separate PR, then refresh exact-head GitHub checks and Vercel preview state. Use only a normal merge if the exact PR is healthy and re-test the updated `main`/Production deployment. Continue the remaining modules sequentially; preserve the separate staged OTP/form/tourism worktree, do not mix it into the News PR, and leave unconfigured production providers and unreconciled Supabase changes untouched.


## 2026-11-13 22:33 WAT — PR #46 deployed; preserved work rebased

[PR #46](https://github.com/epelawa/EPE-LAWA/pull/46) was normally squash-merged, producing `main` commit `16ad8e70448b4b48e35759a4cf0c2317f1d6b3f5`. Vercel deployment `dpl_DMtx6FdvxM4VsXiqVbvDWJdcj3aZ` is **READY / PROMOTED** from that exact SHA and owns the production aliases. A fresh read-only fetch of [the public News page](https://epelawa.vercel.app/news) verifies the redesigned newsroom and honest empty state; no published article is available, and no synthetic data was written. The exact [immutable deployment URL](https://epe-lawa-p3y6iiit6-epe-lawa.vercel.app/news) and earlier PR preview require Vercel SSO; neither was visually inspected. GitHub's individual status APIs return 403, but the PR reported `CLEAN`/`MERGEABLE` before the normal merge. The staged, unstaged and untracked work in `/workspace/EPE-LAWA` has been stashed/restored intact and rebased onto `16ad8e7`. **Resume:** inspect that preserved work and split only verified, locally tested changes into separate PRs; keep schema/provider blockers explicit and production Supabase read-only.


## 2026-11-13 23:48 WAT — PR #48 deployed; preserved work rebased

[PR #48](https://github.com/epelawa/EPE-LAWA/pull/48) was normally merged into `main` as `203d7cae923a50dff7633a7ced8e77324bfcc06b`. Vercel Production deployment `dpl_52yiTmDzdZwjPiXW357TeSwhNfAN` is `READY` for that exact production-target SHA, and a read-only fetch of [the public `/auth/verify` route](https://epelawa.vercel.app/auth/verify) shows the branded code-entry screen. No email was sent and no code was entered; hosted template settings, sender authentication and real delivery remain unverified. Production Supabase settings, schema and data were not changed.

The preserved `feat/full-web-implementation-release` worktree is rebased onto exact `main` `203d7ca`. All 39 pre-rebase items (16 tracked and 23 untracked) were byte-verified as present either in the restored worktree or identically in `main`; the safety stash remains intact. The remaining work is still local and unreleased. A separate Tourism photo-reference candidate passed local typecheck, build, tests and Playwright at 320/375/768/1024/1440 CSS px; it does not invent or publish destinations and is not yet a PR.

PR #47 remains open. Its remote pre-update head `f3a87cb` reported `CLEAN`/`MERGEABLE`, but individual GitHub check/status details remain inaccessible to the authenticated CLI (403). The local docs branch incorporates current `main` and this checkpoint; push normally, refresh the exact head and do not merge unless the required hosted gate is visible and healthy. Continue with the Tourism handoff/PR and remaining modules sequentially; keep schema and provider-dependent work blocked until verified.


## 2026-11-13 23:52 WAT — PR #47 status after normal docs push

PR [#47](https://github.com/epelawa/EPE-LAWA/pull/47) is open on current `main` `203d7ca` after a normal push. The authenticated CLI reports merge state `UNKNOWN`; `gh pr checks 47` fails with `GraphQL: Resource not accessible by integration (node.statusCheckRollup.nodes.0.commit.statusCheckRollup)`. No merge was attempted. Keep the docs PR open until the exact hosted gate is visible and healthy; proceed with independent Tourism work in the meantime.


## 2026-11-13 23:56 WAT — Tourism photo-reference candidate

A local candidate on `feat/tourism-photo-gallery`, based on `main` `203d7ca`, adds two credited CC BY-SA 4.0 photo references with responsive uncropped image delivery. The gallery is clearly not an approved destination set. Local typecheck, production build, tests and the 320/375/768/1024/1440 Playwright matrix passed; screenshot evidence and exact limitations are documented in [`the Tourism handoff`](handoffs/2026-11-13-tourism-photo-reference.md) and [`the capture README`](screenshots/tourism-photo-gallery/2026-11-13/README.md). The candidate is not yet a PR or deployment. Approved destination content, verified visit details and isolated production-schema workflow tests remain pending/blocked. PR #47's separate docs sync remains open with hosted status unavailable; do not merge either PR without healthy exact-head checks.


## 2026-11-14 00:12 WAT — Tourism PR #49 and release baseline

- Remote `main` is `203d7cae923a50dff7633a7ced8e77324bfcc06b`. PR #46 (News redesign) and PR #48 (branded OTP verification) are merged. Vercel's Production alias `epelawa.vercel.app` resolves to deployment `dpl_52yiTmDzdZwjPiXW357TeSwhNfAN` with `READY`/`production` metadata; this was a control-plane check only, not a page or production-data fetch.
- Tourism PR #49 is open at exact head `4a0964241e41644ee76980ecb889b93b13067097`, based on current remote `main`. Vercel preview deployment `dpl_2KciNaxD2j58RqtLLvvPiJeLv3Zv` is `READY` for that head by metadata; the preview page was not opened or inspected.
- GitHub reports PRs #47 and #49 as `MERGEABLE`, but both PR check-rollup and combined commit-status calls return HTTP 403 `Resource not accessible by integration`. Neither PR may be merged until exact-head required checks are verifiably healthy.
- The preserved `feat/full-web-implementation-release` worktree is at `203d7ca` with 15 local modified/untracked paths; its local `main` ref is stale at `9066e56`. Continue from the verified remote base, preserve the changes and review independent fixes as separate PRs. Keep production Supabase read-only until schema reconciliation/backup verification.
- The 00:12 PR #49 status above refers to feature head `4a0964241e41644ee76980ecb889b93b13067097`; a documentation-only status-sync commit is being prepared and will advance the branch. Recheck GitHub required checks and Vercel metadata for the new exact head before considering any merge.

## 2026-11-14 09:48 WAT — PR #47 merged; PR #49 sync in progress

- PR #47 merged normally into `main` at `a3bf95190e4d01c161a04e2e6aee5821ee7c1b7b`. The matching Vercel Production deployment was READY; read-only checks of `/` and `/news` returned HTTP 200. No Production writes were made.
- PR #49's prior remote head `b9808926783e0de6ed822500f1e361a8ebd5b396` became DIRTY after `main` advanced. GitHub rejected the ordinary merge because of conflicts only in `docs/12-development-roadmap.md`, `docs/16-progress-log.md` and `docs/17-owner-requirements-checklist.md`; the Tourism feature source and photo-credit files are unchanged.
- The focused Tourism photo-gallery tests passed 2/2 on the prior head. Its isolated worktree had no installed workspace dependency tree, so the attempted TypeScript check could not resolve modules; this is neither a passing typecheck nor evidence of a source-code failure. The pinned Node/pnpm toolchain, full gates and five-width screenshots are being rerun on the synced exact tree before any merge attempt.


## 2026-11-14 09:59 WAT — PR #49 synced-tree validation complete

- The Tourism branch is locally synchronized with latest remote `main` `a3bf95190e4d01c161a04e2e6aee5821ee7c1b7b`; only the three named documentation files conflicted. Tourism source, image assets and credits remain unchanged.
- With Node 22.23.4 and pnpm 10.34.9 across all subprocesses, uncached typecheck passed 5/5 tasks and uncached production builds passed 2/2 tasks. The full suite passed 185 tests (184 passed, 0 failed, 1 documented PGlite/PostgreSQL constraint skip); `git diff --check` passed.
- Local production-mode Playwright passed at 320/375/768/1024/1440 CSS px using a loopback-only HTTPS Supabase mock. The page rendered the real images, both CC BY-SA credits and the honest empty destination state; there was no horizontal overflow, external browser request, console error or page error. Ten fresh captures are indexed in [`the 2026-11-14 screenshot README`](screenshots/tourism-photo-gallery/2026-11-14/README.md).
- **Resume:** commit and push the verified merge-forward without force, refresh PR #49's exact remote head/checks/Preview status and attempt only a normal merge. If blocked, keep it open and report the exact reason. Production remained read-only; PR #50 remains blocked by missing `publication_status` columns on the live `programmes`/`episodes` schema.


## 2026-11-14 10:47 WAT — Radio programme-error copy and contract follow-up

- PR #51 is merged normally at `e5c9bde21b82d555f486ac3356592f6e31007b29`. A read-only Production request to `/radio` returned HTTP 200 and included Radio Lagos 107.5 FM. The inaccurate programme-error copy in source was not rendered by that response.
- A focused local follow-up changes only the programme-read failure message and its availability regression test. It retains the single official Radio Lagos station, direct native player, user-initiated playback and event-driven status. Full forced gates passed: typecheck 5/5 tasks, builds 2/2 tasks, and 185 tests (184 passed, 0 failed, 1 documented skip).
- Local production-mode fallback screenshots at 375px and 1440px use only a synthetic loopback HTTP 500 response; browser external requests were zero and the audio player was not started. See `docs/screenshots/radio-lagos-fallback/2026-11-14/README.md` and `docs/handoffs/2026-11-14-radio-lagos-availability-contract.md`.
- **Remaining/blocked:** this isolated branch has not yet been pushed or opened as a PR. PR #50 remains blocked while Production lacks the required `publication_status` columns on `programmes` and `episodes`. The official station catalogue still marks availability unknown/stale, so continuous uptime is not guaranteed. No Production schema, data or environment was changed.
- **Resume:** commit and push the focused branch, open one PR, refresh exact-head checks, and attempt only an ordinary merge if healthy; then verify the public route read-only.


## 2026-11-14 10:49 WAT — PR #52 opened; hosted checks not visible

- PR #52 is open at exact head `8356f524c49ca258f809f605f7a6a20e50a382df` (`fix/radio-lagos-availability-contract`) against current `main` `e5c9bde21b82d555f486ac3356592f6e31007b29`.
- The local gates and screenshots are complete, but `gh pr checks 52` returned HTTP 403 `Resource not accessible by integration` for the exact-head check rollup. Hosted checks are not verified; no merge was attempted and mergeability is not treated as proof.
- **Resume:** obtain an authorized exact-head check view; only then attempt an ordinary merge if healthy. PR #50 remains blocked by the Production `publication_status` schema prerequisite. No Production writes.


## 2026-11-14 23:23 WAT — News minute-rotation candidate

- The isolated News branch now combines the owner-directed mobile-first, flat, cloud-blue News layout with deterministic minute-by-minute layout rotation and a corrected two-column editorial rail. News has no global footer; only the small EPE LAWA wordmark remains at the bottom.
- Exact local validation: Node 22.23.5/pnpm 10.34.9; News focused tests **13/13**, public-app typecheck passed, `git diff --check` clean. Synthetic-only Playwright passed at 320/390/430/768/1440 CSS px with no browser errors or horizontal overflow. The editorial-rail feature-to-category gap measured 14px at desktop.
- Five local synthetic screenshots and the timestamped Done/Pending/Blocked/Resume handoff are tracked in [`the News minute-layout handoff`](handoffs/2026-11-14-news-minute-layout.md). No Production article rows were read or created by these screenshots.
- **Pending:** open and attempt the focused PR through an ordinary merge, then verify the exact merged `main` and Production deployment. Hosted CI details remain inaccessible; do not claim they passed.
- **Blocked:** live News content remains empty pending the separate audited Admin workflow and owner-authorized publication actions. Do not use synthetic fixtures as public content.
- **Resume:** commit/push only News changes and relevant evidence, open one focused PR, refresh exact-head GitHub/Vercel state, and merge only through the normal CLI if allowed.


## 2026-11-14 23:31 WAT — News background test alignment
- **Done:** PR #78 merged normally at `c25cb3e5f164aa3e661d14a7c78ebc97c6bc3560`; its News-specific `data-news-layout` exclusion intentionally changes the global light-canvas selector. A focused test update now verifies that behavior; 2/2 focused assertions pass.
- **Pending:** open and attempt the single-file regression-test PR through the ordinary merge path, then sync and rerun the separate Auth worktree checks.
- **Blocked:** hosted check details remain inaccessible through the GitHub connector; no hosted CI pass is claimed. The exact Production deployment for #78 was still BUILDING at the last metadata check.
- **Resume:** commit/push the test fix, refresh the exact PR head, and attempt a normal merge without bypass flags.


## 2026-11-14 23:38 WAT — News PR #79 merged; schema-test fixture repaired

- **Done:** PR #78 (News minute-rotation layout) and PR #79 (theme-selector regression test) were normally merged. Latest verified `main` is `64370cb9c17e6d6445cd9227ca6ee451119c31a4`. On the Auth branch, the 15 focused member-auth tests passed; workspace typecheck passed 5/5 tasks and production builds passed 2/2 using localhost-only synthetic Supabase settings.
- **Done:** The full suite exposed two linked PGlite failures. The News comments migration restricts `author_id` selection; the old ban fixture filtered by that column, aborted before unban, and left the subsequent poll test seeing an active synthetic ban. A separate test-only worktree now verifies own hidden-comment access by permitted `id` and another member's denial. The schema test passes 23, fails 0, with 1 documented PGlite/PostgreSQL constraint skip.
- **Pending:** commit/push the test-only fix in its own PR and attempt only an ordinary merge; then sync Auth to that `main` and rerun the exact full suite before opening the separate Auth PR.
- **Blocked:** GitHub hosted-check details are inaccessible through the connected CLI. No hosted CI pass is claimed. No Production schema, Auth settings, accounts or content changed during this step.
- **Resume:** finish the focused schema-test PR first, then rerun Auth tests on updated `main`; only proceed with the Auth PR after all local gates pass.


## 2026-11-14 23:45 WAT — Member Auth and schema-test exact-tree status

PR #80 (schema-test fixture alignment) merged normally; `main` is now `2c11154a1dcc184eb895ceedb4e5545209bda7a4`. The Auth branch was fast-forwarded to that base. Local gates passed on Node 22.23.5/pnpm 10.34.9: focused Auth tests **15/15**, typecheck **5/5**, builds **2/2**, and full suite **231 total: 230 passed, 0 failed, 1 documented PGlite constraint skip**. The schema-only branch's separate exact gates were typecheck 5/5, builds 2/2 and 225 tests (224 passed, 0 failed, 1 documented skip). The Auth branch is ready for its own PR; merge only through the normal path and verify the resulting main/deployment. Its migration remains unapplied until fresh Production ledger/object and backup/restore preflights are complete. No Production schema, settings, accounts or content changed.


## 2026-11-15 00:27 WAT — Newsroom live-schema repair candidate

- **Done:** A focused Newsroom authoring RPC repair now matches the read-only Production catalog: it does not depend on absent `articles.state`, preserves `article_versions.state='approved'` for published versions, and uses the publication pointer for public status. Admin listing/detail status labels are pointer-derived. No Production writes or content changes occurred.
- **Exact local gates:** focused schema/Newsroom tests **33 total (32 passed, 0 failed, 1 documented skip)**, including a regression for a null current-version pointer; full workspace tests **236 total (235 passed, 0 failed, 1 documented skip)**; forced uncached typecheck **5/5 tasks**; forced production builds **2/2 tasks** on Node 22.23.5/pnpm 10.34.9. Synthetic screenshots use only loopback fixture data; evidence is in `docs/screenshots/newsroom-live-schema/2026-11-15/`.
- **Remaining:** commit/push and open one focused PR; attempt ordinary merge only. After a successful merge, freshly preflight and apply only the exact additive Newsroom migration, then read back the generated ledger version and verify route behavior. Owner-approved private drafts remain pending Admin access.
- **Blocked/remaining:** the 390px synthetic Admin Newsroom capture reports page-level horizontal overflow (641px document width); this is a separate responsive follow-up, not fixed here. Supabase Auth SMTP still awaits the private configuration step. No account was recreated.
- **Resume:** run whitespace/scope checks, commit and push this branch, refresh exact PR/deployment state, use no bypass, then proceed with a current live schema/ledger preflight before any migration application.

## 2026-11-15 00:44 WAT — Newsroom private-read and publication privacy

- [x] Additive staff SELECT policies and restrictive guards: private drafts limited to authoring owners or review/publish/unpublish staff; public versions require approved state plus exact publication pointer.
- [x] Full migration-chain regression and separate Production-baseline fixture. Full suite: 238 total, 237 passed, 0 failed, 1 documented skip; forced typecheck/build: 7/7 combined tasks on pinned Node/pnpm with localhost-only settings.
- [ ] Ordinary PR/merge, fresh Production preflight, apply one migration and verify catalog/ledger. No content/account writes. See `docs/handoffs/2026-11-15-newsroom-staff-read-rls.md`.

## 2026-11-15 01:05 WAT — Forum queue schema reconciliation

- Done locally: additive missing-table queue schema, scoped RLS, audited reason-required resolution, full-chain and missing-table behavioral checks. Combined-main tests 242 passed/0 failed/1 existing skip; forced builds 2/2 and typechecks 5/5, pinned tools.
- Remaining: ordinary PR/merge, fresh live preflight, exact additive application and authenticated route check. No content seeded; public Forum/poll provisioning is not claimed. See `docs/handoffs/2026-11-15-forum-moderation-repair.md`.

## 2026-11-15 01:18 WAT — Forum explicit anon ACL follow-up

Production default privileges required explicit anon revocation after PR #85; capability checks still protected writes. New additive ACL-only migration and Supabase-default fixture passed full244 total243pass0fail1skip, forced builds2/2 and typechecks5/5. Ordinary PR/application pending; no content/account changes. See `docs/handoffs/2026-11-15-forum-rpc-anon-acl.md`.

## 2026-11-15 01:24 WAT — Radio authoring metadata/RPC repair

The additive live-baseline Radio candidate supplies missing timestamps/revision and rights-aware audited authoring without changing existing station playback/content/status. Combined-main suite246pass0fail1existing skip; forced build2/2/typecheck5/5. Fresh preflight confirms target columns/RPC absent. Ordinary focused PR, recheck/apply and live metadata/ACL verification remain. See `docs/handoffs/2026-11-15-radio-live-authoring.md`.

## 2026-11-15 01:33 WAT — Permissioned category/byline management

Done locally: linked Newsroom settings, audited create/edit categories and credited bylines, category deactivation, truthful errors, UI/RPC article.publish checks without role assignments. Forced pinned builds2/2/typechecks5/5; combined252total251pass0fail1existing skip. Five-width synthetic captures have no page overflow and all reveals visible. Ordinary merge and additive migration/readback remain; no rows seeded. See `docs/handoffs/2026-11-15-newsroom-reference-settings.md`.

## 2026-11-15 01:39 WAT — Member feedback and current release state

Done locally: safe contextual provider errors, explicit field validation, preserved database handle checks/recovery privacy. Pinned forced builds2/2,typechecks5/5, full253total252pass0fail1existing skip. Actual local invalid-credential server action and default login both fit320x568 without page scroll; five-width screenshots included. Production prior PRs81–88 normally merged; recent Forum,Radio and reference-setting additive migrations applied and ACL verified; Gmail recovery request200 but inbox receipt unverified. Remaining: ordinary feedback PR/merge/deployment check; authorized live sessions/private drafts; broader absent module objects tracked separately. See `docs/handoffs/2026-11-15-member-auth-feedback.md`.

## 2026-11-15 07:03 WAT — Newsroom settings route parity
The same-origin `/admin/newsroom/settings` route was absent even though its staff navigation link and canonical Admin settings page existed. The isolated route-fix worktree adds the missing page re-export and a regression asserting both its canonical target and existing staff-auth/capability boundaries. This restores route parity only; it does not change editorial settings behavior, authorization implementation or production data. Verification is recorded in `docs/16-progress-log.md` and `docs/handoffs/2026-11-15-newsroom-settings-route-fix.md`.

## 2026-11-15 07:18 WAT — public article version binding

Done: public body reads bind the exact publication pointer even when staff RLS exposes private revisions; missing/error pointers fail closed. Actual-helper synthetic regressions and the complete suite pass: 257 tests, 256 passed, zero failed, one existing skip. Forced pinned build/typecheck pass. Loopback-only five-width public-body screenshots/overflow assertions pass. No production schema/account/content changes belong to this patch. Remaining: ordinary merge, exact deployment verification, separate cover release, then only the two approved stories and unpublish/republish checks. See `handoffs/2026-11-15-published-version-body-read.md`.

## 2026-11-15 07:24 WAT — approved full-image News covers

Done: exact-byte two-cover Commons catalog; server-validated Admin selection and saved-version key retention; uncropped contain sizing in public article/index/related slots; visible linked source/author/license and illustrative captions. Pinned forced builds/typechecks pass; complete combined suite 263 total, 262 passed, zero failed, one existing skip. Public and canonical Admin fixtures pass at 320/390/430/768/1440px, including cover selection/retention and no overflow. Remaining: ordinary focused merge/exact Production verification, then only two approved real stories with edit/unpublish/republish/public-copy verification. Third story remains on hold; no schema/account/env change in this patch. Handoff: `handoffs/2026-11-15-news-approved-cover-attribution.md`.

### 2026-11-15 newsroom current-version read compatibility
Bounded source-only fix: newsroom editor relationship selection uses the stable `current_version_id` column hint instead of an environment-specific FK constraint name. Verification pending; no schema migration required.
Verification complete: forced build and typecheck passed; complete frontend/backend suite passed (263 passed, 1 skipped). Strict synthetic editor capture passed at five widths with no overflow and stable-hint validation.

## 2026-11-15 07:50 WAT — canonical Admin cache inputs
Done: package-level build inputs track imported sibling source while preserving root env/outputs, default inputs and caching. Actual dry-hash proof changes main hash for Admin code but not unrelated docs. Final pinned forced builds/typechecks and full SERIAL suite pass: 265 total,264 passed,0failed,1existing skip. Initial concurrent HTTP-fixture failures were NOT accepted as release evidence. UI unchanged; existing five-width editor screenshots apply. Remaining: ordinary merge, exact Production READY and main build-cache MISS, then finish only the two existing approved drafts. Handoff: `handoffs/2026-11-15-canonical-admin-build-cache-inputs.md`.

### 2026-11-15 08:01 WAT — public News view contract repair
**Done:** public article query/UI no longer requests nonexistent `tags`; all three public `published_articles` selects are checked against the verified 15-column contract. Regression test added. Pinned forced builds (2/2), typecheck (5/5), focused Newsroom test (8/8) and serial complete frontend/backend suite (266 total, 265 pass, 0 fail, 1 skip) passed. Strict synthetic loopback-only public view screenshots at 320/390/430/768/1440 are in `docs/screenshots/news-public-view-contract/2026-11-15/`. **Pending:** fresh anonymous production check only after parent-owned, separately authorized publication restore. No production data/schema/account/environment edits or git delivery action. Resume handoff: `docs/handoffs/2026-11-15-news-public-view-contract.md`.

## 2026-11-15 08:16 WAT — Verified member username completion
**Done:** Added a verified-session, missing-profile-only username correction form, existing database availability checks and username-only Auth metadata update followed by the established verified-profile bootstrap. Reauthentication and existing/deleted-profile barriers remain server-side. Existing account name, email, password, verification and roles are not mutation inputs. Shortened the new hero description after visual review found overlap at 320px; the final browser fixture now checks for description/card overlap as well as viewport overflow.
**Validation:** Earlier pinned build/typecheck/serial suite passed; a fresh complete gate run follows the one-line mobile copy fix. Loopback-only five-width and actual form-post checks are included; no real accounts or cookies are used in the fixture.
**Pending:** Finish exact-head verification, ordinary focused PR merge, exact Production readiness, then apply only the owner's already-approved available username through the ordinary member UI and confirm unchanged other account metadata. No Production migration is part of this patch.
**Resume:** `/tmp/member-profile-completion-final-verified-gates.log`, `/tmp/epe-member-profile-completion-capture.cjs`, and `docs/handoffs/2026-11-15T0801+01-member-profile-completion.md`.

**08:19 WAT verification update:** Final post-copy-fix forced build 2/2, typecheck 5/5 and serial suite 267 pass / 0 fail / 1 skip (268 total). Actual-route 320×568/390/430/768/1440 captures passed viewport fit, hidden public chrome and description/card non-overlap. All ten real local form/route scenarios passed, including seven no-write rejection guards and one handle-only update/bootstrap success. Evidence: `docs/screenshots/member-profile-completion/2026-11-15/`; gate log `/tmp/member-profile-completion-final-verified-gates.log`. Remaining: ordinary release, exact fresh Production build and existing-owner username-only/dashboard verification.

### 2026-11-15 08:50 WAT — visibly distinct minute-changing News
**Done:** stable complete ordered story list; five visibly different lead compositions including split-column mobile ranked view; independent lead/category rail column; current-minute/visibility catch-up; CSS-Modules-safe focused-search pause; contain covers without hover scaling; visible H1 and minimal footer. Final pinned build 2/2, typecheck 5/5 and full serial suite 268 total/267 pass/0 fail/1 existing skip. All 25 rendered five-layout/five-width cases and separate actual scheduler/search checks pass with reduced-motion and data-saving enabled. Separate PR #96 member repair and approved username-only/dashboard recovery are already complete; do not repeat that account update. **Release gate:** ordinary exact-head merge, fresh exact Production build, two real minute-boundary mobile/desktop observations and unchanged-story fingerprints; final deployment/result goes in the central release ledger. Handoff: `handoffs/2026-11-15T0837+01-news-visible-minute-rotation.md`. No data/account/provider writes in this focused patch.
