-- Forward-only, idempotent reconciliation: production staff_profiles has
-- must_change_password (verified read-only from project igqmybuiovaxqmrteebd).
-- Source gap: 20261102133703_staff_access_foundation.sql omitted this column and
-- 20261119014000_private_enquiry_staff.sql references it in a LANGUAGE SQL function
-- body, which fails parse/validation during fresh-chain apply before this file runs.
-- Historical migrations are not edited per AGENTS.md §6; this restores the column
-- definition for environments that can apply forward migrations.
alter table public.staff_profiles
  add column if not exists must_change_password boolean not null default false;
