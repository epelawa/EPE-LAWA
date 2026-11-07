-- Staff console mutations: capability checked, audited, and callable only by authenticated staff.
create or replace function public.people_update_achievements(p_person_id uuid, p_expected_revision bigint, p_achievements text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_revision bigint;
begin
  perform public.require_capability('people.manage');
  select revision into v_revision from public.people where id = p_person_id for update;
  if not found then raise exception using errcode='P0002', message='person_not_found'; end if;
  if v_revision <> p_expected_revision then raise exception using errcode='40001', message='revision_conflict'; end if;
  update public.people set achievements = nullif(btrim(p_achievements), ''), revision = revision + 1 where id = p_person_id;
  perform public.audit_event('staff','people.update_achievements','person',p_person_id,'success',jsonb_build_object('revision',v_revision+1));
end; $$;

create or replace function public.people_source_add(p_person_id uuid,p_kind text,p_citation text,p_url text,p_visibility text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid := gen_random_uuid();
begin
  perform public.require_capability('people.manage');
  if not exists(select 1 from public.people where id=p_person_id and deleted_at is null) then raise exception using errcode='P0002',message='person_not_found'; end if;
  insert into public.people_sources(id,person_id,kind,citation,url,visibility,recorded_by) values(v_id,p_person_id,p_kind,btrim(p_citation),nullif(btrim(p_url),''),p_visibility,auth.uid());
  perform public.audit_event('staff','people.source_add','person',p_person_id,'success',jsonb_build_object('source_id',v_id,'visibility',p_visibility));
  return v_id;
end; $$;

create or replace function public.people_source_set_visibility(p_source_id uuid,p_visibility text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_person uuid;
begin
  perform public.require_capability('people.manage');
  update public.people_sources set visibility=p_visibility where id=p_source_id returning person_id into v_person;
  if not found then raise exception using errcode='P0002',message='source_not_found'; end if;
  perform public.audit_event('staff','people.source_visibility','person',v_person,'success',jsonb_build_object('source_id',p_source_id,'visibility',p_visibility));
end; $$;

create or replace function public.people_office_add(p_person_id uuid,p_title text,p_institution text,p_term_start date,p_term_end date,p_is_current boolean,p_source_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid := gen_random_uuid();
begin
  perform public.require_capability('people.manage');
  if not exists(select 1 from public.people where id=p_person_id and deleted_at is null) then raise exception using errcode='P0002',message='person_not_found'; end if;
  if p_source_id is not null and not exists(select 1 from public.people_sources where id=p_source_id and person_id=p_person_id) then raise exception using errcode='23503',message='source_not_for_person'; end if;
  insert into public.people_offices(id,person_id,title,institution,term_start,term_end,is_current,source_id) values(v_id,p_person_id,btrim(p_title),btrim(p_institution),p_term_start,p_term_end,coalesce(p_is_current,false),p_source_id);
  perform public.audit_event('staff','people.office_add','person',p_person_id,'success',jsonb_build_object('office_id',v_id,'source_id',p_source_id));
  return v_id;
end; $$;

create or replace function public.people_correction_resolve(p_correction_id uuid,p_state text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_person uuid;
begin
  perform public.require_capability('people.manage');
  if p_state not in ('accepted','rejected') then raise exception using errcode='22023',message='invalid_state'; end if;
  update public.people_corrections set state=p_state,resolved_by=auth.uid(),resolved_at=now() where id=p_correction_id and state='open' returning person_id into v_person;
  if not found then raise exception using errcode='P0002',message='open_correction_not_found'; end if;
  perform public.audit_event('staff','people.correction_resolve','person',v_person,'success',jsonb_build_object('correction_id',p_correction_id,'state',p_state));
end; $$;

revoke all on function public.people_update_achievements(uuid,bigint,text) from public;
revoke all on function public.people_source_add(uuid,text,text,text,text) from public;
revoke all on function public.people_source_set_visibility(uuid,text) from public;
revoke all on function public.people_office_add(uuid,text,text,date,date,boolean,uuid) from public;
revoke all on function public.people_correction_resolve(uuid,text) from public;
grant execute on function public.people_update_achievements(uuid,bigint,text) to authenticated;
grant execute on function public.people_source_add(uuid,text,text,text,text) to authenticated;
grant execute on function public.people_source_set_visibility(uuid,text) to authenticated;
grant execute on function public.people_office_add(uuid,text,text,date,date,boolean,uuid) to authenticated;
grant execute on function public.people_correction_resolve(uuid,text) to authenticated;
