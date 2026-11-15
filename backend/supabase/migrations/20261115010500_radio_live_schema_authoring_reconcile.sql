-- Forward-only reconciliation for the live Radio catalogue and the admin read/write contract.
-- Preserve existing catalogue rows and publication state; no content is synthesized.
-- Each column addition backfills metadata defaults without rewriting catalogue content.
alter table public.programmes
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists revision bigint not null default 1;
alter table public.episodes
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists revision bigint not null default 1;
alter table public.radio_schedule
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists revision bigint not null default 1;

create index if not exists programmes_updated_at_idx on public.programmes(updated_at desc);
create index if not exists episodes_updated_at_idx on public.episodes(updated_at desc);
create index if not exists radio_schedule_updated_at_idx on public.radio_schedule(updated_at desc);

create or replace function public.radio_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.radio_touch_updated_at() from public, anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.programmes'::regclass and tgname = 'programmes_radio_touch_updated_at' and not tgisinternal) then
    create trigger programmes_radio_touch_updated_at before update on public.programmes
      for each row execute function public.radio_touch_updated_at();
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.episodes'::regclass and tgname = 'episodes_radio_touch_updated_at' and not tgisinternal) then
    create trigger episodes_radio_touch_updated_at before update on public.episodes
      for each row execute function public.radio_touch_updated_at();
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.radio_schedule'::regclass and tgname = 'radio_schedule_radio_touch_updated_at' and not tgisinternal) then
    create trigger radio_schedule_radio_touch_updated_at before update on public.radio_schedule
      for each row execute function public.radio_touch_updated_at();
  end if;
end $$;

-- Do not expose private rights evidence through catalogue table grants. Staff reads are
-- still bounded by the existing radio.manage RLS policies and normal authenticated SELECT.
create or replace function public.radio_authoring_save(
  p_resource_type text,
  p_id uuid,
  p_expected_revision bigint,
  p_data jsonb,
  p_rights_note text
)
returns table(resource_id uuid, new_revision bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
  v_revision bigint;
  v_status text := p_data ->> 'publication_status';
begin
  perform public.require_capability('radio.manage');
  if v_actor is null or p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception using errcode = '42501', message = 'radio_authoring_denied';
  end if;
  if v_status is null or v_status not in ('draft', 'published', 'withdrawn') then
    raise exception using errcode = '22023', message = 'invalid_publication_status';
  end if;
  if v_status = 'published' and char_length(btrim(coalesce(p_rights_note, ''))) not between 3 and 2000 then
    raise exception using errcode = '22023', message = 'published_radio_requires_rights_note';
  end if;
  if p_rights_note is not null and char_length(btrim(p_rights_note)) not between 3 and 2000 then
    raise exception using errcode = '22023', message = 'invalid_rights_note';
  end if;

  if p_resource_type = 'programme' then
    if p_id is null then
      insert into public.programmes(slug,name,description,publication_status,is_active)
      values ((p_data->>'slug')::public.citext, btrim(p_data->>'name'), nullif(p_data->>'description',''), v_status, v_status <> 'withdrawn')
      returning id, revision into v_id, v_revision;
    else
      update public.programmes set slug=(p_data->>'slug')::public.citext, name=btrim(p_data->>'name'),
        description=nullif(p_data->>'description',''), publication_status=v_status,
        is_active=v_status <> 'withdrawn', revision=revision+1
      where id=p_id and revision=p_expected_revision returning id, revision into v_id, v_revision;
    end if;
  elsif p_resource_type = 'episode' then
    if p_id is null then
      insert into public.episodes(programme_id,slug,title,description,aired_on,external_url,published_at,publication_status)
      values ((p_data->>'programme_id')::uuid, (p_data->>'slug')::public.citext, btrim(p_data->>'title'),
        nullif(p_data->>'description',''), nullif(p_data->>'aired_on','')::date,
        nullif(p_data->>'external_url',''), case when v_status='published' then now() else null end, v_status)
      returning id, revision into v_id, v_revision;
    else
      update public.episodes set programme_id=(p_data->>'programme_id')::uuid,
        slug=(p_data->>'slug')::public.citext, title=btrim(p_data->>'title'), description=nullif(p_data->>'description',''),
        aired_on=nullif(p_data->>'aired_on','')::date, external_url=nullif(p_data->>'external_url',''),
        published_at=case when v_status='published' then coalesce(published_at,now()) else null end,
        publication_status=v_status, revision=revision+1
      where id=p_id and revision=p_expected_revision returning id, revision into v_id, v_revision;
    end if;
  elsif p_resource_type = 'schedule' then
    if p_id is null then
      insert into public.radio_schedule(programme_id,day_of_week,starts_at,ends_at,note,publication_status)
      values ((p_data->>'programme_id')::uuid, (p_data->>'day_of_week')::smallint,
        (p_data->>'starts_at')::time, (p_data->>'ends_at')::time, nullif(p_data->>'note',''), v_status)
      returning id, revision into v_id, v_revision;
    else
      update public.radio_schedule set programme_id=(p_data->>'programme_id')::uuid,
        day_of_week=(p_data->>'day_of_week')::smallint, starts_at=(p_data->>'starts_at')::time,
        ends_at=(p_data->>'ends_at')::time, note=nullif(p_data->>'note',''), publication_status=v_status,
        revision=revision+1 where id=p_id and revision=p_expected_revision
      returning id, revision into v_id, v_revision;
    end if;
  else
    raise exception using errcode = '22023', message = 'invalid_radio_resource_type';
  end if;

  if v_id is null then
    raise exception using errcode = '40001', message = 'radio_revision_conflict',
      hint = 'Reload the Radio record before saving again.';
  end if;
  if nullif(btrim(coalesce(p_rights_note,'')), '') is not null then
    insert into public.radio_rights_records(resource_type,resource_id,note,recorded_by)
    values (p_resource_type,v_id,btrim(p_rights_note),v_actor);
  end if;
  perform public.audit_event('staff','radio.authoring_save',p_resource_type,v_id,'success',
    jsonb_build_object('publication_status',v_status,'revision',v_revision,
      'rights_note_recorded',nullif(btrim(coalesce(p_rights_note,'')),'') is not null));
  return query select v_id,v_revision;
end;
$$;
revoke all on function public.radio_authoring_save(text,uuid,bigint,jsonb,text) from public, anon;
grant execute on function public.radio_authoring_save(text,uuid,bigint,jsonb,text) to authenticated;
