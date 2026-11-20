-- Forward-only, idempotent reconciliation: production's published_articles view
-- carries article_versions.body (the article body that search_published_news
-- searches via p.body::text), but the source migration chain never added the
-- column to the view. On a fresh chain this made
-- 20261119110000_published_news_search.sql fail parse/validation with
-- "column p.body does not exist" while the same function was APPLIED in
-- production (see docs/reconciliation/2026-11-20-migration-reconciliation.md).
--
-- Historical migrations are not edited. This restores the column for fresh
-- installs using the same pg_get_viewdef drift-preserving pattern already used
-- by 20261115093000_news_cover_urls.sql, and is a no-op if body already exists
-- (e.g. an environment whose view was created out of band).
do $$
declare
  v_definition text;
begin
  if pg_catalog.to_regclass('public.published_articles') is null then
    raise exception 'published_articles_body_precondition_failed: view missing';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_attribute a
    where a.attrelid = 'public.published_articles'::regclass
      and a.attname = 'body'
      and not a.attisdropped
  ) then
    v_definition := pg_catalog.regexp_replace(
      pg_catalog.pg_get_viewdef('public.published_articles'::regclass, true), ';[[:space:]]*$', ''
    );
    execute pg_catalog.format(
      $body_view$
        create or replace view public.published_articles with (security_invoker = true) as
        select published_base.*, published_version.body as body
        from (%s) as published_base
        join public.articles as cover_article on cover_article.id = published_base.id
        join public.article_versions as published_version
          on published_version.id = cover_article.published_version_id
      $body_view$,
      v_definition
    );
  end if;
end;
$$;

notify pgrst, 'reload schema';
