-- EPE LAWA — forward-only Newsroom RPC reconciliation for the live Production schema.
-- Production articles use current_version_id / published_version_id; they do not have articles.state.
-- Published versions remain article_versions.state = 'approved' and are exposed only through the
-- published_version_id pointer. No table data is rewritten and no object is dropped.

create or replace function public.article_create(
  p_title text,
  p_summary text,
  p_body jsonb,
  p_author_id uuid,
  p_category_id uuid,
  p_seo_title text,
  p_seo_description text,
  p_og_image_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_article_id uuid := gen_random_uuid();
  v_version_id uuid := gen_random_uuid();
  v_base_slug text;
  v_slug text;
  v_suffix integer := 2;
  v_constraint text;
begin
  perform public.require_capability('article.create');

  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'invalid_title';
  end if;
  if p_body is null or jsonb_typeof(p_body) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_body';
  end if;
  if p_summary is not null and char_length(p_summary) > 1000 then
    raise exception using errcode = '22023', message = 'invalid_summary';
  end if;
  if p_author_id is null or p_category_id is null then
    raise exception using errcode = '22023', message = 'author_and_category_required';
  end if;

  v_base_slug := pg_catalog.btrim(
    pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(p_title)), '[^a-z0-9]+', '-', 'g'),
    '-'
  );
  if v_base_slug = '' then
    v_base_slug := 'article';
  end if;
  v_slug := v_base_slug;
  while exists (select 1 from public.articles a where a.slug::text = v_slug) loop
    v_slug := v_base_slug || '-' || v_suffix::text;
    v_suffix := v_suffix + 1;
  end loop;

  begin
    insert into public.articles (id, slug, owner_id)
    values (v_article_id, v_slug, v_actor);
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint <> 'articles_slug_key' then
      raise;
    end if;
    v_slug := v_base_slug || '-' || pg_catalog.substr(pg_catalog.replace(v_article_id::text, '-', ''), 1, 8);
    insert into public.articles (id, slug, owner_id)
    values (v_article_id, v_slug, v_actor);
  end;

  insert into public.article_versions (
    id, article_id, version_number, title, summary, body,
    author_id, category_id, seo_title, seo_description, og_image_key, state, created_by
  ) values (
    v_version_id, v_article_id, 1, btrim(p_title), nullif(btrim(coalesce(p_summary, '')), ''), p_body,
    p_author_id, p_category_id, nullif(btrim(coalesce(p_seo_title, '')), ''),
    nullif(btrim(coalesce(p_seo_description, '')), ''), nullif(btrim(coalesce(p_og_image_key, '')), ''),
    'draft', v_actor
  );

  update public.articles
  set current_version_id = v_version_id,
      updated_at = now()
  where id = v_article_id;

  perform public.audit_event(
    'staff', 'article.create', 'article', v_article_id, 'success',
    jsonb_build_object('title', btrim(p_title), 'category_id', p_category_id, 'slug', v_slug)
  );

  return v_article_id;
end;
$$;

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

  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'invalid_title';
  end if;
  if p_body is null or jsonb_typeof(p_body) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_body';
  end if;
  if p_summary is not null and char_length(p_summary) > 1000 then
    raise exception using errcode = '22023', message = 'invalid_summary';
  end if;
  if p_author_id is null or p_category_id is null then
    raise exception using errcode = '22023', message = 'author_and_category_required';
  end if;

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

  select v.state into v_state
  from public.article_versions v
  where v.id = v_current and v.article_id = p_article_id
  for update;
  if v_state is null or v_state not in ('draft', 'review') then
    raise exception using errcode = '42501', message = 'invalid_transition',
      detail = 'Only the current unpublished draft or review submission may be saved.';
  end if;

  update public.article_versions
  set title = btrim(p_title),
      summary = nullif(btrim(coalesce(p_summary, '')), ''),
      body = p_body,
      author_id = p_author_id,
      category_id = p_category_id,
      seo_title = nullif(btrim(coalesce(p_seo_title, '')), ''),
      seo_description = nullif(btrim(coalesce(p_seo_description, '')), ''),
      og_image_key = nullif(btrim(coalesce(p_og_image_key, '')), ''),
      state = 'draft'
  where id = v_current;

  update public.articles
  set revision = revision + 1,
      updated_at = now()
  where id = p_article_id
  returning revision into v_revision;

  perform public.audit_event(
    'staff', 'article.draft_update', 'article', p_article_id, 'success',
    jsonb_build_object('version_id', v_current, 'revision', v_revision, 'previous_state', v_state)
  );

  return v_revision;
