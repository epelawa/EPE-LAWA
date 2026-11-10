# EPE-LAWA — Implementation Tracker

**Last checked:** 2026-11-10 (WAT).

**Production code baseline:** `main` at `cf7c8f0d8422bef4c285171e1c384c8664e04bc7`.
**Scope:** The eight client-approved web modules plus cross-cutting member auth, staff access, publishing, privacy, accessibility, email and audit. Native mobile remains out of scope.

A route existing, a preview building, or a button being visible is not proof that a complete workflow works. Mark a capability complete only with named current evidence.

## Release snapshot

- The latest open review PR is **#30**. PRs **#24–#30 are all OPEN and GitHub reports them mergeable**. The corrected Nov 10 instruction is to finish documentation, then normally merge verified PRs in dependency order and test updated `main` after each. Never bypass branch protection; if a normal merge is refused due to required checks, leave that PR open and continue independently mergeable work.
- The authenticated GitHub CLI can read PR state and head SHAs, but `gh pr checks` returns `Resource not accessible by integration` for all seven PRs. Individual hosted CI results are therefore **unverified**; do not describe them as passed.
- Vercel CLI reports recent deployments on the PR branch aliases as **READY**. Preview pages redirect to Vercel SSO (HTTP 302), so hosted page content cannot be inspected. The CLI JSON does not expose a deployment commit SHA; exact preview-to-HEAD matching is unverified except for PR #30, which was previously matched by the read-only audit.
- `https://epelawa.vercel.app` responded HTTP 200 for `/`, `/news`, `/itan-ilu-mi`, `/forum`, `/map`, `/business-directory`, `/tourism`, `/radio`, `/who-is-who`, `/auth`, and `/admin/login`. This proves route responses only, not correct content, authorization, data access, or complete workflows.
- No production Supabase schema, migration ledger, settings, account roles, or user data were changed. Production remains read-only while migration drift is unresolved.

## Review PRs

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

1. Push the documentation update on PR #30, run its exact-head gates and available preview checks, then attempt a normal CLI merge if healthy; test updated `main` after the merge.
2. Verify and normally merge the remaining existing PRs in dependency order (PR #24 before dependent PR #29); after every merge, rerun the main branch typecheck/build/test gates. If the merge command refuses because of required checks, leave that PR open and proceed only with independent PRs.
3. Add useful local screenshots for functional-only PRs #25/#26 where a changed state can be shown without sign-in or production data; otherwise document why no screenshot applies.
4. After current PRs are resolved, finish the homepage-only notice and remaining safe web functionality in one comprehensive feature PR, with full synthetic Playwright, accessibility, route, auth, staff authorization and responsive gates.
5. Build a read-only migration reconciliation plan and obtain a disposable schema rehearsal path; production remains read-only.
