# 16 — Schema Runbook

How to apply, verify and roll back the database layer in `backend/supabase/migrations`.

**Audience:** whoever deploys. Read §1 before touching the production project.

---

## 0. What exists, in one paragraph

Thirteen migration files. One is already applied in production
(`20261102133703_staff_access_foundation.sql`). The other twelve are written and reviewed but
**not applied anywhere**. Together they create 49 tables, 5 views, 81 foreign keys, 168 check
constraints, 180 indexes, 34 triggers and 101 RLS policies. Every table has row level security
enabled and no table grants a write privilege to `anon` or `authenticated` without a policy that
justifies it.

Production contains no staff accounts, no capability grants and no seed data. That is correct and
deliberate — see §6.

---

## 1. Before you apply anything

1. **Confirm the applied migration list.** The expected single row is
   `20261102133703`. If the production list differs, stop — somebody applied something else and
   your assumptions are wrong.

   ```sh
   supabase migration list --linked
   ```

2. **Take a backup.** Even with zero data, take one. It costs a minute and it is the only rollback
   that actually works.

   ```sh
   supabase db dump --linked -f backups/pre-schema-$(date +%Y%m%d%H%M).sql
   ```

3. **Apply to a preview branch first.** Every one of these migrations has been exercised against
   PGlite only. PGlite is not Supabase. See §4 for the three things it cannot check.

4. **Expect the `citext` and `btree_gist` extensions.** Three migrations call
   `create extension if not exists`. They are available on Supabase and are **not** shimmed in the
   files. If an install fails here, the project is not on the plan you think it is.

---

## 2. Apply order

Filename order is the dependency order. Do not cherry-pick, do not reorder, do not apply a later
file to "fix" an earlier failure.

| # | File | Creates |
| --- | --- | --- |
| 1 | `20261102190001_capabilities_catalogue.sql` | capability catalogue, `has_capability`, `require_capability`, `current_staff_is_active` |
| 2 | `20261102190002_editorial_core.sql` | authors, categories, tags, articles, article versions, `published_articles`, `slugify`, `guard_article_version` |
| 3 | `20261102190003_editorial_media_and_radio.sql` | media assets, programmes, episodes, schedule, stream config, `radio_status` |
| 4 | `20261102190004_people_directory.sql` | people, sources, offices, verifications, corrections, `published_people` |
| 5 | `20261102190005_audit_events.sql` | audit trail, `audit_event()` |
| 6 | `20261102200006_staff_transitions.sql` | every article and people write path |
| 7 | `20261102200007_member_identity.sql` | profiles, bans, moderation actions, `is_member_active`, `is_member_banned` |
| 8 | `20261102200008_comments.sql` | comments, reports, threading guard, soft delete |
| 9 | `20261102200009_notifications.sql` | notifications, preferences, push subscriptions |
| 10 | `20261102200010_forum.sql` | forum categories, threads, posts, polls, votes, reports, ban functions |
| 11 | `20261102200011_business_directory.sql` | business categories, listings, photos, reviews, verifications, `published_businesses` |
| 12 | `20261102200012_marketplace_and_payments.sql` | products, orders, order items, status history, payments, webhook ledger, featured windows |

File 6 must come after 2 and 4 (it writes their tables) and before 7 (later files call its
helpers). File 12 must come last because `business_featured` has a foreign key to `payments`.

```sh
supabase db push          # applies every unapplied file in order
```

If you need to apply by hand, run them in the table order above, one transaction each, and stop on
the first error. Do not continue past a failure.

---

## 3. Post-apply verification

Run these immediately after `db push`. Each one returns a count or a list you can compare. A
non-empty "failures" result means the apply was partial — restore the backup, do not patch forward.

**Every table has RLS, and no table is missing a primary key:**

```sql
select c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
-- expect: 0 rows

select c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and not exists (select 1 from pg_constraint p where p.conrelid = c.oid and p.contype = 'p');
-- expect: 0 rows
```

**Counts match the reviewed schema:**

```sql
select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r')            as tables,   -- 49
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'v')            as views,    -- 5
  (select count(*) from pg_policies where schemaname = 'public') as policies; -- 101
```

**The money tables are not client-writable:**

```sql
select table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  and table_name in ('orders', 'order_items', 'order_status_history', 'payments',
                     'payment_events', 'delivery_requests');
-- expect: 0 rows
```

**The webhook ledger is unreadable by the application:**

```sql
select policyname from pg_policies
where schemaname = 'public' and tablename = 'payment_events';
-- expect: 0 rows
```

**The public read models work for an anonymous caller.** `security_invoker` means the view needs
column privileges too, so a wrong grant shows up here and nowhere else:

