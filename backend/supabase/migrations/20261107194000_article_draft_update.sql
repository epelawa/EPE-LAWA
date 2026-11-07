-- EPE LAWA — newsroom draft update workflow.
-- Drafts may be edited in place; submitted/reviewed/approved versions remain immutable
-- and corrections continue to use article_revise as a new version.

create or replace function public.article_draft_update(
  p_article_id uuid,
  p_expected_revision bigint,
  p_title text,
  p_summary text,
  p_body jsonb,
  p_author_id uuid,
  p_category_id uuid,
  p_seo_title text,
  p_seo_description text,
  p_og_image_key text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_revision bigint;
  v_current uuid;
  v_state text;
begin
  perform public.require_capability('article.create');

  select a.owner_id, a.revision, a.current_version_id
    into v_owner, v_revision, v_current
  from public.articles a
  where a.id = p_article_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'article_not_found';
  end if;
  if v_owner <> v_actor and not public.has_capability('article.review') then
    raise exception using errcode = '42501', message = 'not_article_owner';
  end if;
  if v_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'revision_conflict',
      detail = format('Expected revision %s but article is at %s.', p_expected_revision, v_revision),
      hint = 'Reload the article before saving again.';
  end if;
  if p_body is null or jsonb_typeof(p_body) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_body';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'invalid_title';
  end if;
  if p_summary is not null and char_length(p_summary) > 1000 then
    raise exception using errcode = '22023', message = 'invalid_summary';
  end if;

  select v.state into v_state
  from public.article_versions v
  where v.id = v_current and v.article_id = p_article_id;
  if v_state is distinct from 'draft' then
    raise exception using errcode = '42501', message = 'invalid_transition',
      detail = 'Only the current draft may be edited. Submitted and approved versions are immutable.';
  end if;

  update public.article_versions
  set title = btrim(p_title),
      summary = nullif(btrim(coalesce(p_summary, '')), ''),
      body = p_body,
      author_id = p_author_id,
      category_id = p_category_id,
      seo_title = nullif(btrim(coalesce(p_seo_title, '')), ''),
      seo_description = nullif(btrim(coalesce(p_seo_description, '')), ''),
      og_image_key = nullif(btrim(coalesce(p_og_image_key, '')), '')
  where id = v_current;

  update public.articles
  set revision = revision + 1
  where id = p_article_id
  returning revision into v_revision;

  perform public.audit_event(
    'staff', 'article.draft_update', 'article', p_article_id, 'success',
    jsonb_build_object('version_id', v_current, 'revision', v_revision)
  );

  return v_revision;
end;
$$;

revoke all on function public.article_draft_update(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text)
  from public, anon;
grant execute on function public.article_draft_update(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text)
  to authenticated;
