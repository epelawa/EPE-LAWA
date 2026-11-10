# EPE-LAWA — Implementation Tracker

**Last checked:** 2026-11-10 13:13 WAT.

**Production code baseline:** `main` at `2446eca26f96f567d5b79e188b7d3a54498fcc20` (PR #31 merge; includes PRs #25–#28 and #30).
**Scope:** The eight client-approved web modules plus cross-cutting member auth, staff access, publishing, privacy, accessibility, email and audit. Native mobile remains out of scope.

A route existing, a preview building, or a button being visible is not proof that a complete workflow works. Mark a capability complete only with named current evidence.

## Release snapshot

- PRs #25–#28, #30 and #31 are merged; remaining open PRs are #24, #29 and #32. Continue exact-head verification and attempt normal merges when the owner-approved changes are healthy; never bypass branch protection.
- After PR #31 merged, `main` is `2446eca26f96f567d5b79e188b7d3a54498fcc20`. Vercel Production is **READY** as deployment `dpl_5P6FAg4wDYQTxwivF3xXSJikaNMW`; `https://epelawa.vercel.app` resolves to it. The Production-only `NEXT_PUBLIC_SITE_URL` now equals `https://epelawa.vercel.app`; homepage, sitemap and robots return HTTP 200, the homepage canonical uses that host, all 14 sitemap entries use it, and `robots.txt` names its sitemap.
- The live `/itan-ilu-mi` page still displays the “Coming Soon” correction badge from PR #30. PR #32 removes that label but remains open, so the change is not live yet.
- Vercel CLI mapped pre-sync PR previews to exact head SHAs and reported **READY**. Synced branches need fresh exact-head deployment checks; previews behind Vercel SSO return HTTP 302, so hosted content is not reviewed.
- `gh pr checks` and GitHub REST check/status endpoints return 403 to this CLI integration. Before pushing the tested PR #24 sync commit, GitHub reported that PR #24 was DIRTY/CONFLICTING; PR #29 is stacked on #24. Refresh mergeability and exact preview state after push; do not claim inaccessible hosted checks passed.
- No production Supabase schema, migration ledger, settings, account roles, or user data were changed. Production remains read-only while migration drift is unresolved.

## Review PRs — snapshot before PR #30 merge (09:16 WAT)

| PR | Branch / head | Change | State and hosted status | Screenshot evidence |
| --- | --- | --- | --- | --- |
| [#24](https://github.com/epelawa/EPE-LAWA/pull/24) | `feat/auth-reference-redesign` / `01a2ea4a8fbe` | Member/staff auth forms restyled to the supplied reference | OPEN, mergeable; branch preview READY, SSO-protected; individual checks inaccessible | `/workspace/epe-lawa-release-screenshots/pr24-auth-pull-refresh/` |
| [#25](https://github.com/epelawa/EPE-LAWA/pull/25) | `fix/newsroom-create-access` / `09a2470d50e0` | Newsroom `article.create` access gate | OPEN, mergeable; branch preview READY, SSO-protected; individual checks inaccessible | No PR-specific capture found; change is functional-only. Add a useful local UI-state capture if one is available without sign-in or production data. |
| [#26](https://github.com/epelawa/EPE-LAWA/pull/26) | `fix/forum-report-redirect` / `c8d0cbae86a4` | Forum moderation/report redirect handling | OPEN, mergeable; branch preview READY, SSO-protected; individual checks inaccessible | No PR-specific capture found; change is functional-only. Add a useful local UI-state capture if one is available without sign-in or production data. |
| [#27](https://github.com/epelawa/EPE-LAWA/pull/27) | `fix/radio-admin-read-errors` / `e241c2d5a5cb` | Distinguish Radio admin read failures from empty states | OPEN, mergeable; branch preview READY, SSO-protected; individual checks inaccessible | `/workspace/epe-lawa-release-screenshots/pr27-radio-error-local/` |
| [#28](https://github.com/epelawa/EPE-LAWA/pull/28) | `fix/public-contact-privacy` / `d3d8bc66eb8f` | Remove nonfunctional public contact intake and avoid exposing private contact metadata | OPEN, mergeable; branch preview READY, SSO-protected; individual checks inaccessible | `/workspace/epe-lawa-release-screenshots/pr28-public-contact-privacy/` |
| [#29](https://github.com/epelawa/EPE-LAWA/pull/29) | `fix/staff-login-short-height` / `373d92febbd7`; based on #24 | Fix short-height staff sign-in layout | OPEN, mergeable; branch preview READY, SSO-protected; individual checks inaccessible | `/workspace/epe-lawa-release-screenshots/pr29-staff-login-shortheight/` |
| [#30](https://github.com/epelawa/EPE-LAWA/pull/30) | `fix/community-history-correction` (current PR head is available from the GitHub CLI) | Disclose that published History corrections/removals are not yet supported | OPEN, mergeable; branch deployment READY; exact SHA is not exposed by the current Vercel CLI JSON; hosted content SSO-protected | `/workspace/epe-lawa-release-screenshots/pr30-history-correction-coming-soon/` |

PR #29 depends on PR #24's auth redesign. Before this merge pass, all seven PRs were open. PR #30's code commit `ce96a1e` previously passed focused History tests 11/11. Fresh Node 22.23.4/pnpm 10.34.9 verification with the updated docs present passed 5/5 typechecks, 2/2 builds and the full suite (140 passed, 0 failed, 1 documented PGlite skip). The subsequent changes are documentation-only; these local results do not claim hosted CI passed.

## Current post-merge status — 2026-11-10 09:30 WAT

- PR #30 was merged normally via the authenticated GitHub CLI as `6a48e5f02d210fef29c471daac9992e1e4693039`; no bypass flag was used. The exact merged `main` tree passed 5/5 typecheck tasks, 2/2 build tasks and 140 tests (0 failures, 1 documented PGlite skip).
- PR #24 original head `01a2ea4a8fbe111f669f2b9c39b7222c7db8b14b` passed 5/5 typecheck tasks, 2/2 builds and 137 tests (0 failures, 1 documented skip). After PR #30 merged, GitHub marked it CONFLICTING because only the three status documents overlapped. The local merge selected the newer main documents; auth source changes merged without conflict. The merge-forward tree, whose main parent is `6a48e5f02d210fef29c471daac9992e1e4693039`, passes exact-tree checks: 5/5 typechecks, 2/2 builds and 139 tests (0 failures, 1 documented skip). It is locally committed but not yet pushed; refresh its preview and GitHub mergeability after the non-force push before attempting a normal merge.
- PR #29 exact head `373d92febbd7e3f193ff10b0a251a6e414bf2a49` passed 5/5 typecheck tasks, 2/2 builds and 137 tests (0 failures, 1 documented skip). It is stacked on PR #24; after #24 merges, retarget #29 to `main` and verify the updated diff before its own normal merge.
- The PR #24 branch alias was READY before the main update but redirects to Vercel SSO (HTTP 302); no hosted page content was reviewed. The new merged-main combination has no verified preview yet. GitHub check details remain inaccessible; no production Supabase writes were made.

## Eight web modules

| Module | Current status | Safe next step / blocker |
| --- | --- | --- |
| Trending News | PR #25's `article.create` display-gate repair is merged. PR #32 proposes headline search, pagination and offline article-copy download; that candidate is not live until synced and verified. Production publishing, private previews, stale-revision denial and audit are not proven against reconciled schema. | Recheck the exact PR #32 tree and its local offline-copy safety tests. Keep drafts private and never publish synthetic or unapproved stories. |
| Itan Ilu Mi / Community History | PR #30 honestly states that published-record corrections/removal are unavailable; the existing queue accepts new contributions only. No durable correction workflow exists. | Do not accept submissions that could be lost. Build audited intake/edit/withdraw only after a safe persistence path and schema reconciliation. |
| Chat Forum / Digital Village Square | PR #26 fixes redirect handling. Authenticated participation, reporting, moderation, rate limits and audit are not verified end-to-end. | Reconcile missing database objects/helpers first; test member and moderator permissions with isolated data. |
| Map & Navigation | Safe external Google Maps search/directions handoff exists. PR #32 proposes choosing a business before opening directions; verify the exact candidate before calling it live. No Maps API, Places, geocoding or offline-map integration is configured. | Test safe URL construction and explicit location disclosure; do not claim live geocoding or collect private location by default. |
| Business Directory & Marketplace | Routes/schema/UI are not proof of complete listing review, product/order handling or payment. Paystack is not confirmed operational. | Keep payments unavailable until provider sandbox and production-safe persistence/authorization are verified. |
| Historical Sites & Tourism | Public route responds, but sourced and approved destination data and full visit flows are not established by this audit. | Use only sourced, owner-approved records; retain honest empty/error states. |
| EPE LAWA Radio | PR #27 distinguishes admin query errors from empty data; stream rights, URL/format, actual playback, status, schedule and archive remain unverified. | Confirm stream rights and endpoint before enabling a player or claiming LIVE. |
| Who is Who in Epe | Public route responds, but verified profiles, provenance, correction/removal and staff workflow are not established. | Do not publish invented profiles or roles; verify human review and privacy rules against a reconciled schema. |

## Cross-cutting status and blockers

- **Auth and admin:** PR #24 is being synced to current `main`; its local UI gates and nine screenshots pass, while its remote PR state still needs refresh after push. PR #29 is dependent on #24 and fixes short-height staff login. Google sign-in stays disabled until configured. Production role provisioning and live email delivery are not verified; production Supabase remains read-only.
- **Cookie/preferences notice:** PR #31 (`fix/homepage-only-cookie-notice`) is merged in `main` at `2446eca`. Its local responsive captures show a floating, homepage-only notice; the exact Production deployment is READY. Do not infer unrelated provider behavior from this UI check.
- **Email:** Branded UI/template code does not prove delivery. Supabase SMTP/provider status and authenticated sender delivery have not been verified; do not promise that verification mail works end-to-end.
- **Persistence and providers:** No safe live waitlist persistence path was established. Do not show success for a submission that will be lost. Payment, map, media/stream and other provider-dependent flows stay unavailable until configured and verified.
- **Typography and visual system:** Use the legally available font fallback; no Codec Pro license was supplied. Keep the approved cobalt palette, light default, persisted manual dark mode, reduced-motion/accessibility requirements, and no public exposure of private admin contact details.
- **Screenshots:** Local captures for PRs #24, #27, #28 and #31 are tracked under their respective `docs/screenshots/prNN-*` folders. PR #28’s captures predate PR #31 and show the prior notice behavior. Local screenshots are not hosted-preview evidence.

## Production schema and migration safety

The read-only CLI audit findings and safe reconciliation sequence are recorded in `docs/07-database-schema.md`. Production records seven migration versions while 22 later local files are unrecorded; local migration inventory has 29 files and two files share version `20261107213000`. Several pending migrations call `has_capability`, which is absent remotely. Production's `require_capability(text)` definition/security/grants differ from the local migration; key objects such as `comments`, `published_people`, and `people.achievements` are absent in the scoped catalog probe. A full dump/schema diff and verified backup were not possible because Docker/Podman and native `pg_dump`/`psql` are unavailable. Ledger state alone is not proof of schema state.

**Do not apply, repair, fake, or reconcile the production migration ledger.** First obtain a safe full backup and a reliable schema comparison path; resolve duplicate local versions in a branch; establish dependency/order and helper/grant corrections; rehearse forward-only migrations and restore on a disposable project/branch; and require explicit owner authorization before any production write.

## Next actions

1. Commit and normally push the tested PR #24 sync; refresh its exact Vercel preview and GitHub mergeability, then attempt a normal merge only if healthy. Test updated `main` and its Production deployment.
2. Retarget PR #29 to current `main`, rerun its short-height responsive and full local gates, capture evidence, and resolve it through a normal merge when healthy.
3. Sync PR #32 after the auth dependency; verify its News search/pagination/offline copy and map-direction changes, refresh all affected screenshots and full gates, then merge normally if healthy.
4. Audit each remaining web placeholder and implement safe, actually persistent workflows in separate tested PRs; mark real schema/provider dependencies unavailable rather than claiming completion.
5. Keep production Supabase read-only until migration drift has a safe backup and rehearsed reconciliation plan; native mobile remains deferred.


## Current status — 2026-11-10 09:38 WAT (supersedes the 09:30 snapshot)

- **PR #30:** merged normally via CLI to `main` at `6a48e5f02d210fef29c471daac9992e1e4693039`; exact main gates were 5/5 typechecks, 2/2 builds, 140 passed / 0 failed / 1 documented skip.
- **PR #24:** open at pushed head `7ac8afada2a6d05738f9ee0e8b2dbfdabf8c3747`. Exact-head gates: 5/5 typechecks, 2/2 builds, 139 passed / 0 failed / 1 documented skip. Its post-push Vercel deployment is READY and SSO-protected (HTTP 302); CLI JSON does not expose the SHA. GitHub says `MERGEABLE` / `UNSTABLE`; individual checks return 403. Leave open until status is clean.
- **PR #25:** original head `09a2470d50e0eff6ff3ee98a54568799478475f0` passed 5/5 typechecks, 2/2 builds, 140 passed / 0 failed / 1 documented skip. The local merge-forward with main `6a48e5f02d210fef29c471daac9992e1e4693039` had only docs conflicts; source merged cleanly. The combined candidate passes 5/5 typechecks, 2/2 builds and 142 passed / 0 failed / 1 documented skip, but has not yet been committed or pushed. GitHub currently reports UNKNOWN; the prior branch deployment is READY but predates this sync, and returns HTTP 302 to SSO. Refresh after push. The code change is an authorization gate, not a visual redesign; no PR-specific screenshot is claimed.
- **PR #29:** remains stacked on #24; retarget only after #24 merges. PRs #26–#28 need refreshed mergeability and exact-head status after the main update. `gh pr checks` results remain inaccessible for all open PRs.
- Production Supabase remains read-only; no schema, migration, role, Auth, or user-data writes were made. Migration drift and missing backup/schema-diff tooling remain blockers.

**Next:** finish, commit and non-force-push the tested PR #25 sync; refresh GitHub/Vercel status; merge only if normal CLI checks report clean/healthy, then rerun gates on `main`. Keep #24 open while UNSTABLE. Continue independent PRs, then build the comprehensive feature PR for the homepage-only preference notice and other safe remaining web functions. Native mobile remains out of scope.


## PR #25 main-sync checkpoint — 2026-11-10 09:40 WAT

PR #25's committed local merge-forward combines original head `09a2470d50e0eff6ff3ee98a54568799478475f0` with main parent `6a48e5f02d210fef29c471daac9992e1e4693039`. Exact-head local gates pass: typecheck 5/5, builds 2/2, tests 142 passed / 0 failed / 1 documented skip. The commit is not yet pushed; its previous Vercel alias is a Nov 9 build, and GitHub state remains UNKNOWN. Push without force and refresh both before any merge. PR #24 is pushed at `7ac8afada2a6d05738f9ee0e8b2dbfdabf8c3747` but remains open with `mergeStateStatus=UNSTABLE`; keep it open until clean. No production Supabase writes were made.


## Current status — 2026-11-10 09:49 WAT (supersedes earlier snapshots)

- **PR #25:** normally merged to `main` at `0bd1fd1eac09fa5905dc6f4437723fd209124fa8`. Exact post-merge main passed 5/5 typechecks, 2/2 builds, and 142 passed / 0 failed / 1 documented skip. Latest Vercel Production deployment is READY; the public origin returned HTTP 200, which is route/deployment evidence only.
- **PR #26:** original head `c8d0cbae86a421c4eae2c70d1c600a231990338f` passed 5/5 typechecks, 2/2 builds and 139 passed / 0 failed / 1 documented skip. Its current local merge candidate includes main parent `0bd1fd1eac09fa5905dc6f4437723fd209124fa8`, has no unresolved conflicts, and passes 5/5 typechecks, 2/2 builds, 143 passed / 0 failed / 1 documented skip. Candidate remains uncommitted/unpushed; final exact-head recheck follows the status-doc update. GitHub state is UNKNOWN; old branch preview is not evidence for this tree and redirects to SSO. The fix is functional-only; no PR-specific screenshot is claimed.
- **PR #24:** open at `7ac8afada2a6d05738f9ee0e8b2dbfdabf8c3747`. After PR #25 moved main, GitHub now reports UNKNOWN for both mergeability fields; individual checks return 403. Update the branch from latest main and rerun gates before any normal merge. PR #29 remains stacked on #24.
- **PRs #27–#28:** still need refreshed exact-head/mergeability checks against current main. Production schema, migration ledger, Auth settings, roles and user data remain unchanged; no production writes were made.

**Next:** finish and exact-test the PR #26 merge-forward, push normally, confirm a fresh READY Vercel deployment and healthy GitHub status, then merge only if normal CLI checks are clean and retest updated main. Refresh PR #24 against latest main but keep open until clean; continue with #27/#28 independently. Native mobile remains deferred; production Supabase remains read-only.


## PR #26 exact merge-commit checkpoint — 2026-11-10 09:51 WAT

PR #26 merge-forward commit `43772f73adc65f1f791dafd660e77080b0747db0` includes latest main parent `0bd1fd1eac09fa5905dc6f4437723fd209124fa8`. Exact-head verification passes on Node 22.23.4/pnpm 10.34.9: typecheck 5/5, builds 2/2, 144 tests total / 143 passed / 0 failed / 1 documented skip; `git diff --check` is clean. This commit is local and not yet pushed. Push normally, then inspect its new preview and current PR status before deciding on merge. PR #24 remains open because its post-main mergeability is UNKNOWN; no branch protection bypass is permitted.


## Current status — 2026-11-10 12:10 WAT

- PR #26 is merged normally at `9b895366e93a68c5912b0c837c00ff4947ad0785`. Vercel Production for that SHA is READY. The live History route still shows PR #30’s “Coming Soon” correction badge; PR #32 is still open.
- PR #27 remains open at old remote head `4fbc82da2924f8cf521588a5816b57818d3a0148`. GitHub’s normal merge was blocked by conflicts in the three release documents after #26 merged. Its local merge-forward candidate resolves only those docs against current main; source changes merged cleanly. Exact gates pass: Node 22.23.4/pnpm 10.34.9, typecheck 5/5, builds 2/2, 145 tests (144 passed, 0 failed, 1 documented PGlite skip). Local screenshots are now included under `docs/screenshots/pr27-radio-admin-read-errors/`. The candidate is not committed or pushed yet; it needs a fresh exact-head preview before any normal merge attempt.
- Other open PR states after main advanced: #24 UNKNOWN, #28 UNKNOWN, #29 DIRTY and dependent on #24, #31 UNKNOWN, #32 UNKNOWN. Individual GitHub check details still return 403. Do not bypass branch protection.
- Production Supabase remains read-only while duplicate migration versions and schema drift are unresolved. No production data, auth settings or roles were changed.


## Current status — 2026-11-10 12:21 WAT

PR #27 is merged normally; the current `main` SHA is `1d41bfae8afa63f9c0558053f3a44368b65ce816`. Vercel Production for that SHA is READY. Post-merge local verification on Node 22.23.4/pnpm 10.34.9 passed typecheck 5/5, builds 2/2, and 145 tests (144 passed, 0 failed, 1 documented PGlite skip). Production `/radio`, `/admin/radio`, `/admin/login` and `/itan-ilu-mi` returned HTTP 200. The unauthenticated `/admin/radio` response streams a safe meta-refresh to `/admin/login?next=%2Fadmin%2Fradio`; no staff editor content was exposed. The live History page still contains the old “Coming Soon” correction badge; PR #32 remains open.

PR #28 is still open at remote head `c3132dd456d238ae4dbc64f94348406277ad65c1`. A local sync worktree now includes current `main`; only the three release documents conflicted, and those were resolved to current main. The PR #27 main changes merged automatically. PR #28’s 10 local synthetic full-page screenshots (mobile and desktop for Contact, About, Guidelines, Privacy and Terms) are tracked under `docs/screenshots/pr28-public-contact-privacy/`; they predate PR #31/32 and are explicitly labeled local. This candidate is not yet committed, pushed or re-tested. Finish the exact gates and update PR #28 for review; do not merge. Other open PRs #24, #29, #31 and #32 remain open; GitHub check details return 403 and mergeability is UNKNOWN or DIRTY. Production Supabase remains read-only.


## Current status — 2026-11-10 12:25 WAT (PR #28 updated)

PR #27 is merged normally; current `main` is `1d41bfae8afa63f9c0558053f3a44368b65ce816`, and its Vercel Production deployment is READY. Exact post-merge gates passed 5/5 typechecks, 2/2 builds, 144 passed / 0 failed / 1 documented skip. Production `/admin/radio` gives unauthenticated visitors a streamed sign-in handoff to `/admin/login?next=%2Fadmin%2Fradio`; no staff editor content was returned.

PR #28 is OPEN at exact head `f422f418f8a4f0487a25c72d590be58d8bcfadcc`; GitHub reports CLEAN. Its exact Vercel preview is READY at `https://epe-lawa-oq13nm1fe-epe-lawa.vercel.app`, but direct requests return 302 to Vercel SSO, so hosted visual content is not reviewed. Exact head gates passed 5/5 typechecks, 2/2 builds, 144 passed / 0 failed / 1 documented skip. Ten local screenshot captures are tracked in `docs/screenshots/pr28-public-contact-privacy/`; they predate PR #31/#32. The PR body now includes current verification and screenshot links. Leave it open for owner review. Remaining PRs #24, #29, #31 and #32 are also open. No production Supabase writes were made.


## Current status — 2026-11-10 12:44 WAT (PR #31 local sync; supersedes earlier snapshots)

- Production `main` is `5f131ab50e6f0fbd4bc02b4e64a3b5e9956c82a8`, PR #28’s merge commit. PRs #25–#28 and #30 are merged. The latest owner instruction is to keep the remaining PRs open for review; no merge is planned here.
- PR #31 (`fix/homepage-only-cookie-notice`) is OPEN on remote head `e93705b9f6b5a6b55acf8524407d588027d6df56`; GitHub CLI last reported `UNKNOWN` for mergeability and merge state. Its local sync candidate includes current main; the conflict in `frontend/tests/ui-rebuild.test.mjs` combines homepage-only notice checks with PR #28 privacy/contact checks. The merge-forward commit and push are pending; the exact Vercel preview is not yet checked.
- Exact local gates on Node 22.23.4/pnpm 10.34.9 pass with canonical `NEXT_PUBLIC_SITE_URL`, `ALLOW_INDEXING=true`, and reserved dummy Supabase values: typecheck 5/5, builds 2/2, and 145 tests (144 passed, 0 failed, 1 documented PGlite skip). The repository’s `audit:ci` entry cannot run because `scripts/audit/run.mjs` is absent; no audit pass is claimed.
- Six local production-build screenshots under `docs/screenshots/pr31-homepage-only-notice/` show the notice fixed 12px above the bottom on the homepage at 320×568, 375×812 and 1440×900, and absent on News/Contact. The checks found no horizontal overflow at 320px or 375px. The local app used an empty-data stub bound only to `127.0.0.1`; no production service or data was contacted.
- Current CLI states for the dependent reviews: PR #24 OPEN/UNKNOWN, PR #29 OPEN/DIRTY/CONFLICTING and stacked on #24, PR #32 OPEN/UNKNOWN. Individual GitHub checks remain inaccessible to this CLI integration. Production Supabase schema, migration ledger, Auth settings, roles and user data remain untouched.

**Next:** commit with `info.epelawa@gmail.com` as author and committer, push the PR #31 sync without force, recheck its GitHub state and exact Vercel deployment, update the review description, then continue with the auth pair and PR #32 while leaving all PRs open.


## PR #24 exact sync verification — 2026-11-10 13:13 WAT

The local `feat/auth-reference-redesign` tree now includes the PR #31 merge on `main` (`2446eca26f96f567d5b79e188b7d3a54498fcc20`). Its shared UI-test conflict was resolved to retain the current homepage-only notice and privacy/contact assertions; no unresolved paths remain. Exact local gates on Node 22.23.4 / pnpm 10.34.9 passed: typecheck 5/5, both production builds 2/2, and the full suite 143 passed / 0 failed / 1 documented PGlite skip. The 1 skip is the known PGlite/PostgreSQL exclusion-constraint case. No failing tests are being waived.

Nine local production-build captures cover `/login`, `/auth`, and `/forgot-password` at 320×568, 375×812, and 1440×900. All nine checks passed for visible auth/card/heading, card bounds, no horizontal or vertical overflow, and no homepage-only notice on auth routes. The Google option is visibly disabled and labelled “Coming Soon”; this is UI evidence, not proof that OAuth or transactional email delivery is configured. Captures and setup notes: `docs/screenshots/pr24-auth-reference/`.

At this snapshot the local sync is verified but has not yet been committed or pushed. The remote PR still reports its old head as DIRTY/CONFLICTING; GitHub status-check details are inaccessible (403). Do not treat the old preview as evidence for this sync. Next: commit with the requested author/committer identity, push normally, verify the exact new Vercel preview and refreshed GitHub mergeability, then attempt only a normal merge if healthy. PR #29 remains dependent on PR #24; PR #32 remains open for the module-workflow sync. Production Supabase schema, migrations, Auth settings, roles and user data remain untouched.
