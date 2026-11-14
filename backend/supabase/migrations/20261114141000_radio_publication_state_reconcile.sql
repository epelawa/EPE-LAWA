-- Forward-only Production reconciliation for radio publication state.
-- The live schema already contains the radio tables and 12-key capability catalogue,
-- but the capability predicate is missing and the current episode read policy is
-- named `episodes_read`. This migration preserves rows and replaces only radio ACLs.

create or replace function public.current_staff_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles p
    join auth.users u on u.id = p.user_id
    where p.user_id = auth.uid()
      and p.is_active
      and u.email_confirmed_at is not null
  );
$$;

create or replace function public.has_capability(p_capability text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_capability_grants g
    join public.staff_profiles p on p.user_id = g.user_id
    join auth.users u on u.id = g.user_id
    where g.user_id = auth.uid()
      and g.capability = p_capability
      and g.revoked_at is null
      and p.is_active
      and u.email_confirmed_at is not null
  );
$$;

-- PostgreSQL will not let CREATE OR REPLACE rename an existing input argument.
-- Production calls this argument `capability`; the clean local migration calls it
-- `p_capability`. Preserve whichever name is already installed while hardening the
-- function, avoiding DROP/CASCADE or a migration failure on either schema.
do $migration$
declare
  v_argument_name text;
begin
  select p.proargnames[1]
    into v_argument_name
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'require_capability'
    and p.pronargs = 1
  limit 1;

  if v_argument_name = 'capability' then
    execute $ddl$
      create or replace function public.require_capability(capability text)
      returns void language plpgsql stable security definer set search_path = ''
      as $body$
      begin
        if auth.uid() is null then
          raise exception using errcode = '42501', message = 'not_authenticated';
        end if;
        if not public.has_capability(capability) then
          raise exception using errcode = '42501', message = 'capability_required',
            detail = format('Missing capability: %s', capability),
            hint = 'Ask an administrator to grant this capability.';
        end if;
      end;
      $body$;
    $ddl$;
  else
    execute $ddl$
      create or replace function public.require_capability(p_capability text)
      returns void language plpgsql stable security definer set search_path = ''
      as $body$
      begin
        if auth.uid() is null then
          raise exception using errcode = '42501', message = 'not_authenticated';
        end if;
        if not public.has_capability(p_capability) then
          raise exception using errcode = '42501', message = 'capability_required',
            detail = format('Missing capability: %s', p_capability),
            hint = 'Ask an administrator to grant this capability.';
        end if;
      end;
      $body$;
    $ddl$;
  end if;
end;
$migration$;

revoke all on function public.current_staff_is_active() from public;
revoke all on function public.has_capability(text) from public;
revoke all on function public.require_capability(text) from public;
grant execute on function public.current_staff_is_active() to anon, authenticated;
grant execute on function public.has_capability(text) to anon, authenticated;
grant execute on function public.require_capability(text) to authenticated;

alter table public.programmes
  add column if not exists publication_status text not null default 'draft';
alter table public.episodes
  add column if not exists publication_status text not null default 'draft';
alter table public.radio_schedule
  add column if not exists publication_status text not null default 'draft';

