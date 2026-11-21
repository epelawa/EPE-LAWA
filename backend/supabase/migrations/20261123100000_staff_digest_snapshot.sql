-- EPE LAWA — staff digest snapshot (Feat 1).
--
-- Composes the weekly digest inputs (recent stories, upcoming events, the
-- active site poll) in the database, gated on article.publish. The digest
-- itself is mail-ready output for the staff's own mail tool; nothing here
-- sends email.

create or replace function public.staff_digest_snapshot(p_days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.has_capability('article.publish') then
    raise exception using errcode = '42501', message = 'digest_forbidden';
  end if;
  v_result := jsonb_build_object(
    'generated_at', now(),
    'articles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', a.title, 'slug', a.slug, 'summary', a.summary,
        'published_at', a.published_at, 'url', '/news/' || a.slug
      ) order by a.published_at desc nulls last)
      from public.published_articles a
      where a.published_at >= now() - make_interval(days => greatest(p_days, 1))
      limit 12
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', e.title, 'slug', e.slug, 'venue', e.venue,
        'starts_at', e.starts_at, 'url', '/events'
      ) order by e.starts_at)
      from public.events e
      where e.status = 'published' and e.starts_at >= now()
      limit 8
    ), '[]'::jsonb),
    'poll', (
      select jsonb_build_object('id', s.id, 'question', s.question, 'ends_at', s.ends_at)
      from public.site_polls s
      where s.status = 'active' and (s.ends_at is null or s.ends_at > now())
      order by s.created_at desc
      limit 1
    )
  );
  return v_result;
end;
$$;

revoke all on function public.staff_digest_snapshot(integer) from public, anon, authenticated;
grant execute on function public.staff_digest_snapshot(integer) to authenticated;
