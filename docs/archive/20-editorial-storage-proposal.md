> **ARCHIVED 2026-11-02.** Superseded by `docs/00-master-plan.md` and `docs/12-development-roadmap.md`. Retained as a historical record of what was built and verified at the time; contents may be outdated. Current project status and requirements are in the master plan and development roadmap.

# Phase 1 — experimental editorial storage and commands

**Status: isolated prototype only; not a migration, not deployed, and not a usable CMS.** `backend/supabase/proposals/editorial_storage.sql` and `editorial_commands.sql` are intentionally outside the migration directory. The previous session's unmerged storage proposal was absent from this new branch; its design and tests were reconstructed here and extended with experimental commands. No production data or provider configuration was changed.

## Prototype

- Same-article foreign keys constrain current and published version pointers; publication requires a corresponding approval row. Audit events have unique per-article revisions. Restrictive staff references currently block staff deletion.
- All five private tables have RLS enabled and table privileges revoked from public, anonymous, authenticated and service roles. The owner and other privileged database roles can still bypass or change these restrictions. No public reads or table policies exist.
- Experimental `SECURITY DEFINER` creation and transition functions accept an identity only from `auth.uid()` and require an active profile, an `admin.access` entry grant and the relevant provisional capabilities. They lock the profile/grants and article row, compare revisions, apply the transition and append an audit event in the same transaction. Owner and most recent version author cannot approve; this remains a provisional policy, not final owner approval. Table grants remain denied even when the functions are executable. Helper functions are not executable by application roles.
- Synthetic PGlite tests cover identity and capability denial, self-approval, stale revisions, draft isolation, publication/withdrawal, revocation/inactivation, pointer integrity, denied direct table access and rollback on an injected audit failure. This is not testing a real Supabase project or concurrent clients.

## Release blockers — do not deploy as-is

1. The role matrix and independent-approval rule are provisional. SQL function owner, `SECURITY DEFINER` privileges/search-path, error disclosure, row locks/deadlocks, input limits, rate limits, API exposure, revocation and concurrent races require independent security review and real-provider tests. Synthetic tests cannot prove these properties.
2. Privileged database owners can bypass the workflow and alter versions or audit records. Application-facing commands do not update existing version content, but there is no independent immutable-version trigger or durable tamper-resistant audit guarantee. Audit retention and legal deletion are unresolved.
3. There is no provisioning process, staff recovery, route authorization, authenticated UI, production repository, safe public projection, public API, listing, slugs, search, metadata or cache configuration. The prototype is not connected to the pure TypeScript model. Public pages must never read raw private tables.
4. PostgreSQL text/whitespace constraints differ from JavaScript's UTF-16 limits and trimming; reconcile validation and safe rendering. The SQL surface can return detailed constraint errors and must not be exposed publicly as currently written.
5. Locking/stale-revision and rollback are tested only in a single in-memory database session. Exercise real concurrent transactions, transaction timeouts, grant-revocation ordering, failover and application retries, including the uncertain-commit case. Missing or corrupt state must fail closed.
6. Verify the target, backup/restore and recovery objectives, migration compatibility and rollback before a reviewed migration; no production editorial migration exists. Restrictive foreign keys obstruct account deletion and need an approved pseudonymisation/deletion policy. A withdrawal cannot recall externally copied content.
7. The owner's requirement is prompt publication and removal. Real pages, metadata, lists, search and CDN caches need verified no-store or invalidation and live withdrawal tests. The prototype supplies no global visibility/removal guarantee.

**Next:** review and complete the database and authorization model, implement secure real-provider integration and audit, and test the complete system before opening admin or connecting public pages. No demo or seeded production data is permitted.
