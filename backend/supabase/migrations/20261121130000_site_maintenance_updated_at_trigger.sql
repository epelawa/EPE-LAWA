-- Forward-only reconciliation: site_maintenance carries an updated_at column
-- (20261121120000_maintenance_mode.sql, APPLIED in production) but no trigger
-- maintains it, violating the structural invariant enforced by
-- backend/tests/schema.test.mjs ("every table with updated_at maintains it
-- through the trigger"). Historical migrations are not edited; this attaches
-- the standard trigger idempotently. maintenance_set() already writes
-- updated_at explicitly, so the trigger is a harmless safety net.
drop trigger if exists site_maintenance_set_updated_at on public.site_maintenance;
create trigger site_maintenance_set_updated_at
  before update on public.site_maintenance
  for each row execute function public.set_updated_at();
