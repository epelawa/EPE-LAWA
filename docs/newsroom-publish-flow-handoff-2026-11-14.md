# Newsroom publish-flow handoff — 2026-11-14

## Done

Audited `/admin/newsroom`, `/admin/newsroom/new`, `/admin/newsroom/[id]`, the server actions, their protected layouts, the direct-publish migration, and public `/news` and `/news/[slug]` reads. Existing create, private draft update, direct publish, immutable published snapshots, revision checks, audit events, public projection visibility, and path revalidation are present. The public listing and article route query `published_articles`, not the private `articles` table. Existing PGlite schema tests use isolated synthetic users, the migration-provided taxonomy (seven active categories), and a `Test Byline` fixture; they verify draft invisibility, direct publication, unpublished corrections remaining private, published corrections propagating, and rejection of regular/unverified staff writes. No Production records or schema were touched.

Added `frontend/tests/newsroom-publish-flow.test.mjs` for route/action contracts: create and edit call guarded database transitions, publishing passes the expected revision and revalidates public paths, public routes use only the published projection, and admin entry points retain the server-side guard.

## Remaining

The newsroom has no authorized UI for creating or managing editorial categories/bylines. Existing `authors` and `categories` tables grant clients read-only access; the supported capability catalogue contains no category/byline management capability and there are no management RPCs. Current admin setup therefore depends on reference rows already existing. The current migrations seed seven taxonomy categories, and local tests seed one byline, but this does not meet an admin-maintenance requirement.

No route-level browser end-to-end against a local auth/database provider, nor genuine app screenshots for create/edit/published mobile views, was produced. Do not mistake mockup/synthetic captures for application evidence. The request to coordinate the distinct News navbar dependency with agent a0 remains for the parent to relay.

## Blocked

The new requirement to let staff manage authors/categories conflicts with the explicit no-schema-change constraint and current RLS: authenticated clients have `SELECT` only for these tables. Bypassing this through a service-role key or browser-supplied credentials would violate the existing server-side authorization/security boundary. No safe implementation can write the reference tables using the supported schema/policies as they stand. A separately approved schema/RPC change (with a narrow capability, audit, and RLS design), or explicit owner-provided pre-existing reference data and an acceptable safe management mechanism, is needed before claiming this requirement complete. Production reference data must remain untouched until the owner supplies/approves it.

## Resume

1. Obtain explicit authorization for a narrowly scoped reference-data management design that preserves fresh capability checks and auditing; decide whether schema/RPC changes are allowed.
2. Use only local isolated fixtures to provision at least three active categories and synthetic bylines, then test authorized create/edit/direct publish, public listing and article visibility, hidden drafts, and unauthenticated/non-admin denial end to end.
3. Capture actual application screenshots at mobile widths for create, edit, and public-after-publish; coordinate the navbar dependency with agent a0.
4. Run tests, typecheck, build, and responsive/accessibility checks, record exact outcomes and HEAD, then open one focused PR for owner review. Do not merge.

## Validation evidence

- Focused newsroom/admin/public contract tests: **14 passed** (Node 24.22.1; pnpm 10.34.9).
- `pnpm typecheck`: **passed** (5 tasks).
- `pnpm build`: **passed** (main and admin production builds).
- Full `pnpm test`: **not green**. Besides a now-fixed assertion in the added test, the repository baseline reported failures in `frontend/tests/route-manifest.test.mjs` (manifest mismatch for `/dashboard`) and `frontend/tests/ui-rebuild.test.mjs` (dashboard markup expectation). These unrelated failures were not changed here.
- Runtime is Node 24.22.1 although project apps specify Node 22; pnpm emitted engine warnings. Hosted checks were not inspected and may be inaccessible (403); no hosted status is claimed.
- No database connection or Production access was used; no Production data/schema/environment writes were made.

Branch: `feat/admin-newsroom-publish-flow`. No merge was performed.
