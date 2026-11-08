-- A ballot is private and single-choice: one row per member and poll.
-- Keep the voter identifier out of the public aggregate view.
create unique index if not exists forum_poll_votes_one_vote_per_member
  on public.forum_poll_votes (poll_id, voter_id);

create or replace function public.forum_vote(p_poll_id uuid, p_option_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_poll record;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  if not public.is_member_active() then
    raise exception using errcode = '42501', message = 'member_profile_required';
  end if;
  if public.is_member_banned() then
    raise exception using errcode = '42501', message = 'member_banned';
  end if;

  select p.id, p.closes_at, t.state into v_poll
  from public.forum_polls p
  join public.forum_threads t on t.id = p.thread_id
  where p.id = p_poll_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'poll_not_found';
  end if;
  if v_poll.closes_at is not null and v_poll.closes_at <= now() then
    raise exception using errcode = '42501', message = 'poll_closed';
  end if;
  if v_poll.state <> 'open' then
    raise exception using errcode = '42501', message = 'thread_not_open';
  end if;
  if not exists (select 1 from public.forum_poll_options o where o.id = p_option_id and o.poll_id = p_poll_id) then
    raise exception using errcode = '23503', message = 'option_not_in_poll';
  end if;

  insert into public.forum_poll_votes (poll_id, option_id, voter_id)
  values (p_poll_id, p_option_id, v_actor);
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'already_voted';
end;
$$;

revoke all on function public.forum_vote(uuid, uuid) from public;
grant execute on function public.forum_vote(uuid, uuid) to authenticated;
