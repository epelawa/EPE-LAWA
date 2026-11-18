# Breaking news continuation — 16 November 2026

## Scope delivered on branch

- Authorized publishers can set or extend a breaking label for an already published article for 1, 6, 24 or 48 hours, or remove it, from its newsroom workflow. The control affects the current public article, never publishes a private revision, and reports RPC failure rather than false success.
- The public News landing page independently fetches up to ten published, flagged, unexpired stories for its breaking banner, so an older active story is not lost beyond page one. Search/category and later pages keep their filtered listing without an unrelated banner. Failed banner queries are disclosed. The banner and News badges expire while a page remains open; the member Home breaking cards also expire and transition to an empty state. The views refresh their clock on focus/visibility changes. This is not a realtime feed: newly marked, manually removed or unpublished stories require a page refresh.
- The local forward-only migration `20261118060000_restore_article_set_breaking.sql` restores a security-definer RPC, requires `article.publish`, rejects unpublished articles, missing flags, invalid/expired/infinite expiry and stale or missing revisions, locks the article, updates the revision and writes an audit event. It explicitly denies anon execution and grants authenticated execution; authorization is still enforced by the database.

## Production status and safety

Read-only production catalog inspection showed **no** `article_set_breaking` function. The production `require_capability` and `audit_event` signatures required by the migration are present; read-only definition review showed verified active staff and a non-revoked capability are required. No production changes or test writes were made. **The migration has not been applied**, so the newsroom control is not operational against the currently inspected production database; it will fail with an error until an authorized reconciled migration and live verification take place. The newsletter revoke remains separately unapplied and urgent. Do not deploy this code as a completed breaking workflow ahead of database reconciliation.

## Verification and limitations

- PGlite synthetic tests applied the migration twice, checked grants, denied anon and unauthorized staff, rejected unpublished, null/stale revision, null flag and invalid expiry, and verified successful set/remove, revision increments and audit entries. This is an isolated production-shaped fixture, not a restored production database.
- Vitest uses fake time to verify banner, label and member-card expiry. Static contract checks cover wiring and duration allowlist.
- Typecheck: 5 tasks passed; build: 2 tasks passed; full suite after build: 317 Node tests passed, one skipped, and 38 Vitest tests passed.
- Synthetic Playwright: the five-width existing News navigation tests passed; an older active breaking article beyond the first listing page appeared while an expired one did not; the signed-in dashboard Home/Discover scenario passed. The first browser launch failed for missing NSS libraries; after extracting temporary Chromium libraries the tests ran. The dashboard scenario initially revealed a stale pre-existing expectation that a missing image has no `img`; it was corrected to check the logo fallback introduced in PR #157 and passed on rerun.
- Admin control has not been exercised end-to-end in a browser or against a reconciled staging database. No full browser/accessibility matrix, production writes, provider tests or comprehensive security assessment were performed. The dependency audit high advisory remains open; do not merge until required gates are satisfied.

## Remaining work

Continue the baseline/schema reconciliation, isolated restore rehearsal and dependency advisory investigation; resolve the newsletter RPC exposure and implement safe signup/contact; finish News search, navigation and discovery; verify breaking end-to-end with authorized and unauthorized synthetic staff on a reconciled staging database and then via read-only production checks after an approved deployment. The broader article presentation, newsroom workflows, publication/deletion, analytics, identity, all eight web areas, providers/legal, full security assessment and release matrix remain in `2026-11-16-security-assessment-progress.md` and `2026-11-18-continuation-next-steps.md`.
