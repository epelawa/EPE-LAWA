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

Latest `main` is `d39acdd703321822d470ebc93c33243786c5f037` after normal merges of PRs #44 and #45. Vercel Production deployment `dpl_HQPPJWFHfLTftzMoAWiXfcceC7b2` is READY from that exact SHA. The News-reference candidate in `/workspace/EPE-LAWA-news` is rebased to this `main`; its local workspace gates and production-mode synthetic-fixture Playwright matrix pass, but it is not committed, pushed, merged or deployed yet. Read-only production `/news` still shows the prior honest empty state. Production Supabase remains read-only; email sender authentication, Paystack setup, and a configured Maps API/Places/geocoding provider remain unconfirmed.


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


## 2026-11-14 00:32 WAT — Radio public-read visibility candidate (PR #50)

- The separate `fix/radio-published-only` branch explicitly filters public programmes to published/active records, and schedule/archive reads to published records under a published, active parent programme. Archive episodes retain the non-null publication-time guard. The public stream remains unavailable and no provider claim changed.
- Local evidence: focused Radio tests 7/7; workspace typecheck 5/5 tasks; production builds 2/2 apps; full suite 183 passed / 0 failed / 1 documented PGlite skip; Chromium at 320/375/768/1024/1440px. A loopback-only fixture verified 18 filtered public reads and exposed no draft sentinel. Captures: [`docs/screenshots/radio-publication-visibility/2026-11-14/README.md`](screenshots/radio-publication-visibility/2026-11-14/README.md).
- PR [#50](https://github.com/epelawa/EPE-LAWA/pull/50) was open and `MERGEABLE` at code-only head `58148a120212cd3efa6d91a131d891ef1af36638` when checked. The GitHub CLI could not read status checks: `Resource not accessible by integration (node.statusCheckRollup.nodes.0.commit.statusCheckRollup)`. Checks are unknown, not failed. A documentation-only follow-up will advance the PR head; refresh exact-head checks before any merge.
- Production Supabase was not contacted or written. Schema/migration drift and official stream/playback verification remain blocked. The hosted preview was not inspected; the screenshots are local empty-state QA only.
- **Resume:** refresh PR #50 status after its documentation follow-up, and merge only through the normal squash path when exact-head required checks are visible and healthy. Keep production database work read-only until schema reconciliation and backup verification are complete.
