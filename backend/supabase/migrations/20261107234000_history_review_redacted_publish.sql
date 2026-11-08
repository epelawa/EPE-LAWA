-- Require staff to provide every public text field explicitly; never promote private submission text implicitly.
drop function if exists public.history_contribution_decide(uuid, text);
drop function if exists public.history_contribution_decide(uuid, text, text);
drop function if exists public.history_contribution_decide(uuid, text, text, text, text);

create function public.history_contribution_decide(
  p_contribution_id uuid,
  p_decision text,
  p_public_account text,
  p_public_family_name text,
  p_public_lineage_description text,
  p_public_citation text,
  p_public_source_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_contribution public.history_contributions%rowtype;
  v_record_id uuid;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not exists (
    select 1 from auth.users u
    join public.staff_profiles p on p.user_id = u.id
    where u.id = v_actor and u.email_confirmed_at is not null and p.is_active
  ) then
    raise exception using errcode = '42501', message = 'active_verified_staff_required';
  end if;
  if not public.has_capability('history.review') then
    raise exception using errcode = '42501', message = 'history_review_required';
  end if;
  if p_decision is null or p_decision not in ('needs_revision', 'rejected', 'published') then
    raise exception using errcode = '22023', message = 'invalid_history_decision';
  end if;
  if p_decision = 'published' and (p_public_account is null or char_length(btrim(p_public_account)) not between 20 and 20000) then
    raise exception using errcode = '22023', message = 'approved_public_account_required';
  end if;
  if p_decision = 'published' and (p_public_citation is null or char_length(btrim(p_public_citation)) not between 3 and 1000) then
    raise exception using errcode = '22023', message = 'approved_public_citation_required';
  end if;
  if p_public_source_url is not null and btrim(p_public_source_url) <> '' and
     (char_length(btrim(p_public_source_url)) > 1000 or btrim(p_public_source_url) !~* '^https://') then
    raise exception using errcode = '22023', message = 'invalid_public_source_url';
  end if;
  if p_public_family_name is not null and btrim(p_public_family_name) <> '' and char_length(btrim(p_public_family_name)) > 180 then
    raise exception using errcode = '22023', message = 'invalid_public_family_name';
  end if;
  if p_public_lineage_description is not null and btrim(p_public_lineage_description) <> '' and char_length(btrim(p_public_lineage_description)) > 5000 then
    raise exception using errcode = '22023', message = 'invalid_public_lineage_description';
  end if;

  select * into v_contribution
  from public.history_contributions
  where id = p_contribution_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'history_contribution_not_found';
  end if;
  if v_contribution.status <> 'pending' or v_contribution.reviewed_at is not null
     or v_contribution.reviewed_by is not null then
    raise exception using errcode = '40001', message = 'history_contribution_already_reviewed';
  end if;

  if p_decision = 'published' then
    insert into public.history_records
      (title, account, published_by, community, category, family_name, lineage_description)
    values
      (v_contribution.title, p_public_account, v_actor, v_contribution.community,
       v_contribution.category, nullif(btrim(p_public_family_name), ''), nullif(btrim(p_public_lineage_description), ''))
    returning id into v_record_id;

    insert into public.history_record_sources (record_id, citation, source_url)
    values (v_record_id, btrim(p_public_citation), nullif(btrim(p_public_source_url), ''));
  end if;

  update public.history_contributions
  set status = p_decision, reviewed_at = pg_catalog.now(), reviewed_by = v_actor
  where id = p_contribution_id;

  perform public.audit_event(
    'staff', 'history.contribution_decide', 'history_contribution', p_contribution_id, 'success',
    jsonb_build_object('decision', p_decision, 'record_id', v_record_id)
  );

  return v_record_id;
end;
$$;

revoke all on function public.history_contribution_decide(uuid, text, text, text, text, text, text) from public, anon;
grant execute on function public.history_contribution_decide(uuid, text, text, text, text, text, text) to authenticated;
