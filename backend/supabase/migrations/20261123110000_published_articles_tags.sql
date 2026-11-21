-- EPE LAWA — make article tags actually readable end-to-end.
--
-- 1. The newsroom embed (article_version_tags -> tags[label]) had no SELECT
--    grant or policy, so the tags panel failed at runtime. Staff now read the
--    link table through a strict capability policy.
-- 2. `published_articles` (security_invoker) could not join article_version_tags
--    for anon readers; a security-definer aggregator supplies the public
--    `tags` jsonb column used by /news (listing, tag filter, search RPC) and
--    the article page.

create or replace function public.article_version_tags_json(p_version_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('slug', t.slug, 'label', t.label) order by t.label), '[]'::jsonb)
  from public.article_version_tags avt
  join public.tags t on t.id = avt.tag_id
  where avt.version_id = p_version_id
$$;

revoke all on function public.article_version_tags_json(uuid) from public, anon, authenticated;
grant execute on function public.article_version_tags_json(uuid) to anon, authenticated;

drop policy if exists article_version_tags_staff_read on public.article_version_tags;
create policy article_version_tags_staff_read
  on public.article_version_tags for select to authenticated
  using (public.has_capability('article.review') or public.has_capability('article.create'));

grant select on table public.article_version_tags to authenticated;

create or replace view public.published_articles
with (security_invoker = true) as
select a.id,
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
  c.label as category_label,
  v.cover_url,
  v.cover_alt,
  v.cover_credit,
  v.cover_source_url,
  v.cover_license_url,
  v.cover_caption,
  public.article_version_tags_json(v.id) as tags
from public.articles a
join public.article_versions v on v.id = a.published_version_id and v.state = 'approved'
join public.authors au on au.id = v.author_id
join public.categories c on c.id = v.category_id
where a.published_version_id is not null;
