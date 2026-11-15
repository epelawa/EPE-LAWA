# Forum RPC anonymous permission repair

Checkpoint: 2026-11-15 01:18 WAT, main base `51aae3b`.

Production verification after PR #85 found Supabase's default privileges explicitly grant `anon` function EXECUTE. Revoking PUBLIC alone does not remove that role grant. The existing capability checks still deny anonymous moderation, but the unnecessary invocation surface must be removed. The already applied migration is preserved; new additive migration `20261115010200_forum_rpc_explicit_anon_acl.sql` explicitly revokes PUBLIC and anon for the two moderation RPCs while preserving authenticated execution and server-side capability checks.

A separate PGlite fixture reproduces Supabase-style default function grants, confirms the old PUBLIC-only revoke leaves anon access, then proves the new ACL repair denies anon and preserves authenticated execution; rerun safety is also checked. Focused tests: 29 total, 28 passed, 0 failed, 1 existing skip. Full suite: 244 total, 243 passed, 0 failed, 1 existing skip. Forced build2/2 and typecheck5/5 passed on pinned Node22.23.5/pnpm10.34.9 with local-only fixtures. SQL-only change, no UI screenshot applicable.

Remaining: ordinary PR/merge, exact ACL-only application, read back `has_function_privilege` for both roles and ledger version. No content or account writes, no data deletion, and no migration-history edits.
