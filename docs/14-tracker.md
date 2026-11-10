# EPE-LAWA — Implementation Tracker

**Last checked:** 2026-11-10 10:08 WAT.

**Production code baseline:** `main` at `6a48e5f02d210fef29c471daac9992e1e4693039` (PR #30 squash merge).
**Scope:** The eight client-approved web modules plus cross-cutting member auth, staff access, publishing, privacy, accessibility, email and audit. Native mobile remains out of scope.

A route existing, a preview building, or a button being visible is not proof that a complete workflow works. Mark a capability complete only with named current evidence.

## Release snapshot

- The newest PR number is **#30**, now merged; the latest open PR is **#29**. PR #24–#29 remain open. The corrected Nov 10 instruction is to merge verified PRs normally in dependency order and test updated `main` after each; never bypass branch protection.
- `gh pr checks` has returned `Resource not accessible by integration` for the current PRs, so individual hosted CI results are **unverified**. Refresh each PR's actual state before merging; do not infer passing checks from a preview build.
- Vercel CLI reports recent deployments on the PR branch aliases as **READY**. Preview pages redirect to Vercel SSO (HTTP 302), so hosted page content cannot be inspected. The CLI JSON does not expose a deployment commit SHA; exact preview-to-HEAD matching is unverified except for PR #30, which was previously matched by the read-only audit.
- `https://epelawa.vercel.app` responded HTTP 200 for `/`, `/news`, `/itan-ilu-mi`, `/forum`, `/map`, `/business-directory`, `/tourism`, `/radio`, `/who-is-who`, `/auth`, and `/admin/login`. This proves route responses only, not correct content, authorization, data access, or complete workflows.
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
| Trending News | Reader and staff UI exist; PR #25 repairs the `article.create` gate. Full published-only reads, private preview, direct authorized publish, stale-revision denial and audit are not proven against production. | Keep drafts private; complete isolated authorization/publishing tests after schema reconciliation. Never publish synthetic or unapproved stories. |
| Itan Ilu Mi / Community History | PR #30 adds an honest **Coming Soon** disclosure for corrections/removal. This is not a correction workflow; the existing queue is for new contributions only. | Do not accept correction submissions that would be lost. Design durable, audited intake and edit/withdraw actions only after safe persistence is available. |
| Chat Forum / Digital Village Square | PR #26 fixes redirect handling. Authenticated participation, reporting, moderation, rate limits and audit are not verified end-to-end. | Reconcile missing database objects/helpers first; test member and moderator permissions with isolated data. |
| Map & Navigation | Current functionality constructs safe external Google Maps search/directions URLs. No Maps API, Places, geocoding or offline map integration is configured or verified. | Keep the external handoff honest; do not claim live maps/geocoding or ask for private location by default. |
| Business Directory & Marketplace | Routes/schema/UI are not proof of complete listing review, product/order handling or payment. Paystack is not confirmed operational. | Keep payments unavailable until provider sandbox and production-safe persistence/authorization are verified. |
| Historical Sites & Tourism | Public route responds, but sourced and approved destination data and full visit flows are not established by this audit. | Use only sourced, owner-approved records; retain honest empty/error states. |
| EPE LAWA Radio | PR #27 distinguishes admin query errors from empty data; stream rights, URL/format, actual playback, status, schedule and archive remain unverified. | Confirm stream rights and endpoint before enabling a player or claiming LIVE. |
| Who is Who in Epe | Public route responds, but verified profiles, provenance, correction/removal and staff workflow are not established. | Do not publish invented profiles or roles; verify human review and privacy rules against a reconciled schema. |

## Cross-cutting status and blockers

- **Auth and admin:** PR #24 and dependent PR #29 are open. Google sign-in must remain disabled until provider configuration is genuinely available. Only the approved verified identity may receive primary-admin capability; production role provisioning has not been performed or verified in this snapshot. No auth/email setting changes are authorized while production is read-only.
- **Cookie/preferences notice:** The separate worktree `fix/homepage-only-cookie-notice` has local edits moving the notice to a fixed, floating, homepage-only position. No PR is open yet and no screenshot has been captured for this in-progress change. Its full local gates should be rerun on the final diff before opening a focused PR.
- **Email:** Branded UI/template code does not prove delivery. Supabase SMTP/provider status and authenticated sender delivery have not been verified; do not promise that verification mail works end-to-end.
- **Persistence and providers:** No safe live waitlist persistence path was established. Do not show success for a submission that will be lost. Payment, map, media/stream and other provider-dependent flows stay unavailable until configured and verified.
- **Typography and visual system:** Use the legally available font fallback; no Codec Pro license was supplied. Keep the approved cobalt palette, light default, persisted manual dark mode, reduced-motion/accessibility requirements, and no public exposure of private admin contact details.
- **Screenshots:** Existing local artifacts are in the paths in the PR table; PR #25/#26 do not yet have a PR-specific capture. Local screenshots are not hosted-preview evidence. PR #24's auth captures predate the requested homepage-only cookie relocation and should not be used to claim that the current notice placement is fixed.

## Production schema and migration safety

The read-only CLI audit findings and safe reconciliation sequence are recorded in `docs/07-database-schema.md`. Production records seven migration versions while 22 later local files are unrecorded; local migration inventory has 29 files and two files share version `20261107213000`. Several pending migrations call `has_capability`, which is absent remotely. Production's `require_capability(text)` definition/security/grants differ from the local migration; key objects such as `comments`, `published_people`, and `people.achievements` are absent in the scoped catalog probe. A full dump/schema diff and verified backup were not possible because Docker/Podman and native `pg_dump`/`psql` are unavailable. Ledger state alone is not proof of schema state.

**Do not apply, repair, fake, or reconcile the production migration ledger.** First obtain a safe full backup and a reliable schema comparison path; resolve duplicate local versions in a branch; establish dependency/order and helper/grant corrections; rehearse forward-only migrations and restore on a disposable project/branch; and require explicit owner authorization before any production write.

## Next actions

1. Commit and push the tested PR #24 merge-from-main resolution without force, refresh the preview and GitHub mergeability, then attempt a normal CLI merge only if clean; test updated `main` after it merges.
2. After #24 merges, retarget PR #29 to `main`, rerun the exact-head gates, then merge normally if healthy; test updated `main` again. Refresh and resolve any main conflicts in PRs #25–#28 before merging them independently.
3. Add useful local screenshots for functional-only PRs #25/#26 where a changed state can be shown without sign-in or production data; otherwise document why no screenshot applies.
4. After current PRs are resolved, finish the homepage-only notice and remaining safe web functionality in one comprehensive feature PR, with full synthetic Playwright, accessibility, route, auth, staff authorization and responsive gates.
5. Build a read-only migration reconciliation plan and obtain a disposable schema rehearsal path; production remains read-only.


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


## PR #27 current checkpoint — 2026-11-10 09:57 WAT

PR #27 original head `e241c2d5a5cb92711fd2703f66c79a3205430a14` passed 5/5 typechecks, 2/2 builds and 139 passed / 0 failed / 1 documented skip. Its local merge-forward with main `0bd1fd1eac09fa5905dc6f4437723fd209124fa8` has no unresolved conflicts; the combined candidate passed 5/5 typechecks, 2/2 builds, 144 total tests (143 passed / 0 failed / 1 documented skip). A first typecheck attempt was blocked by stale generated `.next` references to a removed screenshot-only route; clearing only that unused generated admin directory resolved it, and the full suite was rerun successfully. Candidate remains uncommitted/unpushed; exact-head gates will run again after docs are included.

PR #27's remote head remains old, and GitHub reports UNKNOWN / UNKNOWN; individual check details return 403. The existing preview cannot validate the updated tree. PR #26's pushed preview is READY, but its merge state is UNSTABLE; PR #24 is UNKNOWN after main advanced. PR #25 is merged at `0bd1fd1eac09fa5905dc6f4437723fd209124fa8`, with exact main tests passing and the production deployment READY. Preserve the existing PR #27 local UI screenshot archive; PR #25/#26 are functional-only and have no visual screenshot claim. No production Supabase writes were made.


## PR #27 exact merge-commit checkpoint — 2026-11-10 09:58 WAT

PR #27 merge-forward commit `a05061a22e67f7d537223ebd3851ec67a121103e` has original head `e241c2d5a5cb92711fd2703f66c79a3205430a14` and updated main parent `0bd1fd1eac09fa5905dc6f4437723fd209124fa8`. Exact-head gates pass on Node 22.23.4/pnpm 10.34.9: typecheck 5/5, builds 2/2, tests 144 total / 143 passed / 0 failed / 1 documented skip; `git diff --check` is clean. The commit is local and not pushed. Existing screenshots: `/workspace/epe-lawa-release-screenshots/pr27-radio-error-local/1440x900-radio-read-failure-local.png` and `375x812-radio-read-failure-local.png`.

After including the status docs, rerun exact-head gates, push without force, and refresh preview/status. PR #27 is still OPEN on its old remote head with GitHub mergeability UNKNOWN; do not merge until the new preview is READY and the normal CLI reports a clean healthy state. PR #26 is READY-preview / UNSTABLE, PR #24 is UNKNOWN, and PR #25 is merged normally. Production remains read-only.


## PR #27 final branch checkpoint — 2026-11-10 10:01 WAT

Final local branch head `e6186c3c90fc9179d1995b0e1718e292d38b44f0` (source merge commit `a05061a22e67f7d537223ebd3851ec67a121103e`, main parent `0bd1fd1eac09fa5905dc6f4437723fd209124fa8`) passed exact branch gates on Node 22.23.4/pnpm 10.34.9: typecheck 5/5, builds 2/2, 144 tests / 143 passed / 0 failed / 1 documented skip. The full log history is preserved and checked. Screenshots: `/workspace/epe-lawa-release-screenshots/pr27-radio-error-local/1440x900-radio-read-failure-local.png` and `/workspace/epe-lawa-release-screenshots/pr27-radio-error-local/375x812-radio-read-failure-local.png`.

The final branch head is not pushed yet. After the normal push, verify the fresh preview and GitHub status; do not merge while status is UNKNOWN or checks are inaccessible. PR #26's preview is READY but merge state is UNSTABLE; PR #24 is UNKNOWN; PR #25 is merged. Production Supabase remains read-only.


## PR #28 main-sync checkpoint — 2026-11-10 10:08 WAT

PR #28 original head `d3d8bc66eb8f6468dcf6fb9c125375836d2fb452` passed 5/5 typechecks, 2/2 builds, 139 total tests / 138 passed / 0 failed / 1 documented skip. Its local merge-forward with latest main `0bd1fd1eac09fa5905dc6f4437723fd209124fa8` conflicted only in roadmap/tracker/progress docs; source merged automatically. The combined candidate has no unmerged paths and passes 5/5 typechecks, 2/2 builds, 143 total tests / 142 passed / 0 failed / 1 documented skip. Candidate remains local, uncommitted/unpushed; rerun exact-head gates after the status docs are included. Existing screenshot verified: `/workspace/epe-lawa-release-screenshots/pr28-public-contact-privacy/375x812-fullpage-contact.png`.

PR #28 remains OPEN at the old remote head, with GitHub mergeability UNKNOWN and checks inaccessible (403); require a fresh preview and current status after push. PR #27 is pushed at `4fbc82da2924f8cf521588a5816b57818d3a0148`, preview READY and GitHub CLEAN/MERGEABLE, but remains open for owner review. PR #26 remains UNSTABLE; PR #24 is UNKNOWN; PR #25 is merged. Production Supabase remains read-only.
