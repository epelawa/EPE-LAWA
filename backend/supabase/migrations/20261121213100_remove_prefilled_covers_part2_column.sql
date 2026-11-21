-- Remove the prefilled (approved) cover images entirely — part 2 (column drop + view + guard).
-- Part 1 (20261121213000_remove_prefilled_covers_part1_rpcs.sql) rewrote the
-- authoring RPCs and the metadata rule. This part discards the og_image_key
-- column itself. No row rewrite is performed, so the article_versions_guard
-- UPDATE trigger is never fired.

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

drop function public.article_create(text, text, jsonb, uuid, uuid, text, text, text);
drop function public.article_draft_update(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text);
drop function public.article_revise(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text);
drop function public.article_create_with_cover(text, text, jsonb, uuid, uuid, text, text, text, text, text, text, text, text, text);
drop function public.article_draft_update_with_cover(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, text, text, text);
drop function public.article_revise_with_cover(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, text, text, text);

drop function public.search_published_news(text, text, integer);

drop view public.published_articles;

alter table public.article_versions drop column og_image_key;

create or replace function public.guard_article_version()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '42501',
      message = 'article_version_immutable',
      detail = 'Article versions are a permanent record. Unpublish the article instead of deleting history.';
  end if;

  if new.article_id <> old.article_id
     or new.version_number <> old.version_number
     or new.created_by <> old.created_by
     or new.created_at <> old.created_at then
    raise exception using
      errcode = '42501',
      message = 'article_version_immutable',
      detail = 'A version cannot be moved to another article, renumbered, or reattributed.';
  end if;

  if old.state in ('approved', 'published') and (
       new.title is distinct from old.title
    or new.summary is distinct from old.summary
    or new.body is distinct from old.body
    or new.author_id is distinct from old.author_id
    or new.category_id is distinct from old.category_id
    or new.seo_title is distinct from old.seo_title
    or new.seo_description is distinct from old.seo_description
  ) then
    raise exception using
      errcode = '42501',
      message = case when old.state = 'published'
        then 'published_version_immutable'
        else 'approved_version_immutable'
      end,
      detail = 'Create a new version for a correction. Published and approved snapshots cannot be edited in place.';
  end if;

  if old.state <> new.state and not (
       (old.state = 'draft' and new.state in ('review', 'approved', 'published'))
    or (old.state = 'review' and new.state in ('draft', 'approved', 'rejected', 'published'))
    or (old.state = 'approved' and new.state = 'published')
  ) then
    raise exception using
      errcode = '42501',
      message = 'invalid_version_transition',
      detail = format('Cannot move an article version from %s to %s.', old.state, new.state);
  end if;

  return new;
end;
$$;

create view public.published_articles with (security_invoker = true) as
  select published_base.id,
    published_base.slug,
    published_base.published_at,
    published_base.is_breaking,
    published_base.breaking_until,
    published_base.title,
    published_base.summary,
    published_base.body,
    published_base.seo_title,
    published_base.seo_description,
    published_base.author_name,
    published_base.author_slug,
    published_base.category_slug,
    published_base.category_label,
    published_version.cover_url,
    published_version.cover_alt,
    published_version.cover_credit,
    published_version.cover_source_url,
    published_version.cover_license_url,
    published_version.cover_caption
  from (select a.id,
          a.slug,
          a.published_at,
          a.is_breaking,
          a.breaking_until,
          v.title,
          v.summary,
          v.body,
          v.seo_title,
          v.seo_description,
          au.display_name as author_name,
          au.slug as author_slug,
          c.slug as category_slug,
          c.label as category_label
        from articles a
          join article_versions v on v.id = a.published_version_id and v.state = 'approved'
          join authors au on au.id = v.author_id
          join categories c on c.id = v.category_id
        where a.published_version_id is not null) published_base
  join articles cover_article on cover_article.id = published_base.id
  join article_versions published_version on published_version.id = cover_article.published_version_id;

grant select, insert, update, delete, truncate, references, trigger on public.published_articles to anon;
grant select, insert, update, delete, truncate, references, trigger on public.published_articles to authenticated;

create or replace function public.search_published_news(p_query text, p_category text default cast('' as text), p_offset integer default 0)
returns setof public.published_articles
language sql
stable
set search_path to ''
as $$
  select p.* from public.published_articles p
  where length(btrim(coalesce(p_query, cast('' as text)))) between 1 and 100
    and (coalesce(p_category, cast('' as text)) = cast('' as text) or p.category_slug::text = p_category)
    and (strpos(lower(coalesce(p.title, cast('' as text))), lower(btrim(p_query))) > 0
      or strpos(lower(coalesce(p.summary, cast('' as text))), lower(btrim(p_query))) > 0
      or strpos(lower(coalesce(p.body::text, cast('' as text))), lower(btrim(p_query))) > 0
      or strpos(lower(coalesce(p.author_name, cast('' as text))), lower(btrim(p_query))) > 0
      or strpos(lower(coalesce(p.category_label, cast('' as text))), lower(btrim(p_query))) > 0)
  order by p.published_at desc nulls last, p.slug asc
  limit 31 offset least(greatest(coalesce(p_offset, 0), 0), 29970);
$$;

revoke all on function public.search_published_news(text,text,integer) from public,anon,authenticated;
grant execute on function public.search_published_news(text,text,integer) to anon,authenticated;

revoke all on function public.article_create(text, text, jsonb, uuid, uuid, text, text) from public, anon;
grant execute on function public.article_create(text, text, jsonb, uuid, uuid, text, text) to authenticated;
revoke all on function public.article_draft_update(uuid, bigint, text, text, jsonb, uuid, uuid, text, text) from public, anon;
grant execute on function public.article_draft_update(uuid, bigint, text, text, jsonb, uuid, uuid, text, text) to authenticated;
revoke all on function public.article_revise(uuid, bigint, text, text, jsonb, uuid, uuid, text, text) from public, anon;
grant execute on function public.article_revise(uuid, bigint, text, text, jsonb, uuid, uuid, text, text) to authenticated;
revoke all on function public.article_create_with_cover(text, text, jsonb, uuid, uuid, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.article_create_with_cover(text, text, jsonb, uuid, uuid, text, text, text, text, text, text, text, text) to authenticated;
revoke all on function public.article_draft_update_with_cover(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.article_draft_update_with_cover(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, text, text) to authenticated;
revoke all on function public.article_revise_with_cover(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.article_revise_with_cover(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, text, text) to authenticated;
