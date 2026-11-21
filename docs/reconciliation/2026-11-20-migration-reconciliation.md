# Migration reconciliation — 2026-11-20

Target: Supabase project `igqmybuiovaxqmrteebd` (production). Read-only recon only.
Local migration directory: `backend/supabase/migrations` (55 `.sql` files).

This document is evidence, not a deploy plan. No migration was created, deleted, or applied to
production as part of this recon. Two draft files that had been assembled during the work were
removed before classification because they replayed `20261102200012_marketplace_and_payments.sql`
verbatim and silently added `create extension btree_gist` to make its exclusion constraint parse.
That is an invented DDL change to a reviewed money schema — the wrong fix. The work was stopped,
the drafts reverted, and the decisions below were opened instead.

A later pentester addition is folded in below: the `must_change_password` gate and the
`staff_roles_authorized()` contradiction were both re-checked with live queries. Neither requires a
new column or function in production — both already exist. The deletion RPC is explicitly blocked.

## Method and limits

- Live inventory via `supabase db query --linked --project-ref igqmybuiovaxqmrteebd`.
  `--local` is unavailable: Docker is not installed (`DOCKER_UNAVAILABLE`).
- Live counts: 55 public tables, 4 views, 69 functions, 93 policies, 21 triggers, 140 indexes,
  40 ledger versions, 8 roles, 192 grants. Storage query returned `buckets: null` and
  `storage_policies: null` — treat storage state as UNVERIFIED, not as "no buckets".
- Each local file was scanned for created tables, views, functions, triggers, indexes, policies and
  added columns; each named object was checked against the live inventory. Raw output:
  `migration_scan.txt`, `migration_scan.json`, `inventory.json`, `details.json`.
- Policy checks were initially false negatives because the comparison key was `table.policy`
  while live rows are `public.table.policy`. Corrected check confirms the original policy names
  (`capabilities_read`, `profiles_read_public`, `notifications_own_select`,
  `businesses_read_published`) exist. Later migrations renamed many policies to `..._forward`,
  `..._repair`, `..._reconcile`, `..._read_published`.
- "APPLIED" below means the file's named objects are present live, whether from that exact file or
  from a later superseding file. It does **not** mean the file's version is in the ledger.

## Ledger finding (structural, important)

| Source | Versions |
| --- | --- |
| `supabase migration list --linked` | 40 |
| `public.supabase_migrations.schema_migrations` | 40 |
| Local filenames with a matching remote version | **7** |
| Local filenames with no matching remote version | **48** |
| Remote versions with no local file | **33** |

The 7 exact matches are the early prefixes: `20261102133703`, `20261102190001`–`20261102190005`,
`20261102200006`. From `20261102200007` onward the local filenames diverge from the remote
ledger entirely. Both ledger sources agree with each other, so there is no ledger drift; the
divergence is between the **repository filenames** and the **remote ledger**.

Consequence: `supabase db push` would treat 48 local files as pending and try to replay them,
including money and member-deletion DDL that is already partly superseded. Do not run it.

## RECONCILIATION TABLE

Legend: **APPLIED** = named objects exist live. **NOT APPLIED** = named objects absent live.
**UNKNOWN-BROKEN** = mixed; some objects exist, some are missing or renamed — semantic state cannot
be inferred from filenames alone.

