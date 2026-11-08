-- Itan Ilu Mi categorization, lineage metadata, and rights evidence.
-- Media remains unavailable until a private, access-controlled storage provider is configured.
alter table public.history_records
  add column community text,
  add column category text not null default 'community-history',
  add column family_name text,
  add column lineage_description text,
  add column rights_description text not null default 'Rights reviewed by staff before publication';

alter table public.history_contributions
  add column community text,
  add column category text not null default 'community-history',
  add column family_name text,
  add column lineage_description text,
  add column rights_description text not null default '';

alter table public.history_contributions drop constraint history_contributions_consent;
alter table public.history_contributions add constraint history_contributions_consent
  check (consent_version in ('history-intake-v1', 'history-intake-v2') and char_length(btrim(consent_text)) between 20 and 1000);

alter table public.history_records
  add constraint history_records_category check (category in ('community-history','family-lineage','cultural-practice','place-history','oral-history','other')),
  add constraint history_records_community_length check (community is null or char_length(btrim(community)) between 1 and 120),
  add constraint history_records_family_length check (family_name is null or char_length(btrim(family_name)) between 1 and 180),
  add constraint history_records_lineage_length check (lineage_description is null or char_length(btrim(lineage_description)) <= 5000),
  add constraint history_records_rights_length check (char_length(btrim(rights_description)) between 5 and 2000);

alter table public.history_contributions
  add constraint history_contributions_category check (category in ('community-history','family-lineage','cultural-practice','place-history','oral-history','other')),
  add constraint history_contributions_community_length check (community is null or char_length(btrim(community)) between 1 and 120),
  add constraint history_contributions_family_length check (family_name is null or char_length(btrim(family_name)) between 1 and 180),
  add constraint history_contributions_lineage_length check (lineage_description is null or char_length(btrim(lineage_description)) <= 5000),
  add constraint history_contributions_rights_length check (char_length(btrim(rights_description)) between 5 and 2000);

create index history_records_community_idx on public.history_records (community);
create index history_records_family_name_idx on public.history_records (family_name);

-- Public metadata is limited to records already present in the approved archive.
grant select (community, category, family_name, lineage_description) on public.history_records to anon, authenticated;
grant insert (community, category, family_name, lineage_description, rights_description) on public.history_contributions to authenticated;

create or replace function public.history_contribution_decide(
  p_contribution_id uuid,
  p_decision text
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
  if v_actor is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  if not exists (
    select 1 from auth.users u join public.staff_profiles p on p.user_id = u.id
    where u.id = v_actor and u.email_confirmed_at is not null and p.is_active
  ) then raise exception using errcode = '42501', message = 'active_verified_staff_required'; end if;
  if not public.has_capability('history.review') then raise exception using errcode = '42501', message = 'history_review_required'; end if;
  if p_decision is null or p_decision not in ('needs_revision', 'rejected', 'published') then
    raise exception using errcode = '22023', message = 'invalid_history_decision';
  end if;
  select * into v_contribution from public.history_contributions where id = p_contribution_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'history_contribution_not_found'; end if;
  if v_contribution.status <> 'pending' or v_contribution.reviewed_at is not null or v_contribution.reviewed_by is not null then
    raise exception using errcode = '40001', message = 'history_contribution_already_reviewed';
  end if;
  if p_decision = 'published' then
    insert into public.history_records (title, account, published_by, community, category, family_name, lineage_description, rights_description)
    values (v_contribution.title, v_contribution.account, v_actor, v_contribution.community, v_contribution.category,
      v_contribution.family_name, v_contribution.lineage_description, v_contribution.rights_description)
    returning id into v_record_id;
    insert into public.history_record_sources (record_id, citation, source_url)
    values (v_record_id, v_contribution.source_description, v_contribution.source_url);
  end if;
  update public.history_contributions set status = p_decision, reviewed_at = pg_catalog.now(), reviewed_by = v_actor where id = p_contribution_id;
  perform public.audit_event('staff', 'history.contribution_decide', 'history_contribution', p_contribution_id, 'success',
    jsonb_build_object('decision', p_decision, 'record_id', v_record_id));
  return v_record_id;
end;
$$;
revoke all on function public.history_contribution_decide(uuid, text) from public, anon;
grant execute on function public.history_contribution_decide(uuid, text) to authenticated;
