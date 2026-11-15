-- Restore the minimum forum schema required by the staff report queue when the original
-- forum foundation was not applied. This is intentionally additive and seeds no forum content.
-- Existing forum migrations remain untouched; no destructive reconciliation is performed.

create table if not exists public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  name text not null,
  description text,
  rules text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forum_categories_slug_format check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint forum_categories_name_length check (char_length(btrim(name)) between 2 and 80)
);

create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.forum_categories(id) on delete restrict,
  author_id uuid references public.profiles(user_id) on delete set null,
  slug citext not null unique,
  title text not null,
  state text not null default 'open',
  is_pinned boolean not null default false,
  post_count integer not null default 0,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint forum_threads_slug_format check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint forum_threads_title_length check (char_length(btrim(title)) between 3 and 160),
  constraint forum_threads_state check (state in ('open', 'locked', 'hidden', 'deleted')),
  constraint forum_threads_post_count check (post_count >= 0),
  constraint forum_threads_deleted_state check (deleted_at is null or state = 'deleted')
);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete restrict,
  author_id uuid references public.profiles(user_id) on delete set null,
  body text not null,
  state text not null default 'visible',
  hidden_reason text,
  hidden_by uuid references auth.users(id) on delete set null,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint forum_posts_body_length check (state = 'deleted' or char_length(btrim(body)) between 1 and 20000),
  constraint forum_posts_state check (state in ('visible', 'hidden', 'deleted')),
  constraint forum_posts_hidden_requires_reason check (
    state <> 'hidden' or (hidden_reason is not null and hidden_by is not null and hidden_at is not null)
  )
);

create table if not exists public.forum_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  reporter_id uuid references public.profiles(user_id) on delete set null,
  reason text not null,
  note text,
  state text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  constraint forum_reports_reason check (reason in ('spam', 'harassment', 'hate', 'misinformation', 'privacy', 'other')),
  constraint forum_reports_note_length check (note is null or char_length(note) <= 1000),
  constraint forum_reports_state check (state in ('open', 'actioned', 'dismissed')),
  constraint forum_reports_resolution check (state = 'open' or resolved_at is not null),
  constraint forum_reports_one_per_member unique (post_id, reporter_id)
);

create index if not exists forum_threads_list_idx
  on public.forum_threads (category_id, is_pinned desc, last_activity_at desc)
  where state in ('open', 'locked');
create index if not exists forum_posts_thread_idx on public.forum_posts (thread_id, created_at);
create index if not exists forum_reports_queue_idx on public.forum_reports (state, created_at);
create index if not exists forum_reports_post_idx on public.forum_reports (post_id, created_at desc);

alter table public.forum_categories enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_reports enable row level security;

revoke all on table public.forum_categories, public.forum_threads, public.forum_posts, public.forum_reports
  from public, anon, authenticated;
grant select on public.forum_categories, public.forum_threads, public.forum_posts to anon, authenticated;
grant select on public.forum_reports to authenticated;
grant insert (post_id, reporter_id, reason, note) on public.forum_reports to authenticated;

create policy forum_categories_read_repair on public.forum_categories
  for select to anon, authenticated using (is_active);
create policy forum_categories_read_staff_repair on public.forum_categories
  for select to authenticated using (public.has_capability('moderation.review'));
create policy forum_threads_read_public_repair on public.forum_threads
  for select to anon, authenticated using (state in ('open', 'locked') and deleted_at is null);
create policy forum_threads_read_own_repair on public.forum_threads
  for select to authenticated using (author_id = (select auth.uid()));
create policy forum_threads_read_staff_repair on public.forum_threads
  for select to authenticated using (public.has_capability('moderation.review'));
create policy forum_posts_read_public_repair on public.forum_posts
  for select to anon, authenticated using (
    state = 'visible' and exists (
      select 1 from public.forum_threads t
      where t.id = forum_posts.thread_id and t.state in ('open', 'locked') and t.deleted_at is null
    )
  );
create policy forum_posts_read_own_repair on public.forum_posts
  for select to authenticated using (author_id = (select auth.uid()));
create policy forum_posts_read_staff_repair on public.forum_posts
  for select to authenticated using (public.has_capability('moderation.review'));
create policy forum_reports_insert_own_repair on public.forum_reports
  for insert to authenticated with check (
    reporter_id = (select auth.uid()) and public.is_member_active() and not public.is_member_banned()
  );
create policy forum_reports_read_own_repair on public.forum_reports
  for select to authenticated using (reporter_id = (select auth.uid()));
create policy forum_reports_read_staff_repair on public.forum_reports
  for select to authenticated using (public.has_capability('moderation.review'));

-- Only the capability-checked RPC may change post or report moderation state.
create or replace function public.forum_post_moderate(p_post_id uuid, p_action text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  perform public.require_capability('moderation.review');
  if p_action is null or p_action not in ('hide', 'restore') then
    raise exception using errcode = '22023', message = 'invalid_action';
  end if;
  if coalesce(char_length(btrim(p_reason)), 0) < 5 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;
  if not exists (select 1 from public.forum_posts p where p.id = p_post_id) then
    raise exception using errcode = 'P0002', message = 'post_not_found';
  end if;
  if p_action = 'hide' then
    update public.forum_posts
      set state = 'hidden', hidden_reason = btrim(p_reason), hidden_by = v_actor, hidden_at = now()
      where id = p_post_id and state <> 'deleted';
  else
    update public.forum_posts
      set state = 'visible', hidden_reason = null, hidden_by = null, hidden_at = null
      where id = p_post_id and state <> 'deleted';
  end if;
  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
    values (v_actor, 'forum_post', p_post_id, p_action, btrim(p_reason));
  perform public.audit_event('staff', 'forum.post.' || p_action, 'forum_post', p_post_id, 'success',
    jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.forum_report_resolve(p_report_id uuid, p_action text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_post_id uuid;
begin
  perform public.require_capability('moderation.review');
  if p_action is null or p_action not in ('hide', 'restore', 'dismiss') then
    raise exception using errcode = '22023', message = 'invalid_action';
  end if;
  if coalesce(char_length(btrim(p_reason)), 0) < 5 or char_length(btrim(p_reason)) > 1000 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;
  select r.post_id into v_post_id from public.forum_reports r
    where r.id = p_report_id and r.state = 'open' for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'open_report_not_found';
  end if;
  if p_action in ('hide', 'restore') then
    perform public.forum_post_moderate(v_post_id, p_action, btrim(p_reason));
    update public.forum_reports set state = 'actioned', resolved_by = v_actor, resolved_at = now()
      where id = p_report_id;
  else
    update public.forum_reports set state = 'dismissed', resolved_by = v_actor, resolved_at = now()
      where id = p_report_id;
    insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
      values (v_actor, 'forum_post', v_post_id, 'dismiss', btrim(p_reason));
  end if;
  perform public.audit_event('staff', 'forum.report.resolve', 'forum_report', p_report_id,
    'success', jsonb_build_object('action', p_action, 'post_id', v_post_id));
end;
$$;

revoke all on function public.forum_post_moderate(uuid, text, text) from public;
revoke all on function public.forum_report_resolve(uuid, text, text) from public;
grant execute on function public.forum_post_moderate(uuid, text, text) to authenticated;
grant execute on function public.forum_report_resolve(uuid, text, text) to authenticated;
