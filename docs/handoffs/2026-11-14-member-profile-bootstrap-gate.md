# Member profile schema and bootstrap — approval gate

Status (2026-11-14 19:20 CET): **prepared locally; separate owner approval is required before applying either migration to any live environment.** No Production database was accessed or changed. No account was recreated, invited, or backfilled. No SQL was applied. The bootstrap repair is additional and is not part of the previously approved four-file set.

## Exact migration payload

Apply only after explicit approval, in filename order:

1. `backend/supabase/migrations/20261102200007_member_identity.sql`
2. `backend/supabase/migrations/20261114170000_verified_member_profile_bootstrap.sql`

The identity migration depends on the earlier staff foundation (`staff_capability_grants`), shared `public.has_capability` and `public.set_updated_at()` helpers, the Supabase `auth.users` table, and the `auth.uid()` function. The current ordered baseline provides those objects before M7; the following comments migration expects M7's `profiles`, `member_bans` and `moderation_actions` objects. The bootstrap RPC further depends on M7's `profiles`, reserved-handle helper/uniqueness, and Supabase auth fields `email_confirmed_at` and `raw_user_meta_data`. Do not apply the repair before M7. PGlite tests apply the complete current migration set in filename order.

## Effects and data-loss assessment

`20261102200007_member_identity.sql` additively creates `public.profiles` (public identity fields only; no email, phone, or address), the immutable reserved-handle predicate and profile reserved-handle constraint, member-active/member-banned helpers, `public.member_bans` and its indexes, `public.moderation_actions` and its indexes, the profiles `updated_at` trigger, and RLS, policies, grants, and function privileges. Its `CREATE TABLE/INDEX IF NOT EXISTS` statements and `CREATE OR REPLACE FUNCTION` statements are additive/idempotent for their intended baseline. It explicitly drops/re-adds the named `profiles_handle_not_reserved` constraint and drops/recreates the named profile trigger and policies; these are definitions, not data-clearing operations. It contains **no `DROP TABLE`, `TRUNCATE`, column removal, profile deletion, data reset, or backfill**. On a pre-existing incompatible or partially populated schema, constraint installation can fail on invalid rows; review that environment before applying. The migration itself does not create a profile for any auth user or alter account/staff identity.

`20261114170000_verified_member_profile_bootstrap.sql` creates/replaces one `SECURITY DEFINER` function with an empty pinned search path. It derives the actor only from `auth.uid()`, reads only that actor's confirmed auth row and signup metadata, validates handle syntax, display-name length, and reserved names, then inserts only the caller's profile. It returns false for anonymous/unverified/invalid/reserved/taken identities, is idempotent for an existing active caller profile, and grants execute only to `authenticated` while revoking `public` and `anon`. It creates no tables/columns/triggers/policies, and performs no bulk writes or backfill. Neither payload resets a schema or deletes account/profile data. Execution of the RPC confers no staff capability.

## Gate and verification

The auth completion route verifies `auth.getUser()` and `email_confirmed_at` before calling the RPC. It reports a distinct required-migration message when the profile table or bootstrap function is unavailable; it does not fall back to a direct insert or grant access on RPC failure. Local PGlite schema/behavior tests pass (24 passed, 1 skipped) and cover ordered migrations, profile schema/RLS, bootstrap idempotence, unverified/reserved/actual duplicate-handle rejection, and anonymous execute denial. PGlite skips the two documented GiST exclusion constraints and does not prove Supabase behavior. `pnpm typecheck` did not reach compilation: pnpm 11/Node 24 differ from the declared toolchain, and install preflight stopped on ignored `esbuild@0.28.2` build scripts. Do not approve build scripts for this check; rerun on declared Node 22 with approved dependencies.

Before release: obtain explicit owner approval for the exact migration files (the new bootstrap repair remains separately unapproved); pass backup and restore verification; inspect target schema/data compatibility; run migration and auth-route smoke tests against a Supabase preview branch or local Supabase; run typecheck/build and full CI with approved dependencies; obtain separate application deployment approval. Do not apply migrations or deploy until all gates pass.
