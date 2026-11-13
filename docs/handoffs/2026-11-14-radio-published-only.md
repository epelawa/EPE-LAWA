# Handoff — Radio public-read publication filters

**Updated:** 2026-11-14 00:32 WAT

**Status:** Candidate PR open; not merged or deployed

**PR:** [#50](https://github.com/epelawa/EPE-LAWA/pull/50) — `fix/radio-published-only`

**Code-only head checked:** `58148a120212cd3efa6d91a131d891ef1af36638` (base `main`; GitHub reported `MERGEABLE`)

## Done

- Public Radio reads now explicitly require published programmes, schedules and episodes. Programmes must also be active; schedule/archive entries require an inner relation to a published, active programme; archive episodes still require non-null `published_at`.
- Added a focused regression test for the three query paths and their parent/episode filters.
- Ran the full workspace typecheck (5/5 tasks), production builds (2/2 apps), focused Radio tests (7 passed), and full repository suite (183 passed, 0 failed, 1 documented PGlite skip; 184 total).
- Ran Chromium responsive checks at 320, 375, 768, 1024 and 1440 CSS px. All returned HTTP 200, had zero horizontal overflow, zero page/console errors, displayed distinct truthful empty states, and showed no synthetic draft sentinel.
- The loopback-only Supabase fixture recorded 18 reads—six per public table—and every request carried the required published/active filters. It returned no rows when filters were present and a synthetic draft sentinel otherwise. No production Supabase endpoint, credentials or data were used.
- Screenshots and gate details: [`docs/screenshots/radio-publication-visibility/2026-11-14/README.md`](../screenshots/radio-publication-visibility/2026-11-14/README.md). Temporary local servers, fixture script, dependency directories and `.next` build outputs were stopped or removed. The preserved `/workspace/EPE-LAWA` worktree was not modified.

## Pending

- Recheck PR #50 against its latest documentation-follow-up head. The metadata query succeeded, but `gh pr checks 50` returned `GraphQL: Resource not accessible by integration (node.statusCheckRollup.nodes.0.commit.statusCheckRollup)`. Checks are unknown, not failed; do not merge until a healthy exact-head status is visible through the approved CLI path.
- Hosted preview metadata/page was not inspected. Do not claim preview or production UI verification from this local candidate.
- Before real schedule/archive records are published, verify the embedded parent-programme response shape against a PostgREST-shaped fixture; this QA deliberately returned empty rows and did not exercise programme-name rendering.
- Keep live playback unavailable: official stream URL, permission, compatible format and playback remain unverified.

## Blocked

- Production Supabase schema/migration drift remains unresolved. No schema change or production write was attempted; reconcile the live schema read-only and confirm a safe backup before any migration-dependent release.
- PR status-check details are not exposed to the current GitHub connector, so a safe normal merge decision cannot yet be made.

## Resume

1. Push the documentation-only follow-up commit for this handoff, roadmap/progress entry and checklist row; it will advance PR #50 beyond the code-only SHA above.
2. Refresh GitHub metadata and exact-head checks for that new commit using the authenticated CLI only. Check preview metadata only if available through the existing authorized route; never treat a protected preview as inspected.
3. Use a normal squash merge only after exact-head required checks are healthy and visible. Otherwise leave the PR open and report the precise permission limitation.
4. Continue one focused module fix per PR. Preserve truthfulness and keep production database work read-only until schema reconciliation is complete.

**Environment note:** the sandbox ran Node 24.22.1/pnpm 11.25.0 rather than the repository pins (Node 22/pnpm 10.34.9); engine/version warnings were emitted, but the stated local gates completed successfully.
