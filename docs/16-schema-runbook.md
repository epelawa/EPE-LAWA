# 16 — Schema Runbook

Operational guidance for the database migrations in `backend/supabase/migrations`.

> **Evidence boundary:** This document records repository and synthetic local-test evidence only. It does not establish the state or safety of any Supabase project, and it is not authorization to apply migrations to a hosted database or Production. Reconcile the target project's ledger, schema, data, extensions, and recovery plan before any database operation.

## 0. Current inventory and evidence

The repository at base `d8de649de710fd6accec5bffe3f1f65fdae3b67f` contains **40 SQL migration files**. The full lexicographic inventory is in §2. The old count of 13 files and the old count of 19 behavioural rules are stale.

The latest recorded local synthetic rehearsal on `main` at `433082acaafc72fc300f5be385c100af7afc1df7` applied all 40 files, in lexicographic filename order, to PGlite with synthetic fixtures. `node --test backend/tests/schema.test.mjs` reported 29 test cases: **28 passed, 0 failed, and 1 intentional skip**. This is bounded local evidence only; it does not establish migration safety or readiness for a hosted or Production apply. See [the implementation checklist's rehearsal limits](18-project-status-implementation-checklist.md#database-rehearsal-evidence-and-limits).

No evidence is recorded here for a live migration ledger or live data, Supabase RLS/role behavior, Supabase Auth/JWT or PostgREST behavior, service-role bypass, connection-pooler behavior, a backup/restore rehearsal, or production-scale locking/runtime. Do not infer any of these from the local replay or its test result.

The inventory also has repeated migration version prefixes: `20261107213000` and `20261114190000` each occur on two files. Resolve and review version/ledger handling before any hosted migration operation. This docs-only change does not alter migration SQL or reconcile those identifiers.

## 1. Before any apply

1. **Identify the exact target and inspect its ledger.** Confirm the project reference and environment before using a linked-project command. Inspect the target's migration ledger and compare it with the complete repository inventory and the actual schema. This runbook has no verified live-ledger baseline and specifies no expected row count. If the target or its current state cannot be established, stop.

   ```sh
   supabase migration list --linked
   ```

2. **Resolve the repeated version prefixes.** Confirm the migration tool's handling and the target ledger for the two duplicate prefixes listed in §0. Do not use the local filename replay as proof that a hosted tool will accept or safely record them.

3. **Establish recovery, not just a dump.** Take a target-specific backup and verify a restore on an isolated environment before relying on it. A dump alone is not proof of recoverability; no backup/restore rehearsal is evidenced here.

   ```sh
   supabase db dump --linked -f backups/pre-schema-$(date +%Y%m%d%H%M).sql
   ```

4. **Use an isolated hosted preview before any Production change.** PGlite is not Supabase. The local test substitutes `citext`, does not install `btree_gist` or exercise its exclusion constraints, and omits `article_versions_guard`. Verify extension availability and the unshimmed migration behavior on the exact target platform.

5. **Review the exact proposed apply and recovery steps.** The local replay does not validate the linked project's schema, data, RLS/authentication integration, pooler, or rollback path. Do not run `supabase db push` on the strength of this runbook or the PGlite result alone.

## 2. Repository migration inventory and order

The recorded rehearsal used lexicographic filename order. The list below is the full 40-file inventory in that order; it is not, by itself, proof that a hosted apply is safe or that a remote ledger matches the repository.

```text
20261102133703_staff_access_foundation.sql
20261102190001_capabilities_catalogue.sql
20261102190002_editorial_core.sql
20261102190003_editorial_media_and_radio.sql
20261102190004_people_directory.sql
20261102190005_audit_events.sql
20261102200006_staff_transitions.sql
20261102200007_member_identity.sql
20261102200008_comments.sql
20261102200009_notifications.sql
20261102200010_forum.sql
20261102200011_business_directory.sql
20261102200012_marketplace_and_payments.sql
20261107194000_article_draft_update.sql
20261107195000_direct_article_publish_verified_staff.sql
20261107202500_community_history.sql
20261107203000_history_review_workflow.sql
20261107210000_forum_report_resolution.sql
20261107213000_news_comment_workflow.sql
20261107213000_people_achievements.sql
20261107214000_itan_ilu_mi_categorization_lineage.sql
20261107215000_forum_single_vote.sql
20261107220500_marketplace_requests_moderation.sql
20261107222000_people_staff_console.sql
20261107224000_people_create_achievements.sql
20261107230000_tourism_sites.sql
20261107231000_radio_staff_authoring.sql
20261107232000_radio_atomic_authoring.sql
20261107234000_history_review_redacted_publish.sql
20261114141000_radio_publication_state_reconcile.sql
20261114190000_configurable_staff_roles.sql
20261114190000_member_handle_and_verified_bootstrap.sql
20261114223500_news_comments_forward_only.sql
20261114235700_newsroom_authoring_live_schema.sql
20261115004000_newsroom_staff_read_rls.sql
20261115010000_forum_moderation_schema_repair.sql
20261115010200_forum_rpc_explicit_anon_acl.sql
20261115010500_radio_live_schema_authoring_reconcile.sql
20261115011000_newsroom_reference_settings.sql
20261115093000_news_cover_urls.sql
```

Confirm ordering and dependency behavior on the chosen database platform, and reconcile the duplicate version prefixes, before any hosted apply. Do not cherry-pick, reorder, or continue past an error without a reviewed plan for the exact target and ledger.

## 3. Verification queries for an approved isolated target

These are operator checks to run and record after a separately approved isolated apply. They are **not** results from a live project. No current hosted schema counts or live data counts are established by this document. Record fresh output for the exact target and compare it with a reviewed baseline; do not reuse the old 49-table, 5-view, or 101-policy numbers as current targets.

**Find public tables without RLS or a primary key:**

```sql
select c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
-- expected after review: 0 rows

select c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and not exists (
    select 1 from pg_constraint p where p.conrelid = c.oid and p.contype = 'p'
  );
-- expected after review: 0 rows
```

**Capture, but do not assume, current object counts:**

```sql
select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r') as tables,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'v') as views,
  (select count(*) from pg_policies where schemaname = 'public') as policies;
```

**Check that client roles cannot write to the listed money tables:**

```sql
select table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  and table_name in ('orders', 'order_items', 'order_status_history', 'payments',
                     'payment_events', 'delivery_requests');
-- expected after review: 0 rows
```

**Inspect webhook-ledger policies:**

```sql
select policyname from pg_policies
where schemaname = 'public' and tablename = 'payment_events';
-- review against the approved access design; this is not a live-state assertion
```

**Exercise public read models under the anonymous role:**

```sql
set role anon;
select count(*) from public.published_articles;
select count(*) from public.published_people;
select count(*) from public.published_businesses;
select status from public.radio_status;
reset role;
```

The queries should execute with the intended grants; row counts depend on the exact target's data and are not assumed to be zero. A permission error requires investigation; it is not evidence that a table is empty.

**Inspect reference and staff rows:**

```sql
select count(*) from public.capabilities;
select count(*) from public.categories;
select count(*) from public.business_categories;
select count(*) from public.forum_categories;
select count(*) from public.staff_profiles;
select count(*) from public.staff_capability_grants;
```

Record the results for the exact target and compare them with the reviewed migration definitions and the intended environment state. This runbook does not assert live counts, seed state, or whether staff accounts exist.

## 4. What the synthetic replay does not verify

The recorded test uses PGlite and synthetic fixtures, not a hosted Supabase project or Production data. Its exact known limitations are:

| Area | What the replay did | What remains unverified |
| --- | --- | --- |
| GiST exclusion constraints | `btree_gist` was not installed; `radio_schedule_no_overlap` and `business_featured_no_overlap` were omitted from the replay. | Neither exclusion constraint's behavior was exercised. |
| `citext` | Replaced by a plain `text` domain. | Real `citext` installation and case-insensitive uniqueness were not verified. |
| `article_versions_guard` | The trigger was omitted by the fixture shim. | The replay does not establish whether this trigger exists in any live catalog or verify its live behavior. |
| Migration ledger and data | Only the repository migration files and synthetic local fixtures were used. | No live migration ledger or live data were inspected or validated. |
| Security and APIs | The fixture models some roles and auth helpers locally. | No live Supabase RLS/role matrix, Auth/JWT integration, PostgREST behavior, or service-role bypass was proved. |
| Operations and recovery | No hosted project, pooler, production-sized dataset, or restore was exercised. | No connection-pooler behavior, backup/restore path, production-scale lock behavior, or migration runtime was proved. |

`backend/tests/schema.test.mjs` contains 29 Node test cases in the inspected source. The recorded result of 28 passed, 0 failed, and 1 intentional skip applies only to the bounded local rehearsal described in §0. It does not mean that every schema behavior or live integration was verified.

## 5. Rollback and failed applies

There are no automatic `down` migrations in this set. A backup is useful only if its restore has been tested on an isolated environment; this runbook records no such restore proof.

If an apply fails, preserve the exact command output and inspect the target's actual ledger and schema before taking further action. Do not assume all files rolled back, rerun the entire push, edit an applied migration, or patch forward without a reviewed plan for that target. Resolve the state in an isolated environment first.

Dropping the `public` schema destroys its objects and data. Use such a reset only on a disposable local fixture or explicitly isolated database after confirming it contains no needed data. It is not a Production rollback procedure.

## 6. Staff accounts and capability grants

The synthetic replay's test users and grants are fixtures, not evidence about accounts, grants, or Auth users in any hosted project. Do not infer live staff state from this runbook.

Provision staff only through an approved, audited process after confirming the target, identity, and minimum required capabilities. Verify the resulting records and access behavior on the intended environment; do not use a self-service or unauthenticated bootstrap path. Record who authorized and performed provisioning outside the application as required by the operating procedure.

## 7. Environment variables

The migration files do not require application environment variables. The application uses the names listed in `.env.example`; never place secret values in a migration or commit the service-role key.

A service-role key bypasses RLS. Keep it server-side only; never expose it in a browser bundle or behind a `NEXT_PUBLIC_` prefix. This statement is security guidance, not evidence that any live service-role or RLS behavior was tested in the rehearsal.

## 8. When something looks wrong

| Symptom | Possible cause | Check |
| --- | --- | --- |
| A query returns unexpected rows or no rows | Data state differs from the assumed environment state | Inspect the exact target and its authorized data baseline; do not infer that state from PGlite. |
| `permission denied for table X` on a public page | A table or `security_invoker` view may lack required privileges | Inspect target grants and policies; §3 contains isolated-target checks. |
| `permission denied for function` | A helper may not be granted to the caller role | Inspect the target function grants, for example `\df+ public.has_capability`. |
| `capability_required` from a staff screen | The caller may lack an active staff record or required capability | Verify the target's staff profile, grant, and session claims. |
| `revision_conflict` on save | The expected revision may be stale | Reload and re-apply the intended edit after verifying the current record. |
| A view exposes an unexpected column | A grant or view definition may be too broad | Compare target grants with the reviewed view definition and approved access design. |
