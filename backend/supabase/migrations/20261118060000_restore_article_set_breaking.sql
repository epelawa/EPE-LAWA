-- Forward-only reconciliation: public published articles only, capability checked and audited.
create or replace function public.article_set_breaking(
  p_article_id        uuid,
  p_breaking          boolean,
  p_until             timestamptz,
  p_expected_revision bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision  bigint;
  v_published uuid;
begin
  perform public.require_capability('article.publish');

  select a.revision, a.published_version_id
    into v_revision, v_published
  from public.articles a
  where a.id = p_article_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'article_not_found';
  end if;

  if v_revision is distinct from p_expected_revision then
    raise exception using errcode = '40001', message = 'revision_conflict',
      detail = format('Expected revision %s but article is at %s.', p_expected_revision, v_revision);
  end if;

  if v_published is null then
    raise exception using errcode = '42501', message = 'not_published',
      detail = 'Only a published article can be flagged breaking.';
  end if;

  if p_breaking is null then
    raise exception using errcode = '22023', message = 'breaking_flag_required';
  end if;

  if p_breaking and (p_until is null or not pg_catalog.isfinite(p_until) or p_until <= now()) then
    raise exception using errcode = '22023', message = 'breaking_expiry_required',
      detail = 'A breaking flag needs an expiry in the future.';
  end if;

  update public.articles
  set is_breaking = p_breaking,
      breaking_until = case when p_breaking then p_until else null end,
      revision = revision + 1
  where id = p_article_id;

  perform public.audit_event('staff', 'article.set_breaking', 'article', p_article_id, 'success',
    jsonb_build_object('breaking', p_breaking, 'until', p_until));
end;
$$;

revoke all on function public.article_set_breaking(uuid, boolean, timestamptz, bigint) from public, anon, authenticated;
grant execute on function public.article_set_breaking(uuid, boolean, timestamptz, bigint) to authenticated;
