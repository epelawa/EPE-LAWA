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


## 2026-11-10 11:42 WAT — Module workflow and availability checkpoint

**Done in the current branch:** News now supports published-only headline search, bounded pagination and a safe offline HTML download for a published story. Map provides selectable business destinations, a safe external directions handoff and accurate location/data messaging. Forum and Business action errors use route-specific, allow-listed feedback; Business result notices do not imply a real payment. Tourism and Who-is-Who use bounded, query-preserving pagination over public read models. Public filters share a compact, accessible SVG-led treatment. The nonfunctional contact draft form and protected primary-admin email were removed from public pages/metadata; pages say plainly when a request cannot be sent. User-facing “Coming Soon” labels were replaced with implemented features or honest unavailability reasons.

**Still unavailable by design until safe dependencies exist:** production correction/removal intake, a public private-message/contact service, verified Supabase email delivery, configured Google OAuth, web-push delivery, an authorized Radio stream, licensed/source-credited Gallery images, the native app and any Play Store listing. These are not claimed to work. Production Supabase remains read-only because migration history and live schema still differ; do not apply migrations, alter Auth settings, provision roles, or write production content.

**Verification:** Node 22.23.4 / pnpm 10.34.9; 158 local tests (157 passed, 0 failed, 1 known PGlite exclusion-constraint skip); typecheck 5/5; both production builds 2/2. Headless Chromium verified a 375px offline-copy download from an explicitly synthetic, loopback-only article fixture. All 31 local screenshots at 320px, 375px and 1440px had no horizontal overflow. All evidence is under `docs/screenshots/pr32-web-module-workflows/` and is not hosted-preview evidence.

The repository's configured `pnpm audit:ui` and `pnpm audit:security` scripts remain blocked because `scripts/audit/run.mjs` is missing from this branch; do not mark either audit passed. The latest CLI snapshot found PR #31 as the latest existing open review (PR #30 merged). The current owner instruction is to open the next review PR and keep it open, then continue with the next independent safe web gap. Verify the exact hosted preview via CLI only; do not merge. Resume from branch `feat/web-module-workflows` and check current GitHub state before acting.
