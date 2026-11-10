# EPE-LAWA — Implementation Tracker

**Last checked:** 2026-11-10 10:33 WAT.

**Production code baseline:** `main` at `0bd1fd1eac09fa5905dc6f4437723fd209124fa8` (PR #25 merge; includes PR #30).
**Scope:** The eight client-approved web modules plus cross-cutting member auth, staff access, publishing, privacy, accessibility, email and audit. Native mobile remains out of scope.

A route existing, a preview building, or a button being visible is not proof that a complete workflow works. Mark a capability complete only with named current evidence.

## Release snapshot

- PR #31 is now the newest PR and is OPEN; PR #25 and #30 are merged. PRs #24, #26, #27, #28 and #29 also remain open. The latest owner direction is to keep review PRs open and continue implementation; do not merge them.
- `gh pr checks` has returned `Resource not accessible by integration` for current PRs, so individual hosted CI results are **unverified**. Do not infer passing checks from a preview build; keep PRs open for review.
- Vercel status must be refreshed for each exact pushed head. Previews redirect to Vercel SSO (HTTP 302), so hosted content cannot be inspected; a READY deployment is not proof of passing hosted CI or a correct page.
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
- **Cookie/preferences notice:** The local `fix/homepage-only-cookie-notice` implementation mounts the fixed notice only on `/`, preserves dismissal, clears its spacer on route changes, and tightens the 320×568 hero to keep its CTA visible. Exact local gates and Playwright checks passed; local-only screenshots are recorded in the current 10:28 status below. No hosted deployment is claimed.
- **Email:** Branded UI/template code does not prove delivery. Supabase SMTP/provider status and authenticated sender delivery have not been verified; do not promise that verification mail works end-to-end.
- **Persistence and providers:** No safe live waitlist persistence path was established. Do not show success for a submission that will be lost. Payment, map, media/stream and other provider-dependent flows stay unavailable until configured and verified.
- **Typography and visual system:** Use the legally available font fallback; no Codec Pro license was supplied. Keep the approved cobalt palette, light default, persisted manual dark mode, reduced-motion/accessibility requirements, and no public exposure of private admin contact details.
- **Screenshots:** Existing local artifacts are in the PR table. The homepage-notice archive contains local-labelled mobile/desktop homepage screenshots and a public privacy-page screenshot showing the notice absent. Local images are not hosted-preview evidence.

## Production schema and migration safety

The read-only CLI audit findings and safe reconciliation sequence are recorded in `docs/07-database-schema.md`. Production records seven migration versions while 22 later local files are unrecorded; local migration inventory has 29 files and two files share version `20261107213000`. Several pending migrations call `has_capability`, which is absent remotely. Production's `require_capability(text)` definition/security/grants differ from the local migration; key objects such as `comments`, `published_people`, and `people.achievements` are absent in the scoped catalog probe. A full dump/schema diff and verified backup were not possible because Docker/Podman and native `pg_dump`/`psql` are unavailable. Ledger state alone is not proof of schema state.

**Do not apply, repair, fake, or reconcile the production migration ledger.** First obtain a safe full backup and a reliable schema comparison path; resolve duplicate local versions in a branch; establish dependency/order and helper/grant corrections; rehearse forward-only migrations and restore on a disposable project/branch; and require explicit owner authorization before any production write.

## Next actions

1. Recheck PR #31's exact Vercel preview after its current BUILDING state resolves; keep it open for review and do not claim hosted content while SSO-protected.
2. Keep PRs #24 and #26–#29 open for review. Continue with the remaining web-feature audit; fix safe, independently verifiable behavior and keep provider/schema-blocked features honestly unavailable.
3. Prepare one consolidated follow-up feature PR for the remaining agreed web scope only after its changes, synthetic tests, route/auth/security checks and screenshots are complete. Native mobile remains deferred.
4. Refresh stale PR documentation and record hosted-check limitations without treating Vercel READY as proof of passing hosted CI.
5. Produce a read-only migration reconciliation plan and obtain a disposable schema rehearsal path; production remains read-only.


## Current status — 2026-11-10 09:38 WAT (supersedes the 09:30 snapshot)

- **PR #30:** merged normally via CLI to `main` at `6a48e5f02d210fef29c471daac9992e1e4693039`; exact main gates were 5/5 typechecks, 2/2 builds, 140 passed / 0 failed / 1 documented skip.
- **PR #24:** open at pushed head `7ac8afada2a6d05738f9ee0e8b2dbfdabf8c3747`. Exact-head gates: 5/5 typechecks, 2/2 builds, 139 passed / 0 failed / 1 documented skip. Its post-push Vercel deployment is READY and SSO-protected (HTTP 302); CLI JSON does not expose the SHA. GitHub says `MERGEABLE` / `UNSTABLE`; individual checks return 403. Leave open until status is clean.
- **PR #25:** original head `09a2470d50e0eff6ff3ee98a54568799478475f0` passed 5/5 typechecks, 2/2 builds, 140 passed / 0 failed / 1 documented skip. The local merge-forward with main `6a48e5f02d210fef29c471daac9992e1e4693039` had only docs conflicts; source merged cleanly. The combined candidate passes 5/5 typechecks, 2/2 builds and 142 passed / 0 failed / 1 documented skip, but has not yet been committed or pushed. GitHub currently reports UNKNOWN; the prior branch deployment is READY but predates this sync, and returns HTTP 302 to SSO. Refresh after push. The code change is an authorization gate, not a visual redesign; no PR-specific screenshot is claimed.
- **PR #29:** remains stacked on #24; retarget only after #24 merges. PRs #26–#28 need refreshed mergeability and exact-head status after the main update. `gh pr checks` results remain inaccessible for all open PRs.
- Production Supabase remains read-only; no schema, migration, role, Auth, or user-data writes were made. Migration drift and missing backup/schema-diff tooling remain blockers.

**Next:** finish, commit and non-force-push the tested PR #25 sync; refresh GitHub/Vercel status; merge only if normal CLI checks report clean/healthy, then rerun gates on `main`. Keep #24 open while UNSTABLE. Continue independent PRs, then build the comprehensive feature PR for the homepage-only preference notice and other safe remaining web functions. Native mobile remains out of scope.


## PR #25 main-sync checkpoint — 2026-11-10 09:40 WAT

PR #25's committed local merge-forward combines original head `09a2470d50e0eff6ff3ee98a54568799478475f0` with main parent `6a48e5f02d210fef29c471daac9992e1e4693039`. Exact-head local gates pass: typecheck 5/5, builds 2/2, tests 142 passed / 0 failed / 1 documented skip. The commit is not yet pushed; its previous Vercel alias is a Nov 9 build, and GitHub state remains UNKNOWN. Push without force and refresh both before any merge. PR #24 is pushed at `7ac8afada2a6d05738f9ee0e8b2dbfdabf8c3747` but remains open with `mergeStateStatus=UNSTABLE`; keep it open until clean. No production Supabase writes were made.


## Current state — 2026-11-10 10:28 WAT (supersedes earlier snapshots)

- **Main baseline:** `0bd1fd1eac09fa5905dc6f4437723fd209124fa8`. PR #25 and PR #30 are merged. Latest existing PR: #30. Open review PRs: #24 (head `7ac8afada2a6d05738f9ee0e8b2dbfdabf8c3747`, DIRTY), #26 (`dc39b581b7e920bc905cc81de83d77e38188d4cd`, CLEAN), #27 (`4fbc82da2924f8cf521588a5816b57818d3a0148`, CLEAN), #28 (`c3132dd456d238ae4dbc64f94348406277ad65c1`, CLEAN), and #29 (`373d92febbd7e3f193ff10b0a251a6e414bf2a49`, UNKNOWN). GitHub CLI check-detail endpoints remain inaccessible; do not infer CI status or merge any review PR.
- **Homepage notice:** local changes on `fix/homepage-only-cookie-notice`, based on `main` at `0bd1fd1eac09fa5905dc6f4437723fd209124fa8`. Before opening the new PR, exact local gates passed on Node 22.23.4/pnpm 10.34.9: 5/5 typecheck tasks, 2/2 builds, 142 passed / 0 failed / 1 documented PGlite skip. `git diff --check` passed.
- **Browser QA:** local Playwright tested 320×568, 375×812 and 1440×900. Notice is present and fixed only on `/`; no horizontal overflow; it does not cover the hero controls (including the short 320×568 layout); both action targets are at least 44px. Dismissal persists after reload and clears the CSS height; client navigation to `/news` removes the component and resets the spacer. `/auth`, `/privacy`, and `/admin/login` render without it; no browser page errors were observed.
- **Screenshots — local-only, not hosted:** `/workspace/epe-lawa-release-screenshots/pr31-homepage-only-cookie/local-home-320x568.png`, `local-home-375x812.png`, `local-home-1440x900.png`, and `local-privacy-375x812-no-notice.png`. Supporting local route captures and JSON are also in the same directory. These do not claim a hosted preview.
- **Provider/schema blockers remain:** production migration-ledger/schema drift is unresolved and production remains read-only. Do not claim durable History correction intake, waitlist persistence, production publishing, role provisioning, Google OAuth, email delivery, Maps API, or Radio playback until the relevant schema/provider/rights checks are actually satisfied. Continue the requested feature audit and implement safe functionality; use honest unavailable states only for genuine blockers.

**Next:** commit/push this focused notice change and open it for review; verify its exact Vercel deployment through CLI and leave the PR open. Then continue the remaining web-feature audit toward one consolidated feature PR, with local synthetic tests and screenshots. No native app work or production database writes.


## PR #31 — 2026-11-10 10:33 WAT

- **Review:** [#31 — Keep the storage notice homepage-only](https://github.com/epelawa/EPE-LAWA/pull/31), OPEN, head `31e853997d7c424ad9ea3c2fa2288180c6167322`, base `main`. GitHub reports `UNSTABLE`; individual check details return an integration 403. Leave open; no merge attempted.
- **Vercel:** Exact branch alias `https://epe-lawa-3f8qy7842-epe-lawa.vercel.app` is BUILDING; build record reports READY. Hosted page content is not verified and no hosted screenshot is claimed. Recheck after status-doc push.
- **Local verification:** Exact source commit passed Node 22.23.4/pnpm 10.34.9 typecheck 5/5, builds 2/2, tests 142 passed / 0 failed / 1 documented PGlite skip. Responsive Playwright and local-only screenshots are recorded in the 10:28 entries above.
- **Current worktree:** The PR-specific URL/deployment addendum is being added as a documentation-only commit; rerun final gates, push normally, and refresh the preview and GitHub summary. Production Supabase remains read-only. Continue the remaining feature audit after this PR status is recorded.


## PR #31 status refresh — 2026-11-10 10:35 WAT

The authenticated GitHub CLI now reports PR #31 OPEN and CLEAN at source head `31e853997d7c424ad9ea3c2fa2288180c6167322`. Individual check details remain inaccessible (403). The exact Vercel deployment `https://epe-lawa-3f8qy7842-epe-lawa.vercel.app` is READY; its branch alias returns HTTP 302 to Vercel SSO, so no hosted content has been reviewed. Keep the PR open. This status-doc refresh will create a new commit and deployment; recheck its gates and hosted state after push.
