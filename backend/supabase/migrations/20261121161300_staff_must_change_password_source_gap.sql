-- Source-reproducibility gap fix recorded in
-- docs/reconciliation/2026-11-20-migration-reconciliation.md: production has
-- staff_profiles.must_change_password (seven privileged RPCs gate on it) but no local
-- migration defines it, so a fresh environment cannot compile those RPCs. This idempotent,
-- forward-only restore is a deliberate no-op on production (column verified present on
-- 2026-11-21) and restores reproducibility for fresh environments.

alter table public.staff_profiles
  add column if not exists must_change_password boolean not null default true;
