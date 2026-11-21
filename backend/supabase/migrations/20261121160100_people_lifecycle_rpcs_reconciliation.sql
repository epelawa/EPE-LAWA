-- Reconciliation: Who-is-Who staff authoring RPCs.
--
-- The live production schema kept the article RPCs from 20261102200006_staff_transitions.sql
-- but never received its people RPC section. These functions are required by the staff people
-- console. Bodies copied verbatim; only the people_* ACL lines are included, never the
-- article_* ones, so later reconciliation ACLs stay authoritative.

------------------------------------------------------------------------------
-- Who is Who: content and status
------------------------------------------------------------------------------

create or replace function public.people_create(
  p_full_name        text,
  p_preferred_name   text,
  p_community        text,
  p_community_note   text,
  p_biography        text,
  p_is_deceased      boolean,
  p_portrait_key     text,
  p_portrait_alt     text,
  p_portrait_credit  text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id    uuid := gen_random_uuid();
  v_base  text;
  v_slug  text;
  v_n     integer := 1;
begin
  perform public.require_capability('people.manage');

  v_base := coalesce(public.slugify(p_full_name), 'person');
  v_slug := v_base;

  loop
    exit when not exists (select 1 from public.people p where p.slug = v_slug);
    v_n := v_n + 1;
    if v_n > 50 then
      v_slug := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
      exit;
    end if;
    v_slug := v_base || '-' || v_n::text;
  end loop;

  insert into public.people (
    id, slug, full_name, preferred_name, community, community_note, biography, is_deceased,
    portrait_key, portrait_alt, portrait_credit, status
  ) values (
    v_id, v_slug, btrim(p_full_name), p_preferred_name, p_community, p_community_note,
    p_biography, coalesce(p_is_deceased, false),
    p_portrait_key, p_portrait_alt, p_portrait_credit, 'draft'
  );

  perform public.audit_event('staff', 'people.create', 'person', v_id, 'success',
    jsonb_build_object('full_name', btrim(p_full_name), 'slug', v_slug));

  return v_id;
end;
$$;

create or replace function public.people_update(
  p_person_id        uuid,
  p_expected_revision bigint,
  p_full_name        text,
  p_preferred_name   text,
  p_community        text,
  p_community_note   text,
  p_biography        text,
  p_is_deceased      boolean,
  p_portrait_key     text,
  p_portrait_alt     text,
  p_portrait_credit  text,
  p_contributor_name text,
  p_contributor_consent boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision bigint;
begin
  perform public.require_capability('people.manage');

  select p.revision into v_revision
  from public.people p
  where p.id = p_person_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'person_not_found';
  end if;

  if v_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'revision_conflict',
      detail = format('Expected revision %s but person is at %s.', p_expected_revision, v_revision);
  end if;

  update public.people
  set full_name = btrim(p_full_name),
      preferred_name = p_preferred_name,
      community = p_community,
      community_note = p_community_note,
      biography = p_biography,
      is_deceased = coalesce(p_is_deceased, false),
      portrait_key = p_portrait_key,
      portrait_alt = p_portrait_alt,
      portrait_credit = p_portrait_credit,
      contributor_name = p_contributor_name,
      contributor_consent_recorded_at =
        case when p_contributor_consent then now() else null end,
      revision = revision + 1
  where id = p_person_id;

  perform public.audit_event('staff', 'people.update', 'person', p_person_id, 'success',
    jsonb_build_object('revision', v_revision + 1));
end;
$$;

create or replace function public.people_set_status(
  p_person_id         uuid,
  p_status            text,
  p_expected_revision bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision bigint;
  v_status   text;
begin
  perform public.require_capability('people.manage');

  if p_status not in ('draft', 'review', 'published', 'withdrawn') then
    raise exception using errcode = '22023', message = 'invalid_status';
  end if;

  select p.revision, p.status into v_revision, v_status
  from public.people p
  where p.id = p_person_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'person_not_found';
  end if;

  if v_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'revision_conflict',
      detail = format('Expected revision %s but person is at %s.', p_expected_revision, v_revision);
  end if;

  -- The publish gate itself lives in the table trigger; this only records the move.
  update public.people
  set status = p_status,
      revision = revision + 1
  where id = p_person_id;

  perform public.audit_event('staff', 'people.set_status', 'person', p_person_id, 'success',
    jsonb_build_object('from', v_status, 'to', p_status));
end;
$$;

create or replace function public.people_verify(
  p_person_id uuid,
  p_source_id uuid,
  p_note      text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id    uuid := gen_random_uuid();
begin
  perform public.require_capability('people.manage');

  if not exists (select 1 from public.people p where p.id = p_person_id) then
    raise exception using errcode = 'P0002', message = 'person_not_found';
  end if;

  -- The cited source must belong to this person. Otherwise the badge cites evidence about
  -- somebody else, which is worse than no badge.
  if not exists (
    select 1 from public.people_sources s
    where s.id = p_source_id and s.person_id = p_person_id
  ) then
    raise exception using errcode = '23503', message = 'source_not_for_person',
      detail = 'The verification source must belong to the person being verified.';
  end if;

  update public.people_verifications
  set superseded_at = now()
  where person_id = p_person_id and superseded_at is null;

  insert into public.people_verifications (id, person_id, verified_by, source_id, note)
  values (v_id, p_person_id, v_actor, p_source_id, btrim(p_note));

  perform public.audit_event('staff', 'people.verify', 'person', p_person_id, 'success',
    jsonb_build_object('verification_id', v_id, 'source_id', p_source_id));

  return v_id;
end;
$$;

create or replace function public.people_unverify(
  p_person_id uuid,
  p_reason    text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  perform public.require_capability('people.manage');

  if coalesce(char_length(btrim(p_reason)), 0) < 3 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;

  update public.people_verifications
  set superseded_at = now()
  where person_id = p_person_id and superseded_at is null;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception using errcode = 'P0002', message = 'no_current_verification';
  end if;

  perform public.audit_event('staff', 'people.unverify', 'person', p_person_id, 'success',
    jsonb_build_object('reason', p_reason));
end;
$$;


revoke all on function public.people_create(text, text, text, text, text, boolean, text, text, text) from public;
revoke all on function public.people_update(uuid, bigint, text, text, text, text, text, boolean, text, text, text, text, boolean) from public;
revoke all on function public.people_set_status(uuid, text, bigint) from public;
revoke all on function public.people_verify(uuid, uuid, text) from public;
revoke all on function public.people_unverify(uuid, text) from public;
grant execute on function public.people_create(text, text, text, text, text, boolean, text, text, text) to authenticated;
grant execute on function public.people_update(uuid, bigint, text, text, text, text, text, boolean, text, text, text, text, boolean) to authenticated;
grant execute on function public.people_set_status(uuid, text, bigint) to authenticated;
grant execute on function public.people_verify(uuid, uuid, text) to authenticated;
grant execute on function public.people_unverify(uuid, text) to authenticated;
