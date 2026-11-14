# Newsroom staff-read RLS fix — 2026-11-15

## Scope

Created from `470b7c0aecabcb5bab9f0423b8b865be1a970cd7` in isolated worktree `/workspace/EPE-LAWA-newsroom-rls`, branch `fix/newsroom-staff-read-rls-20261115`. This is a forward-only schema-only change. No accounts, content, Production project, remote, push, PR, or merge operations were performed.

## Change

`backend/supabase/migrations/20261115004000_newsroom_staff_read_rls.sql` adds eligible staff SELECT policies for `articles` and `article_versions`, plus restrictive SELECT guards to constrain any existing permissive policies. An authoring owner needs `article.create`; review/publish/unpublish staff may read newsroom rows. Public article versions require all of: `state = 'approved'`, their `article_id` must match the article row, and that article's `published_version_id` must equal the version ID. The article staff policy does not query `article_versions`, avoiding policy recursion; the version policy's article lookup does not recurse because article policies do not inspect versions. No write policies or grants are changed.

`backend/tests/schema.test.mjs` adds behavior checks in the full historical local migration chain, including own draft reads, unrelated authoring staff denial, reviewer/publisher access, member and anon denial, publication pointer advancement, unpublish, and authorized staff access to private approved history. Separately, `backend/tests/newsroom-staff-read-rls.test.mjs` creates a fresh minimal PGlite database containing only the verified Production baseline policies (`articles_read_published` and `article_versions_read_published`), required synthetic tables/auth helper, and this migration. It verifies owner-only author access, reviewer and publisher access, ordinary member and anon denial, exact-current approved pointer visibility, old-snapshot hiding on pointer change, and immediate hiding on unpublish. The fixture uses synthetic identifiers/data only and does not connect to or modify any remote/production system.

## Validation

- Node `22.23.5`; pnpm `10.34.9` (pinned via `npm exec`).
- Isolated Production-baseline regression test: **1 passed, 0 failed, 0 skipped**.
- Focused PGlite schema suite: **28 tests; 27 passed, 0 failed, 1 documented skip**. The skip is the existing PGlite exclusion-constraint limitation; the existing fixture shim also documents that `article_versions_guard` is absent from Production.
- `git diff --check`: clean after the new test addition.
- Changes intentionally remain uncommitted. No migration or historical test file was altered for this delegated review; the new tracked change is the focused isolated test and this handoff update, in addition to the pre-existing uncommitted migration and schema test.

## Final local checkpoint — 2026-11-15 00:42 WAT

Full workspace suite passed **238 tests: 237 passed, 0 failed, 1 documented skip**. Forced uncached typecheck/build passed **7/7 combined tasks** (5 typechecks, 2 builds), using Node 22.23.5 / pnpm 10.34.9 and localhost-only synthetic settings. Independent security review found no recursion or authorization blocker; the separate Production-baseline fixture passed. Source migration SHA-256 is `9a84a3c623eda99cdcaf4ed3d071dca6df3ef85576fe6b0428c3779254b63158`.

Done: additive policies and dual-baseline synthetic verification. Remaining: ordinary PR/merge, exact live policy/helper preflight, single migration apply and catalog verification. Blocked: no authenticated live draft workflow is claimed until these gates clear; content/account changes remain held. Resume: release this focused schema change first, separately from the Admin mobile CSS fix. No screenshot is applicable to a policy-only change.
