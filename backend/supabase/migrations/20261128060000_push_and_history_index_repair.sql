-- Repairs found by backend/tests/schema.test.mjs after the turn-4 migrations.
-- Additive only:
--   * updated_at is maintained by the shared trigger on the two new push tables;
--   * the two foreign keys on history_correction_requests get covering indexes.
drop trigger if exists web_push_devices_set_updated_at on public.web_push_devices;
create trigger web_push_devices_set_updated_at
  before update on public.web_push_devices
  for each row execute function public.set_updated_at();

drop trigger if exists push_schedule_settings_set_updated_at on public.push_schedule_settings;
create trigger push_schedule_settings_set_updated_at
  before update on public.push_schedule_settings
  for each row execute function public.set_updated_at();

create index if not exists history_correction_requests_resolved_by_idx
  on public.history_correction_requests (resolved_by) where resolved_by is not null;
create index if not exists history_correction_requests_submitter_id_idx
  on public.history_correction_requests (submitter_id) where submitter_id is not null;