```sql
set role anon;
select count(*) from public.published_articles;   -- expect 0, and NO permission error
select count(*) from public.published_people;     -- expect 0, and NO permission error
select count(*) from public.published_businesses; -- expect 0, and NO permission error
select status from public.radio_status;           -- expect 0 rows before a stream is configured
reset role;
```

A `permission denied` on any of those four lines is a broken grant, not an empty table. Stop and
fix the grant before the web app is pointed at the database.

**Reference data landed:**

```sql
select count(*) from public.capabilities;         -- expect 12
select count(*) from public.categories;           -- expect 7 (news categories)
select count(*) from public.business_categories;  -- expect 9
select count(*) from public.forum_categories;     -- expect 0: no approved taxonomy yet
select count(*) from public.staff_profiles;       -- expect 0: no staff provisioned
select count(*) from public.staff_capability_grants; -- expect 0
```

The two zero counts in the staff tables are the expected state, not a failed apply. See §6.

---

## 4. What this schema has NOT been verified against

Be precise about this before you call the database done.

| Gap | Why | How to close it |
| --- | --- | --- |
| The two GiST exclusion constraints | `btree_gist` is unavailable in PGlite, so `radio_schedule_no_overlap` and `business_featured_no_overlap` were stripped when the schema was replayed | Apply to a preview branch and try to insert two overlapping windows. Both inserts must fail. |
| `citext` case-insensitive uniqueness | Replaced by a plain `text` domain in testing | On a preview branch, insert `Ade` and `ade` as two handles. The second must fail. |
| Behaviour under the real Supabase connection pooler | PGlite is a single embedded session; `set_config` and role switching behave differently under pgbouncer | Run the app against a preview branch with the pooler in transaction mode and exercise one write from each role. |
| Migration runtime on a large table | Every table here is created empty, so there is no lock risk today | Re-read this section the day a migration touches a populated table. See §5. |

Everything else in this runbook was run. `backend/tests/schema.test.mjs` replays all thirteen
migrations and asserts both the structural rules and nineteen behavioural rules; it prints its own
shim list so the gaps above stay visible instead of being forgotten.

---

## 5. Rollback

`supabase db push` has no automatic rollback, and migrations here are not written with `down`
blocks. Your rollback is the dump from §1.

**Individual file, forward-only.** If one file fails mid-apply, the whole transaction for that file
is rolled back by Postgres, but earlier files in the same push stay applied. Do not re-run the
whole push. Fix the failing file with a **new** migration that sorts after it, then push again.

**Never edit a file that has been applied to production.** `supabase migration list` shows the
applied set. Editing an applied file means the repo and the database disagree, and the next
developer's `db reset` produces a schema nobody reviewed.

**Dropping the whole layer**, only on a branch or a database with no data:

```sql
drop schema public cascade;
create schema public;
```

That destroys every table, view and function. It is not a production operation.

---

## 6. Staff accounts and the first capability grant

The migrations create no staff accounts, no capability grants and no seed data. This is a
requirement, not an oversight (`AGENTS.md` §2, `docs/08-permissions-security.md`).

Until a row exists in `staff_profiles` with `is_active = true` **and** a matching row in
`staff_capability_grants`, these are the only things a signed-in user can do:

- read their own profile
- read their own active grants
- publish nothing

Every editorial function calls `require_capability()` and raises `capability_required`.

Provisioning the first administrator is a manual, recorded act performed by someone with database
access, out of band from the application:

1. Create the user in Supabase Auth.
2. Insert `staff_profiles (user_id, is_active = true)`.
3. Insert one `staff_capability_grants` row per capability that person actually needs.
4. Record who did it and why, outside the application.
5. The `audit_events` row that proves the grant is written by the next staff action, not by this
   provisioning step.

There is deliberately no self-service path, no invite flow and no bootstrap function. If a
bootstrap function existed, it would be an unauthenticated privilege-escalation endpoint.

---

## 7. Environment variables

The migrations need none. The application around them needs the ones already listed in
`.env.example`; do not add secrets to a migration file, and never commit the service role key.

The service role key bypasses RLS. It belongs on the server only, never in a browser bundle and
never behind a `NEXT_PUBLIC_` prefix.

---

## 8. When something looks wrong

| Symptom | Likely cause | Check |
| --- | --- | --- |
| Every query returns zero rows for a normal user | RLS enabled, no matching policy | `select * from pg_policies where tablename = '...'` |
| `permission denied for table X` on a public page | Missing column grant on a `security_invoker` view | §3, the anon block |
| `permission denied for function` | Helper not granted to `anon`/`authenticated` | `\df+ public.has_capability` |
| `capability_required` from a staff screen | Missing grant row, or `staff_profiles.is_active` is false | join the two tables for that user |
| `revision_conflict` on save | Two editors, or a stale form | expected behaviour; reload and re-apply |
| A view shows a column it should not | Column grant is too wide | compare the grant against the view's select list |
