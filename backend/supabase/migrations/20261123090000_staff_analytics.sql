-- EPE LAWA — staff analytics read RPCs (Feat 20).
--
-- The trend charts read two real counters that carry no grants for PostgREST
-- (article_views is per-viewer-key raw data; business_contact_clicks is the
-- daily aggregate written by business_track_click). Aggregation happens here
-- in the database, gated on senior staff capability, so no per-person rows
-- are ever exposed to the client.

create or replace function public.staff_analytics_timeseries(p_days integer default 30)
returns table ("day" date, "metric" text, "total" bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.has_capability('article.publish')
    or public.has_capability('business.review')
    or public.has_capability('moderation.review')) then
    raise exception using errcode = '42501', message = 'analytics_forbidden';
  end if;
  return query
  with span as (
    select generate_series(current_date - greatest(p_days, 1) + 1, current_date, interval '1 day')::date as d
  ),
  views as (
    select v.viewed_on as d, count(*)::bigint as total
    from public.article_views v
    where v.viewed_on > current_date - greatest(p_days, 1)
    group by 1
  ),
  clicks as (
    select c."day" as d, sum(c.clicks)::bigint as total
    from public.business_contact_clicks c
    where c."day" > current_date - greatest(p_days, 1)
    group by 1
  ),
  members as (
    select p.created_at::date as d, count(*)::bigint as total
    from public.profiles p
    where p.created_at::date > current_date - greatest(p_days, 1)
    group by 1
  ),
  combined as (
    select d, 'article_views'::text as metric, total from views
    union all
    select d, 'business_clicks'::text as metric, total from clicks
    union all
    select d, 'new_members'::text as metric, total from members
  )
  select s.d, g.metric, coalesce(c.total, 0::bigint)
  from span s
  cross join (values ('article_views'), ('business_clicks'), ('new_members')) as g(metric)
  left join combined c on c.d = s.d and c.metric = g.metric
  order by g.metric, s.d;
end;
$$;

create or replace function public.staff_analytics_top_articles(p_days integer default 30, p_limit integer default 10)
returns table (article_id uuid, slug text, title text, view_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select v.article_id, pa.slug, pa.title, count(*)::bigint
  from public.article_views v
  join public.published_articles pa on pa.id = v.article_id
  where v.viewed_on > current_date - greatest(p_days, 1)
    and public.has_capability('article.publish')
  group by 1, 2, 3
  order by count(*) desc
  limit greatest(least(p_limit, 25), 1)
$$;

revoke all on function public.staff_analytics_timeseries(integer) from public, anon, authenticated;
revoke all on function public.staff_analytics_top_articles(integer, integer) from public, anon, authenticated;
grant execute on function public.staff_analytics_timeseries(integer) to authenticated;
grant execute on function public.staff_analytics_top_articles(integer, integer) to authenticated;
