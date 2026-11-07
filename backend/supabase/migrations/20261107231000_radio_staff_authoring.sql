-- Radio catalogue authoring is restricted to radio.manage and every catalogue
-- mutation is recorded through the existing immutable audit event writer.
alter table public.programmes add column if not exists publication_status text not null default 'draft';
alter table public.episodes add column if not exists publication_status text not null default 'draft';
alter table public.radio_schedule add column if not exists publication_status text not null default 'draft';
alter table public.programmes add constraint programmes_publication_status check (publication_status in ('draft','published','withdrawn'));
alter table public.episodes add constraint episodes_publication_status check (publication_status in ('draft','published','withdrawn'));
alter table public.radio_schedule add constraint radio_schedule_publication_status check (publication_status in ('draft','published','withdrawn'));

-- Rights evidence is in a table with no anonymous/authenticated blanket SELECT,
-- never an added column on a catalogue table exposed by the existing grants.
create table if not exists public.radio_rights_records (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('programme','episode','schedule')),
  resource_id uuid not null,
  note text not null check (char_length(btrim(note)) between 3 and 2000),
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now()
);
alter table public.radio_rights_records enable row level security;
revoke all on public.radio_rights_records from public, anon, authenticated;
grant select, insert on public.radio_rights_records to authenticated;
create policy radio_rights_staff on public.radio_rights_records for all to authenticated using (public.has_capability('radio.manage')) with check (public.has_capability('radio.manage'));

create or replace function public.audit_radio_catalogue_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_row jsonb; v_id uuid;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_id := (v_row ->> 'id')::uuid;
  perform public.audit_event('staff', 'radio.catalogue_' || lower(tg_op), tg_table_name, v_id, 'success', jsonb_build_object('publication_status', v_row -> 'publication_status'));
  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- Public readers only see published programmes and schedule rows. Episodes retain
-- published_at compatibility with existing clients, and publication status must agree.
drop policy if exists programmes_read on public.programmes;
create policy programmes_read on public.programmes for select to anon, authenticated
using (is_active and publication_status = 'published');
drop policy if exists programmes_read_staff on public.programmes;
create policy programmes_read_staff on public.programmes for select to authenticated using (public.has_capability('radio.manage'));
drop policy if exists episodes_read_public on public.episodes;
create policy episodes_read_public on public.episodes for select to anon, authenticated
using (published_at is not null and publication_status = 'published' and exists (select 1 from public.programmes p where p.id = episodes.programme_id and p.is_active and p.publication_status = 'published'));
drop policy if exists episodes_read_staff on public.episodes;
create policy episodes_read_staff on public.episodes for select to authenticated using (public.has_capability('radio.manage'));
drop policy if exists radio_schedule_read on public.radio_schedule;
create policy radio_schedule_read on public.radio_schedule for select to anon, authenticated
using (publication_status = 'published' and exists (select 1 from public.programmes p where p.id = radio_schedule.programme_id and p.is_active and p.publication_status = 'published'));

revoke insert, update, delete on public.programmes, public.episodes, public.radio_schedule from public, anon, authenticated;
grant insert, update, delete on public.programmes, public.episodes, public.radio_schedule to authenticated;
drop policy if exists programmes_manage on public.programmes;
create policy programmes_manage on public.programmes for all to authenticated using (public.has_capability('radio.manage')) with check (public.has_capability('radio.manage'));
drop policy if exists episodes_manage on public.episodes;
create policy episodes_manage on public.episodes for all to authenticated using (public.has_capability('radio.manage')) with check (public.has_capability('radio.manage'));
drop policy if exists radio_schedule_manage on public.radio_schedule;
create policy radio_schedule_manage on public.radio_schedule for all to authenticated using (public.has_capability('radio.manage')) with check (public.has_capability('radio.manage'));

drop trigger if exists programmes_audit_radio on public.programmes;
create trigger programmes_audit_radio after insert or update or delete on public.programmes for each row execute function public.audit_radio_catalogue_change();
drop trigger if exists episodes_audit_radio on public.episodes;
create trigger episodes_audit_radio after insert or update or delete on public.episodes for each row execute function public.audit_radio_catalogue_change();
drop trigger if exists radio_schedule_audit_radio on public.radio_schedule;
create trigger radio_schedule_audit_radio after insert or update or delete on public.radio_schedule for each row execute function public.audit_radio_catalogue_change();
drop trigger if exists radio_rights_audit_radio on public.radio_rights_records;
create trigger radio_rights_audit_radio after insert or update or delete on public.radio_rights_records for each row execute function public.audit_radio_catalogue_change();
