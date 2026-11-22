-- EPE LAWA — forum read tracking.
--
-- Powers honest unread indicators in the community messaging surface. A member's
-- "unread" badge on a thread means: they take part in that thread (they have a
-- visible post in it) AND the thread saw activity after their last read AND that
-- activity is recent (last 30 days). No fabricated counts: the forum shows a dot,
-- never a number it cannot verify.

create table if not exists public.forum_thread_reads (
  user_id      uuid not null references public.profiles(user_id) on delete cascade,
  thread_id    uuid not null references public.forum_threads(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);

create index if not exists forum_thread_reads_user_idx
  on public.forum_thread_reads (user_id, thread_id);

create index if not exists forum_thread_reads_thread_idx
  on public.forum_thread_reads (thread_id);

alter table public.forum_thread_reads enable row level security;

revoke all on table public.forum_thread_reads from public, anon, authenticated;

grant select, insert, update on table public.forum_thread_reads to authenticated;

drop policy if exists forum_thread_reads_own_select on public.forum_thread_reads;
create policy forum_thread_reads_own_select on public.forum_thread_reads
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Members write only their own read stamps; the RPC below is the single path the
-- thread view uses so thread_id is always paired with the session's user.
drop policy if exists forum_thread_reads_own_write on public.forum_thread_reads;
create policy forum_thread_reads_own_write on public.forum_thread_reads
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member_active());

drop policy if exists forum_thread_reads_own_update on public.forum_thread_reads;
create policy forum_thread_reads_own_update on public.forum_thread_reads
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Threads this member takes part in and has not caught up on. The thread page
-- marks its own read stamp; the community listing consumes this list for dots
-- and per-channel badges. Returns nothing for anonymous callers.
create or replace function public.forum_unread_threads(p_limit integer default 200)
returns setof uuid
language sql
security definer
set search_path = ''
as $$
  select t.id
  from public.forum_threads t
  where (select auth.uid()) is not null
    and t.state in ('open', 'locked')
    and t.deleted_at is null
    and t.last_activity_at is not null
    and t.last_activity_at > now() - interval '30 days'
    and exists (
      select 1 from public.forum_posts p
      where p.thread_id = t.id
        and p.author_id = (select auth.uid())
        and p.state = 'visible'
    )
    and coalesce(
      (select r.last_read_at from public.forum_thread_reads r
        where r.user_id = (select auth.uid()) and r.thread_id = t.id),
      timestamptz '-infinity'
    ) < t.last_activity_at
  limit greatest(coalesce(p_limit, 200), 1);
$$;

-- Called when an open thread is viewed: stamps this member's read position.
create or replace function public.forum_thread_read_mark(p_thread_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_member_active() then return false; end if;
  if p_thread_id is null
     or not exists (select 1 from public.forum_threads t where t.id = p_thread_id)
  then return false; end if;

  insert into public.forum_thread_reads (user_id, thread_id, last_read_at)
    values ((select auth.uid()), p_thread_id, now())
    on conflict (user_id, thread_id) do update
      set last_read_at = greatest(public.forum_thread_reads.last_read_at, now());

  return true;
end;
$$;

revoke all on function public.forum_unread_threads(integer) from public, anon, authenticated;
grant execute on function public.forum_unread_threads(integer) to authenticated;
revoke all on function public.forum_thread_read_mark(uuid) from public, anon, authenticated;
grant execute on function public.forum_thread_read_mark(uuid) to authenticated;
