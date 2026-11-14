# Read-only database schema audit

`backend/scripts/schema-audit.mjs` checks explicitly listed tables/columns, named views and routines, and optional explicit row-existence expectations in the selected schema. It uses `psql` and reads schema metadata from `information_schema` plus only the exact key lookups listed in `rowExpectations`; it never scans application rows or reads migration data. It does not apply migrations or create/repair any schema or rows. The connection must be supplied as `DATABASE_URL` in the process environment. The script never echoes that value or row key values and suppresses psql diagnostics, which might contain connection details.

## Run

Install/use `psql`, then run from the repository root:

```sh
DATABASE_URL='postgresql://…' node backend/scripts/schema-audit.mjs
DATABASE_URL='postgresql://…' node backend/scripts/schema-audit.mjs --json
DATABASE_URL='postgresql://…' node backend/scripts/schema-audit.mjs --manifest path/to/manifest.json --json
```

The audit requests PostgreSQL's `default_transaction_read_only=on`, and its SQL is a fixed `SELECT` over `information_schema.columns`. It rejects malformed identifiers, bounds the manifest to 200 tables and 200 columns per table, limits output, and exits `1` for missing expectations or `2` for invalid input/connection errors. It deliberately does not print the exact psql error to avoid leaking credentials. For safe use, provide a dedicated least-privilege read-only database login; do not put credentials on the command line or in a committed file. No Production connection was used to implement or test this script.

## Editing expectations

Edit `backend/scripts/schema-audit-manifest.json`. For each table, add the exact table name, the specific columns used as expectations, and route references that explain their application context. Edit `views` and `functions` for required view/routine names, and add optional `rowExpectations` only for a specifically authorized key lookup (unique `id`, a listed table/column, and explicit string `value`). The key value is embedded only in the SELECT and is never printed in the report; do not use PII or broad filters. Routine checks validate existence by name, not overload signatures, EXECUTE privileges, policy behavior, or grants; explicit signatures and policy/RLS validation require separate checks. Keep lists explicit and limited to schema needed by real routes; do not wildcard-discover or automatically include every repository migration. Check migration SQL and corresponding frontend route/query before adding an expectation. Use lowercase unquoted PostgreSQL identifiers. `knownAbsent` records known gaps for human context; it is not an auto-create instruction. The supplied expected migration ledger is included separately for reference and is not queried by this tool.

The manifest reflects the owner's supplied read-only Production inventory: 21 public tables are listed. That inventory also said there is no `public.profiles`, `member_bans`, `moderation_actions`, or public forum, business, marketplace, tourism, notifications, or comments table. Those gaps can make application routes fail, but they must not be hidden by weakening expectations or by inventing generic rows. In particular, `profiles` is intentionally not an expected existing table: login/profile errors cannot be fixed by a generic auto-create script. Profile repair requires an explicitly approved SQL change, review of auth ownership/data semantics, a backup/restore plan, and a separately authorized operation. A later approved run may add a profile row expectation using an explicitly supplied user key; no user/profile values are presumed by this manifest.

The manifest also expects the confirmed `published_articles` view and route/security-related routines only; this is not a claim that every route invokes every listed routine. The supplied live inventory confirmed only `audit_event(...)` among one earlier set of checked helpers and reported `has_capability`, `current_staff_is_active`, `staff_roles_authorized`, `handle_is_reserved`, `is_member_active`, and `bootstrap_verified_member_profile` absent. Add an absent helper to the manifest only when its current route or security contract requires it. The additional verified schema facts are that `published_articles` exists while `programmes.publication_status` and `episodes.publication_status` are missing. The approved candidate reconcile migration is unapplied; the audit merely reports missing columns and never runs it.

The supplied migration-ledger fact lists seven versions: `20261102133703_staff_access_foundation`, `20261102190001_capabilities_catalogue`, `20261102190002_editorial_core`, `20261102190003_editorial_media_and_radio`, `20261102190004_people_directory`, `20261102190005_audit_events`, and `20261102200006_editorial_transitions`. The checkout's migration directory may contain additional proposals/versions that were not reported as applied. A file existing in the repository is not evidence it was applied to any environment.

## If an expectation is missing

Do not run a migration from this audit or use it to create arbitrary tables, columns, or records. First compare the reported gap with the approved product behavior and current schema. Prepare a narrowly scoped, versioned migration in the repository with reviewable SQL, migration tests, rollback/forward-recovery considerations, and an explicit backup/restore plan for data-bearing changes. Have the relevant owner review and approve it and separately authorize its application through the normal deployment process. Do not use ad hoc dashboard SQL as a substitute for a versioned migration. Row provisioning (including staff/profile rows) is a separate, explicitly approved and audited process; it is never part of schema audit.

Run tests with `pnpm test` (or the focused test command used in this checkout). The schema audit's tests use a fake local `psql` executable and synthetic output only.
