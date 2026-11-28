-- EPE LAWA — community engagement analytics.
--
-- staff_analytics_engagement extends the admin analytics page beyond reads and
-- clicks with the community surfaces: forum threads and posts opened per day,
-- event submissions and radio song requests. Same contract as
-- staff_analytics_timeseries: security definer, capability-gated, internal
-- aliases prefixed so they cannot collide with the OUT parameters (42702).

create or replace function public.staff_analytics_engagement(p_days integer default 30)
returns table ("day" date, "metric" text, "total" bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.has_capability('article.publish')
    or public.has_capability('business.review')
    or public.has_capability('moderation.review')
    or public.has_capability('events.review')
    or public.has_capability('radio.manage')) then
    raise exception using errcode = '42501', message = 'analytics_forbidden';
  end if;
  return query
  with span as (
    select generate_series(current_date - greatest(p_days, 1) + 1, current_date, interval '1 day')::date as span_day
  ),
  threads as (
    select t.created_at::date as thread_day, count(*)::bigint as thread_total
    from public.forum_threads t
    where t.created_at::date > current_date - greatest(p_days, 1)
    group by 1
  ),
  posts as (
    select p.created_at::date as post_day, count(*)::bigint as post_total
    from public.forum_posts p
    where p.created_at::date > current_date - greatest(p_days, 1)
    group by 1
  ),
  events as (
    select e.created_at::date as event_day, count(*)::bigint as event_total
    from public.events e
    where e.created_at::date > current_date - greatest(p_days, 1)
    group by 1
  ),
  songs as (
    select r.created_at::date as song_day, count(*)::bigint as song_total
    from public.radio_song_requests r
    where r.created_at::date > current_date - greatest(p_days, 1)
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

revoke all on function public.staff_analytics_engagement(integer) from public, anon, authenticated;
grant execute on function public.staff_analytics_engagement(integer) to authenticated;
