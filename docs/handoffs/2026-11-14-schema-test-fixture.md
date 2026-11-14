# Schema-test fixture regression handoff

**Updated:** 2026-11-14 23:38 WAT. **Branch:** `test/schema-comment-acl-ban-regression-20261114`.
**Base:** `main` at `64370cb9c17e6d6445cd9227ca6ee451119c31a4` (PR #79 merge commit)

## Done

- Diagnosed two linked failures in `backend/tests/schema.test.mjs`. The forward-only News comments migration intentionally grants a limited set of selectable fields, excluding `author_id`; the old synthetic test filtered on that restricted field. The permission error stopped the test before it revoked its synthetic member ban, so the following poll test then correctly saw `member_banned`.
- Updated only the synthetic test fixture: it seeds a hidden own-comment row, checks access by permitted `id`, and confirms a different member cannot read that hidden row. This preserves the migration's restricted `author_id` column grant and does not change production SQL.
- With Node `22.23.5` / pnpm `10.34.9`, `pnpm exec tsx --conditions=react-server --test backend/tests/schema.test.mjs` passed **23**, failed **0**, skipped **1 documented PGlite constraint case**.
- The Auth worktree independently passed its 15 focused member-auth regressions, workspace typecheck (**5/5 tasks**) and both production builds (**2/2**) using localhost-only synthetic Supabase configuration. Its full workspace suite had the two now-diagnosed schema-test failures before this fixture correction.

## Pending

- Commit and push this test-only branch, create its focused PR and attempt an ordinary merge.
- After the test PR merges, fast-forward the isolated Auth branch to current `main`, rerun the full suite and focused Auth tests on the exact resulting tree, then open the separate Auth PR if all local gates pass.

## Blocked

- GitHub hosted check details are unavailable to the connected CLI; do not claim hosted CI is green or bypass a merge gate.
- No Production schema, Auth settings, user account or content was changed in this step. Production migration/release work remains separately subject to its live-schema preflight and release gates.

## Resume

1. Commit/push this test-only fix without force and open one focused PR.
2. Use only the normal GitHub merge path; if blocked, report the exact gate and do not bypass it.
3. Sync Auth to the merged `main`; rerun the exact focused and full test suites, then push/open the Auth PR only after a clean full suite.


## Verification refresh — 2026-11-14 23:41 WAT

After building the isolated worktree first, the complete workspace gates passed on Node `22.23.5` / pnpm `10.34.9`: typecheck **5/5 tasks**, production builds **2/2 tasks**, and full suite **225 total: 224 passed, 0 failed, 1 documented PGlite constraint skip**. Build/test configuration used a loopback-only synthetic Supabase endpoint and dummy key. The earlier four local HTTP-smoke socket failures were from running before this worktree had built app artifacts; they did not recur after the builds. This branch is test-only and is ready for a focused PR; no production changes were made.