end;
$$;

create or replace function public.article_revise(
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
returns uuid
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
  v_next_number integer;
  v_new_version uuid := gen_random_uuid();
begin
  perform public.require_capability('article.create');

  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'invalid_title';
  end if;
  if p_body is null or jsonb_typeof(p_body) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_body';
  end if;
  if p_summary is not null and char_length(p_summary) > 1000 then
    raise exception using errcode = '22023', message = 'invalid_summary';
  end if;
  if p_author_id is null or p_category_id is null then
    raise exception using errcode = '22023', message = 'author_and_category_required';
  end if;

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
      hint = 'Reload the article and retry.';
  end if;

  select v.state into v_state
  from public.article_versions v
  where v.id = v_current and v.article_id = p_article_id;
  if v_state is null or v_state not in ('approved', 'rejected') then
    raise exception using errcode = '42501', message = 'invalid_transition',
      detail = 'A new private version can only follow an approved or rejected version.';
  end if;

  select coalesce(max(v.version_number), 0) + 1 into v_next_number
  from public.article_versions v
  where v.article_id = p_article_id;

  insert into public.article_versions (
    id, article_id, version_number, title, summary, body,
    author_id, category_id, seo_title, seo_description, og_image_key, state, created_by
  ) values (
    v_new_version, p_article_id, v_next_number, btrim(p_title), nullif(btrim(coalesce(p_summary, '')), ''), p_body,
    p_author_id, p_category_id, nullif(btrim(coalesce(p_seo_title, '')), ''),
    nullif(btrim(coalesce(p_seo_description, '')), ''), nullif(btrim(coalesce(p_og_image_key, '')), ''),
    'draft', v_actor
  );

  update public.articles
  set current_version_id = v_new_version,
      revision = revision + 1,
      updated_at = now()
  where id = p_article_id;

  perform public.audit_event(
    'staff', 'article.revise', 'article', p_article_id, 'success',
    jsonb_build_object('version_number', v_next_number, 'version_id', v_new_version)
  );

  return v_new_version;
end;
$$;

create or replace function public.article_submit(
  p_article_id uuid,
  p_expected_revision bigint
)
returns void
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
  if v_owner <> v_actor then
    raise exception using errcode = '42501', message = 'not_article_owner';
  end if;
  if v_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'revision_conflict',
      detail = format('Expected revision %s but article is at %s.', p_expected_revision, v_revision);
  end if;

  select v.state into v_state
  from public.article_versions v
  where v.id = v_current and v.article_id = p_article_id
  for update;
  if v_state is distinct from 'draft' then
    raise exception using errcode = '42501', message = 'invalid_transition',
      detail = 'Only the current private draft may be submitted for review.';
  end if;

  update public.article_versions set state = 'review' where id = v_current;
  update public.articles
  set revision = revision + 1,
      updated_at = now()
  where id = p_article_id;

  perform public.audit_event(
    'staff', 'article.submit', 'article', p_article_id, 'success',
    jsonb_build_object('version_id', v_current)
  );
end;
$$;

-- Production's legacy article_review signature/body differs from the checked-in migration and
-- currently calls functions with CALL. The current Admin UI intentionally supports direct publish,
-- not second-party review; disable the stale RPC for every API role until a separately versioned
-- review workflow is implemented against the live signature.
revoke all on function public.article_review(uuid, text, bigint, text) from public, anon, authenticated;

create or replace function public.article_publish(
  p_article_id uuid,
  p_expected_revision bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision bigint;
  v_current uuid;
  v_published uuid;
  v_state text;
  v_was_breaking boolean;
  v_publication_mode text;
begin
  perform public.require_capability('article.publish');

  select a.revision, a.current_version_id, a.published_version_id, a.is_breaking
    into v_revision, v_current, v_published, v_was_breaking
  from public.articles a
  where a.id = p_article_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'article_not_found';
  end if;
  if v_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'revision_conflict',
      detail = format('Expected revision %s but article is at %s.', p_expected_revision, v_revision);
  end if;
  if v_current is null then
    raise exception using errcode = '42501', message = 'no_current_version';
  end if;

  select v.state into v_state
  from public.article_versions v
  where v.id = v_current and v.article_id = p_article_id
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'no_current_version';
  end if;
  if v_state not in ('draft', 'review', 'approved') then
    raise exception using errcode = '42501', message = 'invalid_publish_state',
      detail = format('A version in state %s cannot be published.', v_state);
  end if;
  if v_published = v_current then
    raise exception using errcode = '23505', message = 'already_published';
  end if;

  v_publication_mode := case when v_state = 'approved' then 'previously_approved' else 'direct' end;
  if v_state <> 'approved' then
    -- Production's existing state check and public view use `approved`; do not add or depend on
    -- a `published` state, which would require a destructive constraint replacement.
    update public.article_versions set state = 'approved' where id = v_current;
  end if;

  update public.articles
  set published_version_id = v_current,
      published_at = now(),
      revision = revision + 1,
      updated_at = now()
  where id = p_article_id;

  perform public.audit_event(
    'staff', 'article.publish', 'article', p_article_id, 'success',
    jsonb_build_object(
      'version_id', v_current,
      'previous_version_id', v_published,
      'is_correction', v_published is not null,
      'publication_mode', v_publication_mode,
      'breaking', v_was_breaking
    )
  );
end;
$$;

create or replace function public.article_unpublish(
  p_article_id uuid,
  p_expected_revision bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision bigint;
  v_published uuid;
begin
  perform public.require_capability('article.unpublish');

  select a.revision, a.published_version_id
    into v_revision, v_published
  from public.articles a
  where a.id = p_article_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'article_not_found';
  end if;
  if v_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'revision_conflict',
      detail = format('Expected revision %s but article is at %s.', p_expected_revision, v_revision);
  end if;
  if v_published is null then
    raise exception using errcode = '42501', message = 'not_published';
  end if;

  update public.articles
  set published_version_id = null,
      published_at = null,
      is_breaking = false,
      breaking_until = null,
      revision = revision + 1,
      updated_at = now()
  where id = p_article_id;

  perform public.audit_event(
    'staff', 'article.unpublish', 'article', p_article_id, 'success',
    jsonb_build_object('version_id', v_published)
  );
end;
$$;

revoke all on function public.article_create(text, text, jsonb, uuid, uuid, text, text, text) from public, anon;
grant execute on function public.article_create(text, text, jsonb, uuid, uuid, text, text, text) to authenticated;
revoke all on function public.article_draft_update(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text) from public, anon;
grant execute on function public.article_draft_update(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text) to authenticated;
revoke all on function public.article_revise(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text) from public, anon;
grant execute on function public.article_revise(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text) to authenticated;
revoke all on function public.article_submit(uuid, bigint) from public, anon;
grant execute on function public.article_submit(uuid, bigint) to authenticated;
revoke all on function public.article_publish(uuid, bigint) from public, anon;
grant execute on function public.article_publish(uuid, bigint) to authenticated;
revoke all on function public.article_unpublish(uuid, bigint) from public, anon;
grant execute on function public.article_unpublish(uuid, bigint) to authenticated;
