-- EPE LAWA — cap the analytics window.
--
-- The staff analytics RPCs accepted an unbounded caller-supplied p_days, so a
-- single-capability staff token could drive generate_series over an arbitrary
-- span crossed with several metrics and hold a shared connection until the
-- statement timeout. One ceiling now applies to the whole family: at most a
-- year of days, at least one.

create or replace function public.staff_analytics_timeseries(p_days integer default 30)
returns table ("day" date, "metric" text, "total" bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  p_days := least(greatest(p_days, 1), 365);
  if not (public.has_capability('article.publish')
    or public.has_capability('business.review')
    or public.has_capability('moderation.review')) then
    raise exception using errcode = '42501', message = 'analytics_forbidden';
  end if;
  return query
  with span as (
    select generate_series(current_date - p_days + 1, current_date, interval '1 day')::date as d
  ),
  views as (
    select v.viewed_on as d, count(*)::bigint as total
    from public.article_views v
    where v.viewed_on > current_date - p_days
    group by 1
  ),
  clicks as (
    select c."day" as d, sum(c.clicks)::bigint as total
    from public.business_contact_clicks c
    where c."day" > current_date - p_days
    group by 1
  ),
  members as (
    select p.created_at::date as d, count(*)::bigint as total
    from public.profiles p
    where p.created_at::date > current_date - p_days
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
  where v.viewed_on > current_date - least(greatest(p_days, 1), 365)
    and public.has_capability('article.publish')
  group by 1, 2, 3
  order by count(*) desc
  limit greatest(least(p_limit, 25), 1)
$$;

create or replace function public.staff_analytics_engagement(p_days integer default 30)
returns table ("day" date, "metric" text, "total" bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  p_days := least(greatest(p_days, 1), 365);
  if not (public.has_capability('article.publish')
    or public.has_capability('business.review')
    or public.has_capability('moderation.review')
    or public.has_capability('events.review')
    or public.has_capability('radio.manage')) then
    raise exception using errcode = '42501', message = 'analytics_forbidden';
  end if;
  return query
  with span as (
    select generate_series(current_date - p_days + 1, current_date, interval '1 day')::date as span_day
  ),
  threads as (
    select t.created_at::date as thread_day, count(*)::bigint as thread_total
    from public.forum_threads t
    where t.created_at::date > current_date - p_days
      and ((t.state in ('open', 'locked') and t.deleted_at is null)
        or t.author_id = (select auth.uid())
        or public.has_capability('moderation.review'))
    group by 1
  ),
  posts as (
    select p.created_at::date as post_day, count(*)::bigint as post_total
    from public.forum_posts p
    where p.created_at::date > current_date - p_days
      and ((p.state = 'visible'
        and exists (
          select 1 from public.forum_threads t
          where t.id = p.thread_id
            and t.state in ('open', 'locked')
            and t.deleted_at is null
        ))
        or p.author_id = (select auth.uid())
        or public.has_capability('moderation.review'))
    group by 1
  ),
  events as (
    select e.created_at::date as event_day, count(*)::bigint as event_total
    from public.events e
    where e.created_at::date > current_date - p_days
      and ((e.status = 'published' and e.published_at is not null)
        or (e.submitter_id = (select auth.uid()) and (select auth.uid()) is not null)
        or public.has_capability('article.publish'))
    group by 1
  ),
  songs as (
    select r.created_at::date as song_day, count(*)::bigint as song_total
    from public.radio_song_requests r
    where r.created_at::date > current_date - p_days
      and (r.user_id = (select auth.uid())
        or public.has_capability('radio.manage'))
    group by 1
  ),
  combined as (
    select thread_day as day_key, 'forum_threads'::text as metric_key, thread_total as metric_total from threads
    union all
    select post_day, 'forum_posts'::text, post_total from posts
    union all
    select event_day, 'event_submissions'::text, event_total from events
    union all
    select song_day, 'radio_song_requests'::text, song_total from songs
  )
  select s.span_day,
         g.metric_key::text,
         coalesce(c.metric_total, 0::bigint)
  from span s
  cross join (values ('forum_threads'), ('forum_posts'), ('event_submissions'), ('radio_song_requests')) as g(metric_key)
  left join combined c on c.day_key = s.span_day and c.metric_key = g.metric_key
  order by g.metric_key, s.span_day;
end;
$$;

revoke all on function public.staff_analytics_timeseries(integer) from public, anon, authenticated;
revoke all on function public.staff_analytics_top_articles(integer, integer) from public, anon, authenticated;
revoke all on function public.staff_analytics_engagement(integer) from public, anon, authenticated;
grant execute on function public.staff_analytics_timeseries(integer) to authenticated;
grant execute on function public.staff_analytics_top_articles(integer, integer) to authenticated;
grant execute on function public.staff_analytics_engagement(integer) to authenticated;