| # | Migration file | Class | Named evidence (live) |
| --- | --- | --- | --- |
| 1 | `20261102133703_staff_access_foundation.sql` | APPLIED | ledger match; `staff_capability_grants`, `staff_profiles`; `staff_read_own_active_capability`, `staff_read_own_profile` |
| 2 | `20261102190001_capabilities_catalogue.sql` | APPLIED | ledger match; `capabilities`; `current_staff_is_active`, `has_capability`, `require_capability`; `capabilities_read` |
| 3 | `20261102190002_editorial_core.sql` | UNKNOWN-BROKEN | ledger match; `articles`, `article_versions`, `published_articles` OK; `slugify`, `article_slug`, `guard_article_version` MISSING; policies renamed `..._read_published` |
| 4 | `20261102190003_editorial_media_and_radio.sql` | UNKNOWN-BROKEN | ledger match; 6 tables OK; `radio_status` view MISSING; `guard_stream_status_append_only` MISSING |
| 5 | `20261102190004_people_directory.sql` | UNKNOWN-BROKEN | ledger match; people tables + `published_people` OK; `enforce_person_publishable`, `guard_person_source_removal` MISSING (superseded by `enforce_people_publish_source`) |
| 6 | `20261102190005_audit_events.sql` | APPLIED | ledger match; `audit_events`, `audit_event`; policy now named `audit_read` |
| 7 | `20261102200006_staff_transitions.sql` | UNKNOWN-BROKEN | ledger match; article RPCs OK; `people_create/update/verify/unverify/set_status` MISSING |
| 8 | `20261102200007_member_identity.sql` | APPLIED | `member_bans`, `moderation_actions`, `profiles`; `handle_is_reserved`, `is_member_active`, `is_member_banned` |
| 9 | `20261102200008_comments.sql` | APPLIED | `comments`, `comment_reports`; 3 RPCs OK; triggers/policies renamed `..._forward` by file 33 |
| 10 | `20261102200009_notifications.sql` | APPLIED | `notifications`, `notification_preferences`, `push_subscriptions`; `notifications_own_select` present |
| 11 | `20261102200010_forum.sql` | UNKNOWN-BROKEN | `forum_categories/posts/reports/threads` OK; `forum_polls`, `forum_poll_options`, `forum_poll_votes`, `forum_poll_results` MISSING; `forum_create_thread`, `forum_vote`, `forum_thread_moderate`, `member_ban`, `member_unban`, `sync_thread_activity` MISSING |
| 12 | `20261102200011_business_directory.sql` | APPLIED | 5 business tables + `published_businesses`; all 6 RPCs OK; policies present |
| 13 | `20261102200012_marketplace_and_payments.sql` | NOT APPLIED | `products`, `orders`, `order_items`, `payments`, `payment_events`, `delivery_requests`, `order_status_history`, `business_featured` all MISSING; `owns_order`, `sells_order`, `guard_order_history_append_only` MISSING |
| 14 | `20261107194000_article_draft_update.sql` | APPLIED | `article_draft_update` |
| 15 | `20261107195000_direct_article_publish_verified_staff.sql` | UNKNOWN-BROKEN | `article_draft_update`, `article_publish`, `has_capability` OK; `guard_article_version` MISSING |
| 16 | `20261107202500_community_history.sql` | NOT APPLIED | `history_records`, `history_record_sources`, `history_contributions` MISSING |
| 17 | `20261107203000_history_review_workflow.sql` | NOT APPLIED | `history_contribution_decide` MISSING |
| 18 | `20261107210000_forum_report_resolution.sql` | APPLIED | `forum_report_resolve` |
| 19 | `20261107213000_news_comment_workflow.sql` | APPLIED | `comment_report_resolve`; `comments_read_tombstones` policy present |
| 20 | `20261107213000_people_achievements.sql` | APPLIED | `published_people`; `people.achievements` column |
| 21 | `20261107214000_itan_ilu_mi_categorization_lineage.sql` | NOT APPLIED | `history_records.community`, `history_contributions.community` MISSING; `history_contribution_decide` MISSING |
| 22 | `20261107215000_forum_single_vote.sql` | NOT APPLIED | `forum_vote`; `forum_poll_votes_one_vote_per_member` index |
| 23 | `20261107220500_marketplace_requests_moderation.sql` | NOT APPLIED | `business_review_moderation_history`, `active_business_sponsorships`, `business_review_moderate`, `marketplace_order_request`, `order_advance` MISSING |
| 24 | `20261107222000_people_staff_console.sql` | NOT APPLIED | `people_correction_resolve`, `people_office_add`, `people_source_add`, `people_source_set_visibility`, `people_update_achievements` MISSING |
| 25 | `20261107224000_people_create_achievements.sql` | NOT APPLIED | `people_create_with_achievements` MISSING |
| 26 | `20261107230000_tourism_sites.sql` | NOT APPLIED | `tourism_destinations`, `tourism_submissions`, `tourism_submission_decide` MISSING |
| 27 | `20261107231000_radio_staff_authoring.sql` | APPLIED | `radio_rights_records`, `audit_radio_catalogue_change`; `publication_status` columns; policies renamed by file 30 |
| 28 | `20261107232000_radio_atomic_authoring.sql` | APPLIED | `radio_authoring_save`; `revision` columns on episodes/programmes/radio_schedule |
| 29 | `20261107234000_history_review_redacted_publish.sql` | NOT APPLIED | `history_contribution_decide` MISSING |
| 30 | `20261114141000_radio_publication_state_reconcile.sql` | APPLIED | `radio_rights_records`, `audit_radio_catalogue_change`, `current_staff_is_active`, `has_capability`, `require_capability`; `..._read` policies |
| 31 | `20261114190000_configurable_staff_roles.sql` | APPLIED | `staff_roles`, `staff_role_assignments`, `staff_role_capabilities`; 7 RPCs OK |
| 32 | `20261114190000_member_handle_and_verified_bootstrap.sql` | APPLIED | `bootstrap_verified_member_profile`, `member_handle_availability` |
| 33 | `20261114223500_news_comments_forward_only.sql` | APPLIED | `comments_guard_shape_forward`, `comments_set_updated_at_forward`; 4 RPCs OK; `..._forward` policies present |
| 34 | `20261114235700_newsroom_authoring_live_schema.sql` | APPLIED | `article_create`, `article_draft_update`, `article_publish`, `article_revise`, `article_submit`, `article_unpublish` |
| 35 | `20261115004000_newsroom_staff_read_rls.sql` | APPLIED | `article_versions_read_newsroom_guard/staff`, `articles_read_newsroom_guard/staff` present |
| 36 | `20261115010000_forum_moderation_schema_repair.sql` | APPLIED | forum tables + `forum_post_moderate`, `forum_report_resolve`; policies renamed `..._repair` |
| 37 | `20261115010200_forum_rpc_explicit_anon_acl.sql` | APPLIED | no DDL names; ACL-only change — verified through `information_schema.role_routine_grants` (anon/authenticated forum RPC ACLs revoked) |
| 38 | `20261115010500_radio_live_schema_authoring_reconcile.sql` | APPLIED | `radio_authoring_save`, `radio_touch_updated_at`; `created_at` columns; `..._radio_touch_updated_at` triggers |
| 39 | `20261115011000_newsroom_reference_settings.sql` | APPLIED | `newsroom_byline_save`, `newsroom_category_save` |
| 40 | `20261115093000_news_cover_urls.sql` | APPLIED | `published_articles`; 5 cover RPCs; 6 cover columns |
| 41 | `20261116120000_article_engagement.sql` | APPLIED | `article_views`, `published_article_engagement`, `estimate_article_read_minutes`, `record_article_view` |
| 42 | `20261116140000_member_saved_articles.sql` | APPLIED | `saved_articles` + 3 owner policies |
| 43 | `20261118030000_newsletter_subscriptions.sql` | APPLIED | `newsletter_subscribers`, 2 RPCs; signup ACL later restricted by file 44 |
| 44 | `20261118053000_pause_unsafe_newsletter_signup.sql` | APPLIED | ACL-only; `newsletter_subscribe_request` is `postgres=X/postgres;service_role=X/postgres` only — anon/authenticated revoked |
| 45 | `20261118060000_restore_article_set_breaking.sql` | APPLIED | `article_set_breaking` with `authenticated` EXECUTE |
| 46 | `20261119010000_newsletter_verified_requests.sql` | APPLIED | `newsletter_pending_confirmations`, `newsletter_request_cooldowns`, 2 RPCs |
| 47 | `20261119011000_private_enquiries.sql` | APPLIED | `private_enquiries`, `private_enquiry_submit` |
| 48 | `20261119012000_form_rate_limits.sql` | APPLIED | `form_rate_buckets`, `form_rate_limit` |
| 49 | `20261119013000_form_retention.sql` | APPLIED | `purge_expired_form_data` |
| 50 | `20261119014000_private_enquiry_staff.sql` | APPLIED | `staff_enquiry_authorized/list/resolve`; `private_enquiries.revision/status` |
| 51 | `20261119015000_staff_directory_email_type.sql` | APPLIED | `staff_role_staff_directory` |
| 52 | `20261119020000_member_admin_messages.sql` | UNKNOWN-BROKEN | `admin_member_list` OK; `admin_member_message`, `admin_member_delete` MISSING |
| 53 | `20261119100000_member_directory_safe.sql` | APPLIED | `admin_member_list` (read-only redefinition supersedes file 52's list) |
| 54 | `20261119110000_published_news_search.sql` | APPLIED | `search_published_news` |
| 55 | `20261121120000_maintenance_mode.sql` | APPLIED | `site_maintenance`, `maintenance_status`, `maintenance_set`, `maintenance_admin_status` |

Totals: APPLIED 34 · NOT APPLIED 12 · UNKNOWN-BROKEN 9.

## VERIFIED CLAIMS

| Claim (source) | Verdict | Exact evidence |
| --- | --- | --- |
| Business directory tables and `published_businesses` are missing (docs/schema-audit.md:21) | **FALSE** | Live `businesses`, `business_categories`, `business_photos`, `business_reviews`, `business_verifications`, `published_businesses` (view, `security_invoker=true`). The audit's 21-table inventory is an older owner-supplied snapshot, not current state. |
| `article_set_breaking` is unavailable | **FALSE** | Present; ACL includes `authenticated=X/postgres`. |
| Newsletter signup is unrestricted | **FALSE** | `newsletter_subscribe_request` ACL is `postgres=X/postgres;service_role=X/postgres`; anon/authenticated revoked. |
| `form_rate_limit`, private enquiries and staff enquiry RPCs exist | **TRUE** | `form_rate_buckets`, `form_rate_limit`, `private_enquiries`, `staff_enquiry_authorized/list/resolve`. |
| Maintenance mode exists | **TRUE** | `site_maintenance`, `maintenance_status`, `maintenance_set`, `maintenance_admin_status`. |
| Member messaging/deletion migration is fully applied | **FALSE (partial only)** | `admin_member_list` present; `admin_member_message` and `admin_member_delete` absent. |
| `btree_gist` is installed | **FALSE** | Live extensions: `citext`, `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`. The reviewed marketplace schema's `business_featured_no_overlap` exclusion constraint cannot parse without it. |
| All 40 recorded migrations applied successfully to PGlite locally (docs/16-schema-runbook.md:11) | **TRUE but bounded** | Local PGlite rehearsal evidence only. It explicitly does not establish hosted or production readiness, and it omitted two exclusion constraints because `btree_gist` was absent. |
| "reconcile the duplicate version prefixes" (docs/16-schema-runbook.md:84) | **CONFIRMED** | Two duplicate prefixes: `20261107213000` (news_comment_workflow + people_achievements) and `20261114190000` (configurable_staff_roles + member_handle_bootstrap). The local ledger cannot be replayed deterministically by version alone. |
| `must_change_password` column is missing from production (pentester report) | **FALSE — present live, but UNREPRODUCIBLE from source** | Live query: `must_change_password_cols: 1`; `staff_profile_columns: [user_id, is_active, created_at, must_change_password]`. Repo-wide grep found 7 references and **zero** column definitions (`staff_access_foundation.sql:4-8` creates only three columns). Production has a schema change the local history cannot reproduce. |
| `staff_roles_authorized()` does not exist (private_enquiry_staff.sql:2) | **FALSE — exists live** | Live `pg_proc` query: `staff_roles_authorized_count: 1`, zero-arg signature. Also present live: `has_capability(p_capability text)`, `require_capability(capability text)`, `current_staff_is_active()`. `configurable_staff_roles.sql` is correct; the claim in `private_enquiry_staff.sql:2` is stale. |

Seven privileged RPCs gate on `must_change_password`: `member_directory_safe.sql:6`;
`member_admin_messages.sql:10,22,40` (list / message / **delete**); `private_enquiry_staff.sql:8`;
`maintenance_mode.sql:25,37`. Because the column exists live, these gates are fail-closed today —
an actor who has not changed the default password cannot pass. But the gate cannot be rebuilt from
the repository, so a fresh environment built from local migrations would lack the column entirely
and those RPCs would fail to compile, not silently bypass. Fail-closed in both cases; unverifiable
from source is the actual defect.

## MISSING OBJECTS

Grouped by the eight current web areas. All are absent from the live inventory as of 2026-11-20.

**Epe Business Directory & Marketplace**
- Tables: `products`, `orders`, `order_items`, `order_status_history`, `payments`, `payment_events`, `delivery_requests`, `business_featured`, `business_review_moderation_history`
- View: `active_business_sponsorships`
- RPCs: `business_review_decide`, `business_review_moderate`, `marketplace_order_request`, `order_advance`
- Note: the candidate file `backend/supabase/reconciliation/business_discovery_candidate.sql` declares
  `business_review_decide` and `business_discovery_search`, but starts with a guard that aborts if
  `public.businesses` exists. Since `businesses` **does** exist, that file is a historical candidate for
  an empty database and **cannot be applied as written**. `business_discovery_search` is absent live.

**Itan Ilu Mi / My Community History**
- Tables: `history_records`, `history_record_sources`, `history_contributions`
- Columns: `history_records.community/category/family_name/lineage_description/rights_description`,
  `history_contributions.community/category/family_name/lineage_description/rights_description`
- RPC: `history_contribution_decide`

**Chat Forum / Digital Village Square**
- Tables: `forum_polls`, `forum_poll_options`, `forum_poll_votes`
- View: `forum_poll_results`
- RPCs: `forum_create_thread`, `forum_vote`, `forum_thread_moderate`, `member_ban`, `member_unban`, `sync_thread_activity`

**Historical Sites & Tourism**
- Tables: `tourism_destinations`, `tourism_submissions`
- RPC: `tourism_submission_decide`

**Who is Who in Epe**
- RPCs: `people_create`, `people_update`, `people_set_status`, `people_verify`, `people_unverify`,
  `people_correction_resolve`, `people_office_add`, `people_source_add`,
  `people_source_set_visibility`, `people_update_achievements`, `people_create_with_achievements`

**Editorial helper functions (used by newsroom flows)**
- `slugify`, `article_slug`, `guard_article_version`, `radio_status` (view),
  `guard_stream_status_append_only`, `enforce_person_publishable`, `guard_person_source_removal`

**Admin member management**
- RPCs: `admin_member_message`, `admin_member_delete`

Frontend code that calls these and will fail or return errors until a decision is made:
`frontend/apps/main/app/business-directory/page.tsx`,
`frontend/apps/main/app/forum/actions.ts`,
`frontend/apps/main/app/itan-ilu-mi/actions.ts`,
`frontend/apps/admin/lib/history-actions.ts`,
`frontend/apps/admin/lib/tourism-actions.ts`,
`frontend/apps/admin/app/(protected)/members/actions.ts`.

**Source-reproducibility gap (seed/object inventory addition)**
- `public.staff_profiles.must_change_password boolean NOT NULL DEFAULT true` — **present live, absent
  from every local migration file**. It is a production prerequisite with no source definition.
  A forward-only `alter table public.staff_profiles add column if not exists must_change_password
  boolean not null default true;` would be a **no-op in production** but would restore
  reproducibility for a fresh environment. It is proposed, not applied.
- `public.staff_roles_authorized()` — **present live**, no source gap; no action needed.
- `public.admin_member_delete(uuid,text)` — **DO NOT APPLY**. Pentester finding at
  `member_admin_messages.sql:37-45`: line 42 writes an audit event with status `'success'`
  **before** the `delete from auth.users` on line 43. If the delete fails (FK conflict, trigger,
  concurrency), the audit log permanently records a successful deletion that never happened.
  The RPC also deletes the `auth.users` row and leaves associated R2 storage objects behind — no
  object cleanup or retention rule is defined. Recommend: exclude this RPC entirely, or redesign
  as soft delete with the audit event written **after** the mutation and an explicit R2 cleanup
  policy. Not applied and not recommended for apply.

## ACTIONS TAKEN

- Read-only recon of the live production database using `supabase db query --linked`; no `INSERT`,
  `UPDATE`, `DELETE`, DDL, `supabase db push`, or `db reset` was run.
- Captured the full live inventory and all 55 local migration files into
  `/data/data/com.foxdebug.acode/cache/opencode/epelawa-recon/`.
- Corrected the policy-comparison key error and re-verified policy existence.
- Ran two additional read-only live queries on `igqmybuiovaxqmrteebd` to resolve the pentester's
  prerequisite questions: `must_change_password` column count = 1 and `staff_roles_authorized`
  pg_proc count = 1. Both exist in production. No DDL was run.
- **Reverted** two draft forward-only migration files (`20261121130000_*`, `20261121130100_*`)
  created during the work; they are not in the worktree. Reason: they replayed reviewed money DDL
  and injected `btree_gist`, which is an invented design change.
- Created branch `fix/migration-reconciliation` and added this document. No production apply.

Not touched: four pre-existing unstaged deletions of `.jpg` files (`1b9dc37…`, `2b43bfff…`,
`3760b592…`, `8b11ab77…`). These predate this work and were left exactly as found.

## DECISIONS NEEDED FROM MUS'AB

1. **Branch name conflict.** The task asks for `fix/migration-reconciliation`; the project
   `AGENTS.md` §5 says implementation work goes on `feat/full-web-implementation`. Which branch
   should carry the actual migrations? This document currently sits on `fix/migration-reconciliation`.
2. **Marketplace/payments scope.** The money schema is absent and the frontend references order
   RPCs, but `AGENTS.md` §2 says production is read-only and payment flows stay unavailable until a
   provider is configured and isolated tests pass. Confirm: create schema only (no provider), or
   leave all money objects unapplied and change the frontend to a clearly-disabled state?
3. **`btree_gist` decision.** `business_featured_no_overlap` needs this extension. Installing an
   extension is a real schema change. Approve install, or drop the exclusion constraint in a new
   reviewed migration? Do not silently replay the historical file.
4. **Member deletion RPC — DO NOT APPLY as written.** `admin_member_delete` permanently deletes a
   member, writes a `'success'` audit row *before* the delete (`member_admin_messages.sql:42` vs
   `:43`), and leaves R2 storage objects behind. Confirm: drop the RPC, or redesign as soft delete
   with a post-mutation audit event and an explicit R2 retention/cleanup policy. This is a security
   defect, not a mechanical reconciliation — no apply until you say so.
5. **`must_change_password` source gap.** The column exists live but has no definition in any local
   migration. Approve adding the idempotent `add column if not exists ... default true` to a new
   forward-only migration so a fresh environment can compile the seven gated RPCs? It is a no-op on
   production. No clearance RPC was added — confirm whether the app needs one.
6. **Which missing areas are in this release?** History, tourism, forum polls, people RPCs and
   member messaging are all absent. The source SQL exists in the repo but was never applied. Should
   reconciliation restore all of them now, or only the subset behind currently-live routes?
7. **Ledger repair strategy.** 48 local versions are not in the remote ledger and 33 remote versions
   have no local file. Options: (a) author brand-new forward-only migrations with new timestamps and
   leave history alone — recommended; (b) re-baseline the remote ledger, which rewrites history and
   needs a separate backup/restore plan. Do not replay by filename.
8. **Production apply authorisation.** Recon was read-only. Any apply needs explicit sign-off plus a
   verified backup/restore path. Docker is unavailable, so there is no local PGlite rehearsal for
   new files in this environment. Confirm who runs the apply and how rollback is verified.
9. **Storage state.** `storage.buckets` returned null. Confirm whether that means no buckets or a
   permission limit on the query role before relying on it.

## Security flags

- **AUTH:** `must_change_password` exists in production, so the seven gated RPCs fail closed today.
  The defect is reproducibility: no local migration defines the column, so a fresh environment
  built from source would fail to compile those RPCs. `staff_roles_authorized()` is confirmed live,
  so `private_enquiry_staff.sql:2` is stale — do not treat it as evidence of a missing prerequisite.
  Restoring `admin_member_message` / `admin_member_delete` or the people staff console grants staff
  the ability to message or permanently delete members. All are `security definer`; authorisation
  must be re-verified server-side before any apply.
- **PAYMENTS:** The worst case is replaying `20261102200012_marketplace_and_payments.sql` into a
  partly-different live schema and then wiring order RPCs to it, producing unpaid orders or a
  double-charge path. The live DB has no payment/order tables, so no money can move today. Keep it
  that way until a provider and webhook signature verification exist.
- **DATA DELETION:** `admin_member_delete` would delete the `auth.users` row and cascade through
  foreign keys, leaving R2 objects orphaned. Worse, it records a `'success'` audit event at line 42
  *before* the delete at line 43, so a failed deletion is permanently logged as successful. No
  deletion was performed. "Deleted" is not defined — no soft-delete column was found on `profiles`.
  Do not enable this RPC until soft-delete semantics, post-mutation auditing, R2 retention and
  backup behaviour are all specified.

## PR STATUS

Branch `fix/migration-reconciliation` created from `main` at `49bf9d8`. Contains only this
document, **uncommitted and unpushed**, per Mus'ab's instruction ("don't commit yet"). No PR has
been opened; no merge to `main`; no production apply. The four pre-existing `.jpg` deletions remain
unstaged and were not included.

## 2026-11-21 UPDATE — RECONCILIATION APPLIED TO PRODUCTION (OWNER AUTHORISED)

The owner authorised applying the outstanding migrations against production
("fix errors in the migrations ledger and migrations ... make sure everything is applied against
the live database nothing left out"). All work ran through the authenticated Supabase MCP
connection to project `igqmybuiovaxqmrteebd`. Nothing was replayed by `supabase db push`; every
application was an atomic, forward-only migration.

### Applied (in order)

| Ledger name | Content |
| --- | --- |
| `20261121160000_editorial_slug_and_version_guards_reconciliation` | `slugify`, `article_slug`, `guard_article_version` + `article_versions_guard` trigger (file 3/15 gap) |
| `20261121160100_people_lifecycle_rpcs_reconciliation` | `people_create`, `people_update`, `people_set_status`, `people_verify`, `people_unverify` + ACLs (file 7 gap) |
| `20261107222000_people_staff_console` | `people_update_achievements`, `people_source_add`, `people_source_set_visibility`, `people_office_add`, `people_correction_resolve` + ACLs (file 24) |
| `20261107224000_people_create_achievements` | `people_create_with_achievements` + `grant select (revision)` (file 25) |
| `20261107202500_community_history` | `history_records`, `history_record_sources`, `history_contributions`, RLS + policies, `history.review` capability (file 16) |
| `20261107203000_history_review_workflow` | 2-arg `history_contribution_decide` (file 17) |
| `20261107214000_itan_ilu_mi_categorization_lineage` | history categorization/lineage columns, constraints, 5-arg decide (file 21) |
| `20261107234000_history_review_redacted_publish` | final 7-arg `history_contribution_decide(uuid,text,text,text,text,text,text)`; 2-arg/5-arg overloads dropped (file 29) |
| `20261107230000_tourism_sites` | `tourism_destinations`, `tourism_submissions`, `tourism_submission_decide`, RLS + policies (file 26 — fixes the tourism "Destinations could not be loaded" state) |
| `20261121160900_forum_polls_moderation_reconciliation` | `forum_polls`, `forum_poll_options`, `forum_poll_votes`, `forum_poll_results` view, `sync_thread_activity` + 4 forum triggers, `forum_create_thread`, `forum_vote`, single-vote index, `forum_thread_moderate`, `member_ban`, `member_unban` + poll RLS (file 11/22 gap) |
| `20261121161000_member_admin_messages_reconciliation` | `notifications_kind` constraint updated; `admin_member_message`, `admin_member_delete` (file 52 gap; `admin_member_list` left as the live safe redefinition from file 53) |
| `20261121161100_radio_status_projection_reconciliation` | `guard_stream_status_append_only` + trigger, `media_assets_set_updated_at` / `stream_config_set_updated_at` triggers, `radio_status` view (file 4 gap) |
| `20261121161200_member_delete_audit_after_delete` | security-flag fix: `admin_member_delete` now writes the audit event **after** a successful `auth.users` delete instead of before it |
| `20261121161300_staff_must_change_password_source_gap` | reproducibility no-op on production: idempotent `add column if not exists must_change_password ... default true` restores fresh-environment compilability of the seven gated RPCs |

### Verified after application (live queries, single-statement each)

- All five `tourism_*`/`history_*` gap tables plus the two views (`radio_status`,
  `forum_poll_results`) resolve via `to_regclass`.
- All 25 people/history/forum/tourism/member RPC signatures resolve via `to_regprocedure`.
- Trigger inventory: `article_versions_guard`, `forum_posts_sync_thread`,
  `forum_threads/forum_posts/forum_categories_set_updated_at`, `media_assets_set_updated_at`,
  `stream_config_set_updated_at`, `stream_status_checks_append_only` all present.
- `notifications_kind` constraint present on `public.notifications`.
- `radio_status` returns an empty set (no singleton row yet) — honest not-configured behaviour.
- Ledger: `supabase_migrations.schema_migrations` = **59 versions**, latest recorded
  `20261121074510`. The ledger's `version` column is assigned by the apply tool; the local file
  timestamps are preserved in the recorded **names**, so the ledger and repository now agree by
  name for every file applied here. `supabase db push` remains forbidden — several older remote
  versions still have no matching local file.

### Divergences handled explicitly

1. **`stream_config` was built from a shortened reconstruction.** The live table lacked
   `stream_format`, `embedding_permitted`, `embedding_permitted_at`, `embedding_permitted_by` and
   `created_at`. The radio reconciliation migration restores those columns (guarded, forward-only)
   plus the `stream_config_format` and `stream_config_permission_recorded` checks before creating
   the `radio_status` view.
2. **`guard_article_version` transition adaptation.** Production's terminal published state is
   `'approved'` (live `article_publish` moves draft/review → `'approved'` in direct-publish mode),
   so `'approved'` is an allowed target from `'draft'` in addition to the source migration's
   `'published'`. Without this, every direct publish of a draft would raise
   `invalid_version_transition`. `article_draft_update` (draft/review → draft),
   `article_submit` (draft → review), `article_review` (review → approved/rejected) and
   `article_revise` (inserts a new draft row) were all checked against the guard — no other
   collision exists.

### DECISIONS CLOSED

- Decision 3 (`btree_gist`): already installed by ledger `20261121034723` (owner-applied
  2026-11-21 alongside the marketplace reconciliation `20261121034742`, which had been classified
  NOT APPLIED above as file 13; rows #13 and #23 are therefore now APPLIED too).
- Decision 4 (member deletion RPC): restored with the audit-after-delete fix; the R2 orphan-cleanup
  policy remains an open, documented follow-up.
- Decision 6 (missing areas): all restored (history, tourism, forum polls, people RPCs, member
  messaging, radio projection).
- Decision 8 (apply authorisation): given by the owner on 2026-11-21; executed through the
  authenticated MCP connection, atomic per migration, verified per §"Verified after application".
