# Production remediation progress — 16 November 2026

## Implemented on this branch

The homepage now fetches an unexpired, flagged story from the published-only projection independently of the latest-news page, makes it the lead, deduplicates it from the remaining latest stories and displays an expiry-aware Breaking badge. It does not create content or change the hero. If the separate breaking query fails, the ordinary latest feed remains available and the server logs the failure without inventing a breaking story. Once an already-rendered badge expires it disappears; a refresh is needed to reorder the lead or see a newly designated story.

Local verification: typecheck and build passed; full suite after build passed 317 Node tests, one skipped, and 38 Vitest tests. Synthetic Playwright covered a breaking story outside the first page, an expired story excluded, a story already in the latest set without duplication, and linked-cover/logo fallback at 320/375/768/1024/1440. Four existing isolated PGlite newsletter and breaking-migration tests passed. These are not live production mutation tests.

## Production safety and state

Live migration history still ends with `20261118021656 newsletter_subscriptions_20261118`. The existing newsletter pause and breaking RPC migrations have not been applied. Catalog inspection confirmed anonymous and authenticated execute on the unsafe newsletter subscribe function and no `article_set_breaking` function; `newsletter_unsubscribe` remains available. A public aggregate query showed two published stories and no currently active breaking flag. The `audit_event` function is invoker-security; public client roles have no insert privilege on `audit_events` and RLS is enabled (this is limited metadata inspection, not full security validation).

Attempted to create a Supabase branch for rehearsal; the provider returned `entitlement_required`, saying branching requires a Pro plan. No other staging project was returned. The connector exposes no backup/restore operation, and this environment has no database connection or test-admin credentials. Because the owner explicitly requires a production backup and production-equivalent rehearsal before applying migrations, neither production migration was applied and no subscriber data was extracted. Existing PGlite fixture tests are useful but do not prove a backup, restore or full production compatibility. No unsafe grant or workaround was attempted.

## News research and account limitations

The public EPE LAWA Facebook page returned HTTP 403 to direct retrieval; search surfaced an interview, but its posting time and underlying claims were not independently verified. The EPE LAWA YouTube channel was discoverable; its 26 April 2025 interview (`https://www.youtube.com/watch?v=mZyTUklbReU`) is not recent breaking news. Search results for other sources require verification of dates, claims, and image rights. No test-admin credentials were available in the environment; GitHub Actions secret metadata access returned HTTP 403. No login was bypassed and **zero** articles were created or published. No story was designated breaking. Do not turn old reporting or an unverified claim into breaking news, or assume image licensing from search results.

## Security and release status

The application signup remains paused; the exposed database RPC is still a risk until revoked in production. Contact remains unavailable, not a functioning submission channel. `corepack pnpm audit --audit-level=high` still reports two high-severity picomatch paths for GHSA-fc5q-39xc-vjpf; the registry reports no patched version. Dependency paths are local build/test tooling; runtime attacker-controlled reachability has not been established and the audit is not suppressed. `pnpm audit:security` could not run because the configured `scripts/audit/run.mjs` is absent from the checkout; this is an additional tooling defect, not an assessment result. Comprehensive penetration testing, secure newsletter and contact implementation, restored-backup rehearsal, and final production verification remain incomplete. Do not merge as a fully verified production release while the required gates remain open.
