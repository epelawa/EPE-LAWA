-- Live community features: aggregate-only reader presence on articles and a
-- "support" reaction on forum posts. No identity is ever exposed: readers see
-- counts, never who. Presence rows store a random client-side session id so a
-- refresh in the same tab counts once; stale rows are pruned on each beat.
-- Writes happen only through narrow RPCs; direct table access is revoked.

create table public.reader_presence (
  slug text not null,
  session_hash text not null,
  path text not null,
  last_seen timestamptz not null default now(),
  primary key (slug, session_hash)
);

create table public.forum_reactions (
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'support' check (kind in ('support')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

alter table public.reader_presence enable row level security;
alter table public.forum_reactions enable row level security;

revoke all on public.reader_presence, public.forum_reactions from public, anon, authenticated;

create index forum_reactions_post_idx on public.forum_reactions (post_id);
create index forum_reactions_user_idx on public.forum_reactions (user_id);
create index reader_presence_seen_idx on public.reader_presence (last_seen desc);

create or replace function public.reader_presence_beat(p_slug text, p_path text, p_session_hash text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text := left(coalesce(p_slug, ''), 120);
  v_path text := left(coalesce(p_path, ''), 160);
  v_hash text := coalesce(p_session_hash, '');
  v_count integer := 0;
begin
  if v_hash !~ '^[a-f0-9]{16,64}$' or char_length(btrim(v_slug)) < 1 or char_length(btrim(v_path)) < 1 then
    return 0;
  end if;
  insert into public.reader_presence (slug, session_hash, path, last_seen)
    values (v_slug, v_hash, v_path, now())
    on conflict (slug, session_hash) do update set last_seen = now(), path = excluded.path;
  delete from public.reader_presence where last_seen < now() - interval '10 minutes';
  select count(*) into v_count from public.reader_presence
    where slug = v_slug and last_seen > now() - interval '5 minutes';
  return v_count;
end;
$$;

create or replace function public.forum_react_toggle(p_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_count integer := 0;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  if not public.is_member_active() or public.is_member_banned() then
    raise exception using errcode = '22023', message = 'member_profile_required';
  end if;
  if not exists (select 1 from public.forum_posts p where p.id = p_post_id and p.deleted_at is null) then
    raise exception using errcode = '22023', message = 'post_not_available';
  end if;
  if exists (select 1 from public.forum_reactions where post_id = p_post_id and user_id = v_actor and kind = 'support') then
    delete from public.forum_reactions where post_id = p_post_id and user_id = v_actor and kind = 'support';
  else
    insert into public.forum_reactions (post_id, user_id, kind) values (p_post_id, v_actor, 'support');
  end if;
  select count(*) into v_count from public.forum_reactions where post_id = p_post_id and kind = 'support';
  return v_count;
end;
$$;

create or replace function public.forum_reaction_counts(p_post_ids jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('post_id', r.post_id, 'count', r.n)), '[]'::jsonb)
  from (
    select r.post_id, count(*)::int as n
    from public.forum_reactions r
    join public.forum_posts p on p.id = r.post_id
    join public.forum_threads t on t.id = p.thread_id
    where t.state in ('open', 'locked') and t.deleted_at is null and p.deleted_at is null
      and jsonb_typeof(p_post_ids) = 'array'
      and (p.id::text = any (select jsonb_array_elements_text(p_post_ids)))
    group by r.post_id
  ) r;
$$;

revoke all on function public.reader_presence_beat(text, text, text) from public, anon, authenticated;
grant execute on function public.reader_presence_beat(text, text, text) to anon, authenticated;
revoke all on function public.forum_react_toggle(uuid) from public, anon, authenticated;
grant execute on function public.forum_react_toggle(uuid) to authenticated;
revoke all on function public.forum_reaction_counts(jsonb) from public, anon, authenticated;
grant execute on function public.forum_reaction_counts(jsonb) to anon, authenticated;
