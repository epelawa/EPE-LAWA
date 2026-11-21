-- Remove the prefilled (approved) cover images — part 1 (RPC rewrites + metadata rule).
--
-- The column drop happens in part 2 (20261121213100_remove_prefilled_covers_part2_column.sql);
-- no row rewrite is performed, so the article_versions_guard UPDATE trigger is never fired.

create or replace function public.news_cover_metadata_is_valid(p_cover_url text, p_cover_alt text, p_cover_credit text, p_cover_source_url text, p_cover_license_url text, p_cover_caption text)
returns boolean
language sql
immutable
set search_path to ''
as $$
  select case when p_cover_url is null then
    p_cover_alt is null and p_cover_credit is null and p_cover_source_url is null
    and p_cover_license_url is null and p_cover_caption is null
  else
    public.news_cover_url_is_safe(p_cover_url)
    and pg_catalog.char_length(pg_catalog.btrim(coalesce(p_cover_alt, cast('' as text)))) between 1 and 500
    and pg_catalog.char_length(pg_catalog.btrim(coalesce(p_cover_credit, cast('' as text)))) between 1 and 300
    and public.news_cover_url_is_safe(p_cover_source_url)
    and public.news_cover_url_is_safe(p_cover_license_url)
    and (p_cover_caption is null or pg_catalog.char_length(pg_catalog.btrim(p_cover_caption)) <= 500)
  end;
$$;

alter table public.article_versions drop constraint article_versions_cover_metadata_check;

drop function public.news_cover_metadata_is_valid(text, text, text, text, text, text, text);

alter table public.article_versions add constraint article_versions_cover_metadata_check
  check (public.news_cover_metadata_is_valid(cover_url, cover_alt, cover_credit, cover_source_url, cover_license_url, cover_caption));

