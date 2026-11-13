# Handoff — Radio public-read publication filters

**Updated:** 2026-11-14 00:41 WAT

**Status:** Candidate PR open; not merged or deployed

**PR:** [#50](https://github.com/epelawa/EPE-LAWA/pull/50) — `fix/radio-published-only`

**Latest status checked before this documentation correction:** head `243e89896cf120ddf8224d7b1c1e41eb87077faa`, base `main`; PR `OPEN`, mergeability `UNKNOWN`. The GitHub CLI cannot read the check rollup. This documentation-only correction will advance the branch head; refresh status once more after pushing it.

## Done

- Public Radio reads now explicitly require published programmes, schedules and episodes. Programmes must also be active; schedule/archive entries require an inner relation to a published, active programme; archive episodes still require non-null `published_at`.
- Added a focused regression test for the three query paths and their parent/episode filters.
- Ran the full workspace typecheck (5/5 tasks), production builds (2/2 apps), focused Radio tests (7 passed), and full repository suite (183 passed, 0 failed, 1 documented PGlite skip; 184 total).
- Ran Chromium responsive checks at 320, 375, 768, 1024 and 1440 CSS px. All returned HTTP 200, had zero horizontal overflow, zero page/console errors, displayed distinct truthful empty states, and showed no synthetic draft sentinel.
- The loopback-only Supabase fixture recorded 18 reads—six per public table—and every request carried the required published/active filters. It returned no rows when filters were present and a synthetic draft sentinel otherwise. No production row contents or writes were used.
- Screenshots and gate details: [`docs/screenshots/radio-publication-visibility/2026-11-14/README.md`](../screenshots/radio-publication-visibility/2026-11-14/README.md). Temporary local servers, fixture script, dependency directories and `.next` build outputs were stopped or removed. The preserved `/workspace/EPE-LAWA` worktree was not modified.

## Fresh read-only Supabase comparison — 2026-11-14 00:39–00:41 WAT

The Supabase connector was used read-only to inspect the EPE-LAWA public schema, migration ledger, project metadata and existing branches. Only schema/ledger metadata and aggregate row counts were returned; no row contents, DDL or DML were used.

- Live migration ledger: 7 entries. Repository: 29 migration files; 22 repository migrations are absent from the live ledger.
- Version `20261102200006` is named `editorial_transitions` in the live ledger but the repository file is `20261102200006_staff_transitions.sql`.
- The repository reuses migration version `20261107213000` for both `news_comment_workflow` and `people_achievements`; this must be reconciled before a migration run.
- The live public schema has 21 tables and no Forum, Business/Marketplace, Community History or Tourism tables. Live `programmes` and `episodes` also lack `publication_status`; deploying this candidate before migration reconciliation would make those filtered reads fail closed and show Radio as unavailable, not expose drafts.
- The branch listing showed only the no-data `main` branch. No backup/restore test was performed and no data-bearing isolated restore target was identified.

## Pending

- Push this documentation-only correction, then refresh PR #50 at its new exact head. The previous docs head `243e898...` was `OPEN` with mergeability `UNKNOWN`; `gh pr checks 50` returned `GraphQL: Resource not accessible by integration (node.statusCheckRollup.nodes.0.commit.statusCheckRollup)`. Checks are unknown, not failed; do not merge without visible healthy exact-head checks.
- A backup/restore test remains undone. Establish a restore-capable, isolated target and confirm its cost/approval requirements first; do not create a billable branch or restore/overwrite Production without explicit approval.
- Before real schedule/archive records are published, verify the embedded parent-programme response shape against a non-empty PostgREST-shaped fixture; current local QA intentionally returned empty arrays.
- Keep live playback unavailable: official stream URL, permission, compatible format and playback remain unverified.
- Hosted Vercel preview metadata/page was not inspected; no Production UI E2E was performed.

## Blocked

- Production migration/schema drift, the duplicate local migration version and the live/local migration-name mismatch prevent a safe migration run. No schema change or production write was attempted.
- Exact-head GitHub check details are not exposed to the current connector, so no merge decision is safe.

## Resume

1. Push this doc correction; then refresh GitHub metadata and check visibility for the resulting exact PR #50 head using the authenticated CLI only.
2. Keep the PR open if checks remain inaccessible. Use a normal squash merge only after required checks are visible and healthy.
3. Get an approved backup/restore path (including any branch cost/organization decision), verify restoration in isolation, and reconcile the duplicate version/name mismatch before attempting migrations.
4. Reconcile the remaining schema drift read-only, then continue one focused module fix per PR. Preserve truthful empty/unavailable states and keep production data read-only until the recovery path is proven.

**Environment note:** the sandbox ran Node 24.22.1/pnpm 11.25.0 rather than the repository pins (Node 22/pnpm 10.34.9); engine/version warnings were emitted, but the stated local gates completed successfully.
