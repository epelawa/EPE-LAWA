# Forum moderation schema repair

Checkpoint: 2026-11-15 01:05 WAT. Base main `386b29d`.

## Done

Production catalog confirmed all four queue relations absent. The new forward-only `20261115010000_forum_moderation_schema_repair.sql` creates categories, threads, posts and private reports without content rows. Existing migrations/history remain untouched. Unique `*_repair` policies coexist with the full local chain. Staff resolution requires `moderation.review`, supported action, reason and open-report locking; it records moderation and security audit events. Ordinary members cannot resolve reports or read other members’ reports. Public callers cannot read reports or hidden posts.

Synthetic verification uses both the full migration chain and a separate Production-shaped baseline with no Forum tables. Missing-table behavior test passed 1/1. Complete combined-main suite: 243 total, 242 passed, 0 failed, 1 pre-existing PGlite exclusion-constraint skip. Forced build: 2/2; forced typecheck: 5/5, pinned Node 22.23.5/pnpm 10.34.9. No interface source changes; screenshots not applicable to this SQL-only repair.

## Remaining

Open focused PR, ordinary merge, fresh live prerequisite check, apply the exact reviewed additive migration, then verify grants/policies and PostgREST schema readiness. Authenticated live moderation requires an authorized staff session; no synthetic public threads/posts/reports may be created in Production.

## Blocked / resume

No Production rows, credentials or accounts changed by this branch. Public Forum creation and polls are outside this minimal queue repair; do not claim the entire Forum was provisioned. Resume at ordinary PR and live schema preflight. No reset, DROP, TRUNCATE, data deletion or migration-history rewrite.
