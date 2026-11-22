-- EPE LAWA — staff analytics readability fix.
--
-- staff_analytics_timeseries never executed successfully in production:
-- plpgsql RETURNS TABLE makes "day"/"metric"/"total" assigned variables, and
-- the aggregation query referenced `total` unqualified, so Postgres raised
-- `42702: column reference "total" is ambiguous` on every authenticated call
-- (the admin page rendered "Analytics unavailable"). All internal aliases now
-- use span_/g_/c_ qualified names that cannot collide with OUT parameters.

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
    select generate_series(current_date - greatest(p_days, 1) + 1, current_date, interval '1 day')::date as span_day
  ),
  views as (
    select v.viewed_on as view_day, count(*)::bigint as view_total
    from public.article_views v
    where v.viewed_on > current_date - greatest(p_days, 1)
    group by 1
  ),
  clicks as (
    select c."day" as click_day, sum(c.clicks)::bigint as click_total
    from public.business_contact_clicks c
    where c."day" > current_date - greatest(p_days, 1)
    group by 1
  ),
  members as (
    select p.created_at::date as member_day, count(*)::bigint as member_total
    from public.profiles p
    where p.created_at::date > current_date - greatest(p_days, 1)
    group by 1
  ),
  combined as (
    select view_day as day_key, 'article_views'::text as metric_key, view_total as metric_total from views
    union all
    select click_day, 'business_clicks'::text, click_total from clicks
    union all
    select member_day, 'new_members'::text, member_total from members
  )
  select s.span_day,
         g.metric_key::text,
         coalesce(c.metric_total, 0::bigint)
  from span s
  cross join (values ('article_views'), ('business_clicks'), ('new_members')) as g(metric_key)
  left join combined c on c.day_key = s.span_day and c.metric_key = g.metric_key
  order by g.metric_key, s.span_day;
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
