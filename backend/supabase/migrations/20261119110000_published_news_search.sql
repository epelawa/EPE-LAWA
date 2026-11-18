-- Search only the existing public projection, with the caller's own permissions.
-- Substring comparison treats punctuation and wildcard characters literally.
create or replace function public.search_published_news(p_query text, p_category text default '', p_offset integer default 0)
returns setof public.published_articles
language sql stable security invoker set search_path = '' as $$
  select p.* from public.published_articles p
  where length(btrim(coalesce(p_query,''))) between 1 and 100
    and (coalesce(p_category,'') = '' or p.category_slug::text = p_category)
    and (strpos(lower(coalesce(p.title,'')),lower(btrim(p_query))) > 0
      or strpos(lower(coalesce(p.summary,'')),lower(btrim(p_query))) > 0
      or strpos(lower(coalesce(p.body::text,'')),lower(btrim(p_query))) > 0
      or strpos(lower(coalesce(p.author_name,'')),lower(btrim(p_query))) > 0
      or strpos(lower(coalesce(p.category_label,'')),lower(btrim(p_query))) > 0)
  order by p.published_at desc nulls last,p.slug asc
  limit 31 offset least(greatest(coalesce(p_offset,0),0),29970);
$$;
revoke all on function public.search_published_news(text,text,integer) from public,anon,authenticated;
grant execute on function public.search_published_news(text,text,integer) to anon,authenticated;
