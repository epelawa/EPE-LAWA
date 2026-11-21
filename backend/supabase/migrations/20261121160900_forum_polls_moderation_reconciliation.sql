-- Reconciliation: forum polls, private ballots and forum/moderation write RPCs.
--
-- The live schema received the forum core (categories/threads/posts/reports) with later repair
-- policies, but the poll subsystem, the atomic thread composer, the ballot RPC and the
-- moderation/ban RPCs from 20261102200010_forum.sql were never applied, and no triggers exist
-- on the forum tables. This migration adds only the missing objects, copied verbatim from
-- 20261102200010_forum.sql; the single-vote ballot rules come from the later
-- 20261107215000_forum_single_vote.sql. Existing forum_* policies (the ..._repair set) are
-- deliberately untouched, and forum_post_moderate keeps its repaired live definition.

create table if not exists public.forum_polls (
  id             uuid primary key default gen_random_uuid(),
  thread_id      uuid not null unique references public.forum_threads(id) on delete cascade,
  question       text not null,
  closes_at      timestamptz,
  allow_multiple boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint forum_polls_question_length check (char_length(btrim(question)) between 3 and 300)
);

create table if not exists public.forum_poll_options (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references public.forum_polls(id) on delete cascade,
  label      text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint forum_poll_options_label_length check (char_length(btrim(label)) between 1 and 120),
  constraint forum_poll_options_label_key unique (poll_id, label),
  -- Target of the composite key on votes: an option can only be voted on inside its own poll.
  constraint forum_poll_options_id_poll_key unique (id, poll_id)
);

create table if not exists public.forum_poll_votes (
  poll_id    uuid not null references public.forum_polls(id) on delete cascade,
  option_id  uuid not null,
  voter_id   uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, voter_id, option_id),
  constraint forum_poll_votes_option_poll_fkey
    foreign key (option_id, poll_id) references public.forum_poll_options (id, poll_id)
    on delete cascade
);


create index if not exists forum_polls_thread_idx
  on public.forum_polls (thread_id);
create index if not exists forum_poll_options_poll_idx
  on public.forum_poll_options (poll_id, sort_order);
create index if not exists forum_poll_votes_option_idx
  on public.forum_poll_votes (option_id);
create index if not exists forum_poll_votes_voter_idx
  on public.forum_poll_votes (voter_id, created_at desc);


------------------------------------------------------------------------------
-- Counters
------------------------------------------------------------------------------

-- SECURITY DEFINER: a member has no UPDATE grant on forum_threads, but posting must move the
-- counter. The trigger runs as the definer and touches only the two derived columns.
create or replace function public.sync_thread_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.state = 'visible' then
      update public.forum_threads
      set post_count = post_count + 1,
          last_activity_at = new.created_at
      where id = new.thread_id;
    end if;
    return null;
  end if;

  if tg_op = 'UPDATE' and new.state is distinct from old.state then
    if old.state = 'visible' and new.state <> 'visible' then
      update public.forum_threads
      set post_count = greatest(post_count - 1, 0)
      where id = new.thread_id;
    elsif old.state <> 'visible' and new.state = 'visible' then
      update public.forum_threads
      set post_count = post_count + 1,
          last_activity_at = greatest(coalesce(last_activity_at, new.created_at), new.created_at)
      where id = new.thread_id;
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists forum_posts_sync_thread on public.forum_posts;
create trigger forum_posts_sync_thread
  after insert or update of state on public.forum_posts
  for each row execute function public.sync_thread_activity();

drop trigger if exists forum_threads_set_updated_at on public.forum_threads;
create trigger forum_threads_set_updated_at
  before update on public.forum_threads
  for each row execute function public.set_updated_at();

drop trigger if exists forum_posts_set_updated_at on public.forum_posts;
create trigger forum_posts_set_updated_at
  before update on public.forum_posts
  for each row execute function public.set_updated_at();

drop trigger if exists forum_categories_set_updated_at on public.forum_categories;
create trigger forum_categories_set_updated_at
  before update on public.forum_categories
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------