alter table public.programmes enable row level security;
alter table public.episodes enable row level security;
alter table public.radio_schedule enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.programmes'::regclass
      and conname = 'programmes_publication_status'
  ) then
    alter table public.programmes
      add constraint programmes_publication_status
      check (publication_status in ('draft', 'published', 'withdrawn'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.episodes'::regclass
      and conname = 'episodes_publication_status'
  ) then
    alter table public.episodes
      add constraint episodes_publication_status
      check (publication_status in ('draft', 'published', 'withdrawn'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.radio_schedule'::regclass
      and conname = 'radio_schedule_publication_status'
  ) then
    alter table public.radio_schedule
      add constraint radio_schedule_publication_status
      check (publication_status in ('draft', 'published', 'withdrawn'));
  end if;
end;
$$;

create table if not exists public.radio_rights_records (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('programme', 'episode', 'schedule')),
  resource_id uuid not null,
  note text not null check (char_length(btrim(note)) between 3 and 2000),
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now()
);
create index if not exists radio_rights_records_recorded_by_idx
  on public.radio_rights_records (recorded_by);
alter table public.radio_rights_records enable row level security;
revoke all on table public.radio_rights_records from public, anon, authenticated;
grant select, insert on table public.radio_rights_records to authenticated;
drop policy if exists radio_rights_staff on public.radio_rights_records;
create policy radio_rights_staff on public.radio_rights_records
  for all to authenticated
  using (public.has_capability('radio.manage'))
  with check (public.has_capability('radio.manage'));

create or replace function public.audit_radio_catalogue_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_id uuid;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_id := (v_row ->> 'id')::uuid;
  perform public.audit_event(
    'staff',
    'radio.catalogue_' || lower(tg_op),
    tg_table_name,
    v_id,
    'success',
    jsonb_build_object('publication_status', v_row -> 'publication_status')
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function public.audit_radio_catalogue_change() from public;

-- The live Production episode policy is named `episodes_read`, while the clean
-- local migration used `episodes_read_public`. Drop both before creating one strict
-- published-only policy; permissive policies are ORed by PostgreSQL.
drop policy if exists programmes_read on public.programmes;
create policy programmes_read on public.programmes
  for select to anon, authenticated
  using (is_active and publication_status = 'published');
drop policy if exists programmes_read_staff on public.programmes;
create policy programmes_read_staff on public.programmes
  for select to authenticated
  using (public.has_capability('radio.manage'));

drop policy if exists episodes_read on public.episodes;
drop policy if exists episodes_read_public on public.episodes;
create policy episodes_read on public.episodes
  for select to anon, authenticated
  using (
    published_at is not null
    and publication_status = 'published'
    and exists (
      select 1 from public.programmes p
      where p.id = episodes.programme_id
        and p.is_active
        and p.publication_status = 'published'
    )
  );
drop policy if exists episodes_read_staff on public.episodes;
create policy episodes_read_staff on public.episodes
  for select to authenticated
  using (public.has_capability('radio.manage'));

drop policy if exists radio_schedule_read on public.radio_schedule;
create policy radio_schedule_read on public.radio_schedule
  for select to anon, authenticated
  using (
    publication_status = 'published'
    and exists (
      select 1 from public.programmes p
      where p.id = radio_schedule.programme_id
        and p.is_active
        and p.publication_status = 'published'
    )
  );

revoke insert, update, delete on public.programmes, public.episodes, public.radio_schedule
  from public, anon, authenticated;
grant insert, update, delete on public.programmes, public.episodes, public.radio_schedule
  to authenticated;

drop policy if exists programmes_manage on public.programmes;
create policy programmes_manage on public.programmes
  for all to authenticated
  using (public.has_capability('radio.manage'))
  with check (public.has_capability('radio.manage'));
drop policy if exists episodes_manage on public.episodes;
create policy episodes_manage on public.episodes
  for all to authenticated
  using (public.has_capability('radio.manage'))
  with check (public.has_capability('radio.manage'));
drop policy if exists radio_schedule_manage on public.radio_schedule;
create policy radio_schedule_manage on public.radio_schedule
  for all to authenticated
  using (public.has_capability('radio.manage'))
  with check (public.has_capability('radio.manage'));

drop trigger if exists programmes_audit_radio on public.programmes;
create trigger programmes_audit_radio
  after insert or update or delete on public.programmes
  for each row execute function public.audit_radio_catalogue_change();
drop trigger if exists episodes_audit_radio on public.episodes;
create trigger episodes_audit_radio
  after insert or update or delete on public.episodes
  for each row execute function public.audit_radio_catalogue_change();
drop trigger if exists radio_schedule_audit_radio on public.radio_schedule;
create trigger radio_schedule_audit_radio
  after insert or update or delete on public.radio_schedule
  for each row execute function public.audit_radio_catalogue_change();
drop trigger if exists radio_rights_audit_radio on public.radio_rights_records;
create trigger radio_rights_audit_radio
  after insert or update or delete on public.radio_rights_records
  for each row execute function public.audit_radio_catalogue_change();