create or replace function public.article_create(p_title text, p_summary text, p_body jsonb, p_author_id uuid, p_category_id uuid, p_seo_title text, p_seo_description text)
returns uuid
language plpgsql
security definer
set search_path to ''
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
    author_id, category_id, seo_title, seo_description, state, created_by
  ) values (
    v_version_id, v_article_id, 1, btrim(p_title), nullif(btrim(coalesce(p_summary, '')), ''), p_body,
    p_author_id, p_category_id, nullif(btrim(coalesce(p_seo_title, '')), ''),
    nullif(btrim(coalesce(p_seo_description, '')), ''),
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

create or replace function public.article_draft_update(p_article_id uuid, p_expected_revision bigint, p_title text, p_summary text, p_body jsonb, p_author_id uuid, p_category_id uuid, p_seo_title text, p_seo_description text)
returns bigint
language plpgsql
security definer
set search_path to ''
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

create or replace function public.article_revise(p_article_id uuid, p_expected_revision bigint, p_title text, p_summary text, p_body jsonb, p_author_id uuid, p_category_id uuid, p_seo_title text, p_seo_description text)
returns uuid
language plpgsql
security definer
set search_path to ''
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
    author_id, category_id, seo_title, seo_description, state, created_by
  ) values (
    v_new_version, p_article_id, v_next_number, btrim(p_title), nullif(btrim(coalesce(p_summary, '')), ''), p_body,
    p_author_id, p_category_id, nullif(btrim(coalesce(p_seo_title, '')), ''),
    nullif(btrim(coalesce(p_seo_description, '')), ''),
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

create or replace function public.article_create_with_cover(p_title text, p_summary text, p_body jsonb, p_author_id uuid, p_category_id uuid, p_seo_title text, p_seo_description text, p_cover_url text, p_cover_alt text, p_cover_credit text, p_cover_source_url text, p_cover_license_url text, p_cover_caption text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_article_id uuid;
  v_version_id uuid;
  v_cover_url text := nullif(pg_catalog.btrim(coalesce(p_cover_url, cast('' as text))), cast('' as text));
  v_cover_alt text := nullif(pg_catalog.btrim(coalesce(p_cover_alt, cast('' as text))), cast('' as text));
  v_cover_credit text := nullif(pg_catalog.btrim(coalesce(p_cover_credit, cast('' as text))), cast('' as text));
  v_cover_source_url text := nullif(pg_catalog.btrim(coalesce(p_cover_source_url, cast('' as text))), cast('' as text));
  v_cover_license_url text := nullif(pg_catalog.btrim(coalesce(p_cover_license_url, cast('' as text))), cast('' as text));
  v_cover_caption text := nullif(pg_catalog.btrim(coalesce(p_cover_caption, cast('' as text))), cast('' as text));
begin
  perform public.require_capability('article.create');
  if not public.news_cover_metadata_is_valid(
    v_cover_url, v_cover_alt, v_cover_credit, v_cover_source_url, v_cover_license_url, v_cover_caption
  ) then
    raise exception using errcode = '22023', message = 'invalid_news_cover_metadata';
  end if;

  v_article_id := public.article_create(
    p_title, p_summary, p_body, p_author_id, p_category_id,
    p_seo_title, p_seo_description
  );
  select a.current_version_id into v_version_id
  from public.articles a where a.id = v_article_id;
  update public.article_versions set
    cover_url = v_cover_url, cover_alt = v_cover_alt, cover_credit = v_cover_credit,
    cover_source_url = v_cover_source_url, cover_license_url = v_cover_license_url,
    cover_caption = v_cover_caption
  where id = v_version_id and article_id = v_article_id and state = 'draft';
  if not found then
    raise exception using errcode = 'P0002', message = 'article_draft_not_found';
  end if;
  return v_article_id;
end;
$$;

create or replace function public.article_draft_update_with_cover(p_article_id uuid, p_expected_revision bigint, p_title text, p_summary text, p_body jsonb, p_author_id uuid, p_category_id uuid, p_seo_title text, p_seo_description text, p_cover_url text, p_cover_alt text, p_cover_credit text, p_cover_source_url text, p_cover_license_url text, p_cover_caption text)
returns bigint
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_revision bigint;
  v_version_id uuid;
  v_cover_url text := nullif(pg_catalog.btrim(coalesce(p_cover_url, cast('' as text))), cast('' as text));
  v_cover_alt text := nullif(pg_catalog.btrim(coalesce(p_cover_alt, cast('' as text))), cast('' as text));
  v_cover_credit text := nullif(pg_catalog.btrim(coalesce(p_cover_credit, cast('' as text))), cast('' as text));
  v_cover_source_url text := nullif(pg_catalog.btrim(coalesce(p_cover_source_url, cast('' as text))), cast('' as text));
  v_cover_license_url text := nullif(pg_catalog.btrim(coalesce(p_cover_license_url, cast('' as text))), cast('' as text));
  v_cover_caption text := nullif(pg_catalog.btrim(coalesce(p_cover_caption, cast('' as text))), cast('' as text));
begin
  perform public.require_capability('article.create');
  if not public.news_cover_metadata_is_valid(
    v_cover_url, v_cover_alt, v_cover_credit, v_cover_source_url, v_cover_license_url, v_cover_caption
  ) then
    raise exception using errcode = '22023', message = 'invalid_news_cover_metadata';
  end if;

  v_revision := public.article_draft_update(
    p_article_id, p_expected_revision, p_title, p_summary, p_body, p_author_id,
    p_category_id, p_seo_title, p_seo_description
  );
  select a.current_version_id into v_version_id
  from public.articles a where a.id = p_article_id;
  update public.article_versions set
    cover_url = v_cover_url, cover_alt = v_cover_alt, cover_credit = v_cover_credit,
    cover_source_url = v_cover_source_url, cover_license_url = v_cover_license_url,
    cover_caption = v_cover_caption
  where id = v_version_id and article_id = p_article_id and state = 'draft';
  if not found then
    raise exception using errcode = 'P0002', message = 'article_draft_not_found';
  end if;
  return v_revision;
end;
$$;

create or replace function public.article_revise_with_cover(p_article_id uuid, p_expected_revision bigint, p_title text, p_summary text, p_body jsonb, p_author_id uuid, p_category_id uuid, p_seo_title text, p_seo_description text, p_cover_url text, p_cover_alt text, p_cover_credit text, p_cover_source_url text, p_cover_license_url text, p_cover_caption text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_version_id uuid;
  v_new_version_id uuid;
  v_cover_url text := nullif(pg_catalog.btrim(coalesce(p_cover_url, cast('' as text))), cast('' as text));
  v_cover_alt text := nullif(pg_catalog.btrim(coalesce(p_cover_alt, cast('' as text))), cast('' as text));
  v_cover_credit text := nullif(pg_catalog.btrim(coalesce(p_cover_credit, cast('' as text))), cast('' as text));
  v_cover_source_url text := nullif(pg_catalog.btrim(coalesce(p_cover_source_url, cast('' as text))), cast('' as text));
  v_cover_license_url text := nullif(pg_catalog.btrim(coalesce(p_cover_license_url, cast('' as text))), cast('' as text));
  v_cover_caption text := nullif(pg_catalog.btrim(coalesce(p_cover_caption, cast('' as text))), cast('' as text));
begin
  perform public.require_capability('article.create');
  if not public.news_cover_metadata_is_valid(
    v_cover_url, v_cover_alt, v_cover_credit, v_cover_source_url, v_cover_license_url, v_cover_caption
  ) then
    raise exception using errcode = '22023', message = 'invalid_news_cover_metadata';
  end if;

  v_new_version_id := public.article_revise(
    p_article_id, p_expected_revision, p_title, p_summary, p_body, p_author_id,
    p_category_id, p_seo_title, p_seo_description
  );
  select a.current_version_id into v_version_id
  from public.articles a where a.id = p_article_id;
  if v_version_id is distinct from v_new_version_id then
    raise exception using errcode = '40001', message = 'revision_conflict';
  end if;
  update public.article_versions set
    cover_url = v_cover_url, cover_alt = v_cover_alt, cover_credit = v_cover_credit,
    cover_source_url = v_cover_source_url, cover_license_url = v_cover_license_url,
    cover_caption = v_cover_caption
  where id = v_new_version_id and article_id = p_article_id and state = 'draft';
  if not found then
    raise exception using errcode = 'P0002', message = 'article_draft_not_found';
  end if;
  return v_new_version_id;
end;
$$;