create or replace function public.forum_create_thread(
  p_category_id       uuid,
  p_title             text,
  p_body              text,
  p_poll_question     text default null,
  p_poll_options      jsonb default null,
  p_poll_closes_at    timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor    uuid := auth.uid();
  v_base     text;
  v_slug     text;
  v_n        integer := 1;
  v_thread   uuid := gen_random_uuid();
  v_poll     uuid;
  v_option_count integer;
  v_label    text;
  v_index    integer := 0;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  if not public.is_member_active() then
    raise exception using errcode = '42501', message = 'member_profile_required';
  end if;

  if public.is_member_banned() then
    raise exception using errcode = '42501', message = 'member_banned',
      detail = 'A banned member cannot start a thread.';
  end if;

  if not exists (
    select 1 from public.forum_categories c where c.id = p_category_id and c.is_active
  ) then
    raise exception using errcode = '23503', message = 'forum_category_unavailable';
  end if;

  v_base := coalesce(public.slugify(p_title), 'thread');
  v_slug := v_base;
  loop
    exit when not exists (select 1 from public.forum_threads t where t.slug = v_slug);
    v_n := v_n + 1;
    if v_n > 50 then
      v_slug := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
      exit;
    end if;
    v_slug := v_base || '-' || v_n::text;
  end loop;

  insert into public.forum_threads (id, category_id, author_id, slug, title, state, last_activity_at)
  values (v_thread, p_category_id, v_actor, v_slug, btrim(p_title), 'open', now());

  insert into public.forum_posts (thread_id, author_id, body, state)
  values (v_thread, v_actor, btrim(p_body), 'visible');

  if p_poll_question is not null and btrim(p_poll_question) <> '' then
    if p_poll_options is null or jsonb_typeof(p_poll_options) <> 'array' then
      raise exception using errcode = '22023', message = 'poll_options_required';
    end if;

    v_option_count := jsonb_array_length(p_poll_options);

    if v_option_count < 2 or v_option_count > 10 then
      raise exception using errcode = '22023', message = 'poll_options_count',
        detail = 'A poll needs between 2 and 10 options.';
    end if;

    insert into public.forum_polls (id, thread_id, question, closes_at)
    values (gen_random_uuid(), v_thread, btrim(p_poll_question), p_poll_closes_at)
    returning id into v_poll;

    for v_label in select jsonb_array_elements_text(p_poll_options) loop
      insert into public.forum_poll_options (poll_id, label, sort_order)
      values (v_poll, btrim(v_label), v_index);
      v_index := v_index + 10;
    end loop;
  end if;

  perform public.audit_event('member', 'forum.thread.create', 'forum_thread', v_thread, 'success',
    jsonb_build_object('category_id', p_category_id, 'has_poll', v_poll is not null));

  return v_thread;
end;
$$;

create or replace function public.forum_vote(p_poll_id uuid, p_option_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_rows  integer;
  v_poll  record;
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

  select p.id, p.allow_multiple, p.closes_at, t.state
    into v_poll
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

  if not exists (
    select 1 from public.forum_poll_options o
    where o.id = p_option_id and o.poll_id = p_poll_id
  ) then
    raise exception using errcode = '23503', message = 'option_not_in_poll';
  end if;

  if not v_poll.allow_multiple and exists (
    select 1 from public.forum_poll_votes v
    where v.poll_id = p_poll_id and v.voter_id = v_actor
  ) then
    raise exception using errcode = '23505', message = 'already_voted';
  end if;

  insert into public.forum_poll_votes (poll_id, option_id, voter_id)
  values (p_poll_id, p_option_id, v_actor)
  on conflict do nothing;

  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    raise exception using errcode = '23505', message = 'already_voted';
  end if;
end;
$$;


-- A ballot is private and single-choice: one row per member and poll.
-- Keep the voter identifier out of the public aggregate view.
create unique index if not exists forum_poll_votes_one_vote_per_member
  on public.forum_poll_votes (poll_id, voter_id);

create or replace function public.forum_thread_moderate(
  p_thread_id uuid,
  p_action    text,
  p_reason    text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_state text;
begin
  perform public.require_capability('moderation.review');

  if p_action not in ('hide', 'restore', 'lock', 'unlock', 'pin', 'unpin') then
    raise exception using errcode = '22023', message = 'invalid_action';
  end if;

  if coalesce(char_length(btrim(p_reason)), 0) < 5 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;

  select t.state into v_state from public.forum_threads t where t.id = p_thread_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'thread_not_found';
  end if;

  update public.forum_threads
  set state = case p_action
                when 'hide'    then 'hidden'
                when 'restore' then 'open'
                when 'lock'    then 'locked'
                when 'unlock'  then 'open'
                else state
              end,
      is_pinned = case p_action
                    when 'pin'   then true
                    when 'unpin' then false
                    else is_pinned
                  end
  where id = p_thread_id;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (v_actor, 'forum_thread', p_thread_id, p_action, btrim(p_reason));

  perform public.audit_event('staff', 'forum.thread.' || p_action, 'forum_thread', p_thread_id,
    'success', jsonb_build_object('reason', p_reason, 'from_state', v_state));
end;
$$;

create or replace function public.member_ban(
  p_user_id   uuid,
  p_reason    text,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id    uuid := gen_random_uuid();
begin
  perform public.require_capability('moderation.review');

  if coalesce(char_length(btrim(p_reason)), 0) < 5 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;

  if p_expires_at is not null and p_expires_at <= now() then
    raise exception using errcode = '22023', message = 'invalid_expiry';
  end if;

  -- Supersede any existing live ban so the partial unique index stays satisfiable.
  update public.member_bans
  set revoked_at = now(), revoked_by = v_actor
  where user_id = p_user_id and revoked_at is null;

  insert into public.member_bans (id, user_id, reason, issued_by, expires_at)
  values (v_id, p_user_id, btrim(p_reason), v_actor, p_expires_at);

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (v_actor, 'profile', p_user_id, 'ban', btrim(p_reason));

  perform public.audit_event('staff', 'member.ban', 'profile', p_user_id, 'success',
    jsonb_build_object('expires_at', p_expires_at, 'ban_id', v_id));

  return v_id;
end;
$$;

create or replace function public.member_unban(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  perform public.require_capability('moderation.review');

  if coalesce(char_length(btrim(p_reason)), 0) < 5 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;

  update public.member_bans
  set revoked_at = now(), revoked_by = v_actor
  where user_id = p_user_id and revoked_at is null;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (v_actor, 'profile', p_user_id, 'unban', btrim(p_reason));

  perform public.audit_event('staff', 'member.unban', 'profile', p_user_id, 'success',
    jsonb_build_object('reason', p_reason));
end;
$$;

revoke all on function public.forum_create_thread(uuid, text, text, text, jsonb, timestamptz) from public;
revoke all on function public.forum_vote(uuid, uuid) from public;
revoke all on function public.forum_post_moderate(uuid, text, text) from public;
revoke all on function public.forum_thread_moderate(uuid, text, text) from public;
revoke all on function public.member_ban(uuid, text, timestamptz) from public;
revoke all on function public.member_unban(uuid, text) from public;

grant execute on function public.forum_create_thread(uuid, text, text, text, jsonb, timestamptz) to authenticated;
grant execute on function public.forum_vote(uuid, uuid) to authenticated;
grant execute on function public.forum_post_moderate(uuid, text, text) to authenticated;
grant execute on function public.forum_thread_moderate(uuid, text, text) to authenticated;
grant execute on function public.member_ban(uuid, text, timestamptz) to authenticated;
grant execute on function public.member_unban(uuid, text) to authenticated;

------------------------------------------------------------------------------
-- Public poll results (counts only, never voter identity)
------------------------------------------------------------------------------

drop view if exists public.forum_poll_results;


revoke all on function public.forum_create_thread(uuid, text, text, text, jsonb, timestamptz) from public;
revoke all on function public.forum_vote(uuid, uuid) from public;
revoke all on function public.forum_thread_moderate(uuid, text, text) from public;
revoke all on function public.member_ban(uuid, text, timestamptz) from public;
revoke all on function public.member_unban(uuid, text) from public;
grant execute on function public.forum_create_thread(uuid, text, text, text, jsonb, timestamptz) to authenticated;
grant execute on function public.forum_vote(uuid, uuid) to authenticated;
grant execute on function public.forum_thread_moderate(uuid, text, text) to authenticated;
grant execute on function public.member_ban(uuid, text, timestamptz) to authenticated;
grant execute on function public.member_unban(uuid, text) to authenticated;

drop view if exists public.forum_poll_results;
create view public.forum_poll_results as
select
  v.poll_id,
  v.option_id,
  count(*)::integer as vote_count
from public.forum_poll_votes v
group by v.poll_id, v.option_id;

-- Definer view over a private table: it exposes an aggregate and nothing else. Recreating it
-- with additional columns would leak who voted, so the column list is explicit.
grant select on public.forum_poll_results to anon, authenticated;


alter table public.forum_polls enable row level security;
alter table public.forum_poll_options enable row level security;
alter table public.forum_poll_votes enable row level security;

revoke all on table public.forum_polls from public, anon, authenticated;
revoke all on table public.forum_poll_options from public, anon, authenticated;
revoke all on table public.forum_poll_votes from public, anon, authenticated;

grant select on table public.forum_polls to anon, authenticated;
grant select on table public.forum_poll_options to anon, authenticated;
grant select on table public.forum_poll_votes to authenticated;

drop policy if exists forum_polls_read on public.forum_polls;
create policy forum_polls_read on public.forum_polls
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.forum_threads t
      where t.id = forum_polls.thread_id and t.state in ('open', 'locked')
    )
  );

drop policy if exists forum_polls_read_staff on public.forum_polls;
create policy forum_polls_read_staff on public.forum_polls
  for select to authenticated
  using (public.has_capability('moderation.review'));

drop policy if exists forum_poll_options_read on public.forum_poll_options;
create policy forum_poll_options_read on public.forum_poll_options
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.forum_polls p
      join public.forum_threads t on t.id = p.thread_id
      where p.id = forum_poll_options.poll_id and t.state in ('open', 'locked')
    )
  );

drop policy if exists forum_poll_options_read_staff on public.forum_poll_options;
create policy forum_poll_options_read_staff on public.forum_poll_options
  for select to authenticated
  using (public.has_capability('moderation.review'));

-- A member sees their own votes so the UI can show what they picked. Counts come from
-- forum_poll_results, which does not reveal voter identity.
drop policy if exists forum_poll_votes_read_own on public.forum_poll_votes;
create policy forum_poll_votes_read_own on public.forum_poll_votes
  for select to authenticated
  using (voter_id = (select auth.uid()));
