-- EPE LAWA — public poll results (forward-only).
--
-- Vote rows are member-private, so results need an aggregate RPC for the
-- public widget. Anyone may read results for a poll that is visible
-- (active, or closed but recently finished) to keep counts honest.

create or replace function public.site_poll_results(p_poll_id uuid)
returns table (option_id uuid, label text, votes bigint)
language sql
security definer
set search_path = ''
stable
as $$
  select o.id, o.label, (
    select count(*)::bigint from public.site_poll_votes v where v.option_id = o.id
  )
  from public.site_poll_options o
  where o.poll_id = p_poll_id and exists (
    select 1 from public.site_polls p
    where p.id = p_poll_id and (p.status = 'active' or public.has_capability('article.publish'))
  )
  order by o.sort_order, o.label
$$;

grant execute on function public.site_poll_results(uuid) to anon, authenticated;
