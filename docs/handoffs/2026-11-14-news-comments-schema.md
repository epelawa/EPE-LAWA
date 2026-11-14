# News comments schema — 14 Nov 2026

## Done

- Added a forward-only reconciliation for the missing `comments` and `comment_reports` relations. It creates schema, indexes, RLS and RPCs only; no comment or report rows are seeded.
- Kept public reads to the columns the News UI needs. Reporter identity and moderation-only fields are not granted to public clients.
- Restricted public comments and tombstones to published articles; member writes require an active, non-banned, authenticated account.
- Adapted report resolution to Production’s current `moderation_actions` checks: the report row and audit-event metadata preserve the decision without using unsupported `comment_report` / `actioned` / `dismissed` values.
- Made trigger and policy setup safe alongside legacy migration installs, without removing existing database objects.
- Focused tests: 5 passed. PostgreSQL parser: 33 top-level statements, 15 embedded policy statements, 2 trigger statements parsed. No standalone `DROP`/`TRUNCATE`, no seeded comments/reports. Migration SHA-256: `1e103ae5816ed3f4da8eb15e4c8be368ccb0dd7cdb0f8afbbedbb6810228c226`.

## Pending

- Commit, open a focused PR, and merge via the ordinary GitHub path after checks are healthy.
- Apply the exact reviewed migration to Production only after the PR is merged; record the generated ledger version.
- Verify table columns, RLS policies, column grants, function ACLs, and zero initial comment/report rows.
- Smoke-test available public News routes. Do not create a synthetic article or comment to exercise the article-detail form.

## Blocked / not included

- No published article is available for an end-to-end article-detail comment test, and creating public fixture content is not authorized.
- Article likes/reactions are not implemented in the current News UI or schema; treat them as a separate feature and PR.
- No account creation or account changes are part of this fix.

## Resume point

Start with the focused PR and ordinary checks. After merge, apply this migration once, verify the exact live schema and ledger, then continue the remaining route-schema repairs without creating user-facing content.
