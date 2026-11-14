-- Add only the forced-password state column here.
-- User-management RPCs are installed together in the following hardened migration,
-- so a partial apply cannot expose an earlier, less restrictive function set.
alter table public.staff_profiles
  add column if not exists must_change_password boolean not null default false;
