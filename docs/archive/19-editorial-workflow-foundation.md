> **ARCHIVED 2026-11-02.** Superseded by `docs/00-master-plan.md` and `docs/12-development-roadmap.md`. Retained as a historical record of what was built and verified at the time; contents may be outdated. Current project status and requirements are in the master plan and development roadmap.

# Phase 1 — Editorial Workflow Foundation

**Status:** Unwired local workflow model; not a CMS, API, database migration or production authorisation mechanism.

## What was implemented

`backend/packages/editorial` models creation of a private draft, editing into a new version, submission for review, requests for revision, approval, publication and withdrawal. A provisional conservative rule requires an approver different from both the article owner and the most recent version author. This is not the final editorial policy; the owner has not yet approved self-approval or the role/capability matrix. There is no emergency bypass.

Each transition checks an expected revision, copies snapshots and returns a minimal action record. An allowlisted projection returns only title, summary and body from an approved, currently published version. Tests use temporary in-memory synthetic records; none are deployed. Field limits are provisional implementation safeguards, not approved final contracts. The model does not yet cover publication dates, public slugs, author/category/tag/media snapshots, rich-text sanitisation, private preview, archive, durable corrections, revalidation or real records.

## Critical boundaries

- This package trusts its inputs. It cannot authenticate an actor, prove capabilities, prevent a forged or altered article, enforce RLS, or guarantee audit integrity. No application route, job or public page calls it.
- A future persistent implementation must enforce authorisation and workflow at the server and database boundaries, commit the transition and audit together, enforce version ownership/immutability, and compare the expected revision atomically. Returning a revision or audit object in JavaScript is not a transaction or durable audit trail.
- Public data must come from a safe published-only database projection and be withdrawn/revalidated reliably. The model's projection is not a database view or public API and cannot secure content by itself.
- No schema was added or applied, and no provider settings or real users were changed. Finalise the matrix, workflow and transaction design, review the migration and target/recovery plan, and run positive and negative real-provider tests before enabling editorial routes.
- Main and news remain unconnected; admin remains closed. Do not describe this as completing the requested three Phase 1 areas.

## Verification

`frontend/tests/editorial.test.mjs` covers a synthetic draft/review/approval/publication sequence, provisional independent approval, revision requests, stale revisions, invalid states, denial, snapshot isolation, withdrawal and public field projection. These are pure in-memory tests, not database, provider, HTTP, browser, accessibility or concurrency tests.

## Publication and withdrawal requirement — owner direction

The owner wants published material to appear promptly and removed material to disappear promptly. The unwired `executeEditorialCommand` / `readPublishedArticle` contract now demonstrates a fresh authoritative read after publication and withdrawal, an atomic compare-and-commit requirement for state plus audit, and conflict/error handling in synthetic in-memory tests. The implementation does not provide a database transaction, connected pages, a live publication API or actual cache control. Before release, the real repository, public projection and pages must use authoritative reads with suitable no-store semantics or verified invalidation; test homepage, lists, article URLs, metadata, search and CDN after each publish, correction and removal. Previously copied or cached public material outside the platform cannot be recalled.

The existing `unpublish` model removes the article from the public projection but retains internal history. It is **not** implemented hard deletion or a final retention policy; actual deletion, audit retention and privacy requirements still need review. The model does not yet establish a real-world timing guarantee.

On 2 November 2026, the connected production project reported healthy Auth, database and REST services. Its migration history contained only `20261102133703_staff_access_foundation`, matching the sole local migration; there was no unapplied migration to run. No new migration or provider configuration was applied. A reviewed persistent editorial schema, backup/recovery assessment, role matrix and security tests remain necessary before changing production.
