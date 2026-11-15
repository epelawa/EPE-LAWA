begin;

-- Remote covers are versioned metadata, never an overloaded storage key. Existing catalog and
-- R2 keys remain untouched; null new fields preserve all currently published covers/credits.
alter table public.article_versions add column if not exists cover_url text;
alter table public.article_versions add column if not exists cover_alt text;
alter table public.article_versions add column if not exists cover_credit text;
alter table public.article_versions add column if not exists cover_source_url text;
alter table public.article_versions add column if not exists cover_license_url text;
alter table public.article_versions add column if not exists cover_caption text;

create or replace function public.news_cover_url_is_safe(p_url text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_authority text;
  v_host text;
begin
  if p_url is null
     or pg_catalog.char_length(p_url) not between 12 and 2048
     or p_url !~ '^https://'
     or p_url ~ '[[:space:]]'
     or pg_catalog.strpos(p_url, pg_catalog.chr(92)) > 0 then
    return false;
  end if;

  v_authority := (pg_catalog.regexp_match(p_url, '^https://([^/?#]+)'))[1];
  if v_authority is null or v_authority = '' or pg_catalog.strpos(v_authority, '@') > 0 then
    return false;
  end if;
  if v_authority ~ ':[0-9]+$' then
    if pg_catalog.regexp_replace(v_authority, '^.*:', '') <> '443' then
      return false;
    end if;
    v_host := pg_catalog.regexp_replace(v_authority, ':443$', '');
  else
    v_host := v_authority;
  end if;

  v_host := pg_catalog.lower(v_host);
  if v_host !~ '^[a-z0-9.-]+$'
     or v_host !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
     or not (v_host ~ '[.][a-z]{2,63}$' or v_host ~ '[.]xn--[a-z0-9-]{4,59}$')
     or v_host ~ '(^|[.])(localhost|local|internal|lan|test|invalid|example)$'
     or v_host ~ '^[0-9.]+$' then
    return false;
  end if;
  return true;
end;
$$;

create or replace function public.news_cover_metadata_is_valid(
  p_og_image_key text,
  p_cover_url text,
  p_cover_alt text,
  p_cover_credit text,
  p_cover_source_url text,
  p_cover_license_url text,
  p_cover_caption text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case when p_cover_url is null then
    p_cover_alt is null and p_cover_credit is null and p_cover_source_url is null
    and p_cover_license_url is null and p_cover_caption is null
  else
    p_og_image_key is null
    and public.news_cover_url_is_safe(p_cover_url)
    and pg_catalog.char_length(pg_catalog.btrim(coalesce(p_cover_alt, ''))) between 1 and 500
    and pg_catalog.char_length(pg_catalog.btrim(coalesce(p_cover_credit, ''))) between 1 and 300
    and public.news_cover_url_is_safe(p_cover_source_url)
    and public.news_cover_url_is_safe(p_cover_license_url)
    and (p_cover_caption is null or pg_catalog.char_length(pg_catalog.btrim(p_cover_caption)) <= 500)
  end
$$;

revoke all on function public.news_cover_url_is_safe(text) from public, anon, authenticated;
revoke all on function public.news_cover_metadata_is_valid(text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.news_cover_url_is_safe(text) to service_role;
grant execute on function public.news_cover_metadata_is_valid(text,text,text,text,text,text,text) to service_role;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.article_versions'::regclass
      and conname = 'article_versions_cover_metadata_check'
  ) then
    alter table public.article_versions
      add constraint article_versions_cover_metadata_check
      check (public.news_cover_metadata_is_valid(
        og_image_key, cover_url, cover_alt, cover_credit, cover_source_url, cover_license_url, cover_caption
      ));
  end if;
end;
$$;

-- Each wrapper validates metadata and calls the existing, capability-checked authoring RPC inside
-- the same transaction. A failure rolls back both the old article operation and its cover fields.
create or replace function public.article_create_with_cover(
  p_title text, p_summary text, p_body jsonb, p_author_id uuid, p_category_id uuid,
  p_seo_title text, p_seo_description text, p_og_image_key text,
  p_cover_url text, p_cover_alt text, p_cover_credit text, p_cover_source_url text,
  p_cover_license_url text, p_cover_caption text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_article_id uuid;
  v_version_id uuid;
  v_cover_url text := nullif(pg_catalog.btrim(coalesce(p_cover_url, '')), '');
  v_cover_alt text := nullif(pg_catalog.btrim(coalesce(p_cover_alt, '')), '');
  v_cover_credit text := nullif(pg_catalog.btrim(coalesce(p_cover_credit, '')), '');
  v_cover_source_url text := nullif(pg_catalog.btrim(coalesce(p_cover_source_url, '')), '');
  v_cover_license_url text := nullif(pg_catalog.btrim(coalesce(p_cover_license_url, '')), '');
  v_cover_caption text := nullif(pg_catalog.btrim(coalesce(p_cover_caption, '')), '');
begin
  perform public.require_capability('article.create');
  if not public.news_cover_metadata_is_valid(
    nullif(pg_catalog.btrim(coalesce(p_og_image_key, '')), ''), v_cover_url, v_cover_alt,
    v_cover_credit, v_cover_source_url, v_cover_license_url, v_cover_caption
  ) then
    raise exception using errcode = '22023', message = 'invalid_news_cover_metadata';
  end if;

  v_article_id := public.article_create(
    p_title, p_summary, p_body, p_author_id, p_category_id,
    p_seo_title, p_seo_description, p_og_image_key
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

create or replace function public.article_draft_update_with_cover(
  p_article_id uuid, p_expected_revision bigint, p_title text, p_summary text, p_body jsonb,
  p_author_id uuid, p_category_id uuid, p_seo_title text, p_seo_description text, p_og_image_key text,
  p_cover_url text, p_cover_alt text, p_cover_credit text, p_cover_source_url text,
  p_cover_license_url text, p_cover_caption text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision bigint;
  v_version_id uuid;
  v_cover_url text := nullif(pg_catalog.btrim(coalesce(p_cover_url, '')), '');
  v_cover_alt text := nullif(pg_catalog.btrim(coalesce(p_cover_alt, '')), '');
  v_cover_credit text := nullif(pg_catalog.btrim(coalesce(p_cover_credit, '')), '');
  v_cover_source_url text := nullif(pg_catalog.btrim(coalesce(p_cover_source_url, '')), '');
  v_cover_license_url text := nullif(pg_catalog.btrim(coalesce(p_cover_license_url, '')), '');
  v_cover_caption text := nullif(pg_catalog.btrim(coalesce(p_cover_caption, '')), '');
begin
  perform public.require_capability('article.create');
  if not public.news_cover_metadata_is_valid(
    nullif(pg_catalog.btrim(coalesce(p_og_image_key, '')), ''), v_cover_url, v_cover_alt,
    v_cover_credit, v_cover_source_url, v_cover_license_url, v_cover_caption
  ) then
    raise exception using errcode = '22023', message = 'invalid_news_cover_metadata';
  end if;

  -- First update the draft with no catalog key, then atomically apply the selected source and
  -- metadata together. This avoids a transient key+URL constraint failure when switching sources.
  v_revision := public.article_draft_update(
    p_article_id, p_expected_revision, p_title, p_summary, p_body, p_author_id,
    p_category_id, p_seo_title, p_seo_description, null
  );
  select a.current_version_id into v_version_id
  from public.articles a where a.id = p_article_id;
  update public.article_versions set
    og_image_key = nullif(pg_catalog.btrim(coalesce(p_og_image_key, '')), ''),
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

create or replace function public.article_revise_with_cover(
  p_article_id uuid, p_expected_revision bigint, p_title text, p_summary text, p_body jsonb,
  p_author_id uuid, p_category_id uuid, p_seo_title text, p_seo_description text, p_og_image_key text,
  p_cover_url text, p_cover_alt text, p_cover_credit text, p_cover_source_url text,
  p_cover_license_url text, p_cover_caption text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version_id uuid;
  v_new_version_id uuid;
  v_cover_url text := nullif(pg_catalog.btrim(coalesce(p_cover_url, '')), '');
  v_cover_alt text := nullif(pg_catalog.btrim(coalesce(p_cover_alt, '')), '');
  v_cover_credit text := nullif(pg_catalog.btrim(coalesce(p_cover_credit, '')), '');
  v_cover_source_url text := nullif(pg_catalog.btrim(coalesce(p_cover_source_url, '')), '');
  v_cover_license_url text := nullif(pg_catalog.btrim(coalesce(p_cover_license_url, '')), '');
  v_cover_caption text := nullif(pg_catalog.btrim(coalesce(p_cover_caption, '')), '');
begin
  perform public.require_capability('article.create');
  if not public.news_cover_metadata_is_valid(
    nullif(pg_catalog.btrim(coalesce(p_og_image_key, '')), ''), v_cover_url, v_cover_alt,
    v_cover_credit, v_cover_source_url, v_cover_license_url, v_cover_caption
  ) then
    raise exception using errcode = '22023', message = 'invalid_news_cover_metadata';
  end if;

  v_new_version_id := public.article_revise(
    p_article_id, p_expected_revision, p_title, p_summary, p_body, p_author_id,
    p_category_id, p_seo_title, p_seo_description, p_og_image_key
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

revoke all on function public.article_create_with_cover(text,text,jsonb,uuid,uuid,text,text,text,text,text,text,text,text,text) from public, anon;
revoke all on function public.article_draft_update_with_cover(uuid,bigint,text,text,jsonb,uuid,uuid,text,text,text,text,text,text,text,text,text) from public, anon;
revoke all on function public.article_revise_with_cover(uuid,bigint,text,text,jsonb,uuid,uuid,text,text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.article_create_with_cover(text,text,jsonb,uuid,uuid,text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.article_draft_update_with_cover(uuid,bigint,text,text,jsonb,uuid,uuid,text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.article_revise_with_cover(uuid,bigint,text,text,jsonb,uuid,uuid,text,text,text,text,text,text,text,text,text) to authenticated;

-- Retain the exact existing view query (including Production/source drift) as a subquery, then
-- append fields from the current published version. CREATE OR REPLACE preserves the view grants.
do $$
declare
  v_definition text;
begin
  if pg_catalog.to_regclass('public.published_articles') is null then
    raise exception 'news_cover_view_precondition_failed: published_articles view missing';
  end if;
  v_definition := pg_catalog.regexp_replace(
    pg_catalog.pg_get_viewdef('public.published_articles'::regclass, true), ';[[:space:]]*$', ''
  );
  execute pg_catalog.format(
    $cover_view$
      create or replace view public.published_articles with (security_invoker = true) as
      select published_base.*, published_version.cover_url, published_version.cover_alt,
        published_version.cover_credit, published_version.cover_source_url,
        published_version.cover_license_url, published_version.cover_caption
      from (%s) as published_base
      join public.articles as cover_article on cover_article.id = published_base.id
      join public.article_versions as published_version
        on published_version.id = cover_article.published_version_id
    $cover_view$,
    v_definition
  );
end;
$$;

notify pgrst, 'reload schema';
commit;
