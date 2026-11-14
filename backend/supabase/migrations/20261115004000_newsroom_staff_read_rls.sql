-- Forward-only Newsroom RLS repair for the verified Production policy baseline.
-- Keep public reads tied to the exact approved version currently selected by the
-- article's publication pointer. Staff may read private material only when they
-- own it and have article.create, or hold a newsroom review/publish capability.
-- These policies are additive; restrictive guards also constrain any older,
-- broader permissive policies that may exist in an installation.

create policy articles_read_newsroom_staff
  on public.articles
  as permissive
  for select to authenticated
  using (
    (
      owner_id = (select auth.uid())
      and public.has_capability('article.create')
    )
    or public.has_capability('article.review')
    or public.has_capability('article.publish')
    or public.has_capability('article.unpublish')
  );

create policy articles_read_newsroom_guard
  on public.articles
  as restrictive
  for select to anon, authenticated
  using (
    published_version_id is not null
    or (
      (owner_id = (select auth.uid()) and public.has_capability('article.create'))
      or public.has_capability('article.review')
      or public.has_capability('article.publish')
      or public.has_capability('article.unpublish')
    )
  );

create policy article_versions_read_newsroom_staff
  on public.article_versions
  as permissive
  for select to authenticated
  using (
    (
      exists (
        select 1
        from public.articles a
        where a.id = article_versions.article_id
          and a.owner_id = (select auth.uid())
      )
      and public.has_capability('article.create')
    )
    or public.has_capability('article.review')
    or public.has_capability('article.publish')
    or public.has_capability('article.unpublish')
  );

create policy article_versions_read_newsroom_guard
  on public.article_versions
  as restrictive
  for select to anon, authenticated
  using (
    (
      state = 'approved'
      and exists (
        select 1
        from public.articles a
        where a.id = article_versions.article_id
          and a.published_version_id = article_versions.id
      )
    )
    or (
      (select auth.uid()) is not null
      and (
        (
          exists (
            select 1
            from public.articles a
            where a.id = article_versions.article_id
              and a.owner_id = (select auth.uid())
          )
          and public.has_capability('article.create')
        )
        or public.has_capability('article.review')
        or public.has_capability('article.publish')
        or public.has_capability('article.unpublish')
      )
    )
  );
