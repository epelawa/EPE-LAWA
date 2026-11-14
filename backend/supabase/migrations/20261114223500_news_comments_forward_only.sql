-- Forward-only News comments foundation and moderation workflow.
-- Creates schema and access rules only; it adds no comments, reports, or public content.
-- This reconciles the absent Production relations without replacing existing policies/triggers.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete restrict,
  parent_id uuid references public.comments(id) on delete restrict,
  author_id uuid references public.profiles(user_id) on delete set null,
  body text not null,
  state text not null default 'visible',
  hidden_reason text,
  hidden_by uuid references auth.users(id) on delete set null,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint comments_state check (state in ('visible', 'hidden', 'deleted')),
  constraint comments_body_length check (state = 'deleted' or char_length(btrim(body)) between 1 and 4000),
  constraint comments_no_self_parent check (parent_id is null or parent_id <> id),
  constraint comments_hidden_requires_reason check (
    state <> 'hidden' or (hidden_reason is not null and hidden_by is not null and hidden_at is not null)
  )
);

create index if not exists comments_article_idx on public.comments (article_id, created_at)
  where state = 'visible';
create index if not exists comments_parent_idx on public.comments (parent_id, created_at);
create index if not exists comments_author_idx on public.comments (author_id, created_at desc);
create index if not exists comments_moderation_idx on public.comments (created_at desc)
  where state = 'hidden';
create index if not exists comments_hidden_by_idx on public.comments (hidden_by);

create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reporter_id uuid references public.profiles(user_id) on delete set null,
  reason text not null,
  note text,
  state text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  constraint comment_reports_reason check (reason in ('spam', 'harassment', 'hate', 'misinformation', 'privacy', 'other')),
  constraint comment_reports_note_length check (note is null or char_length(note) <= 1000),
  constraint comment_reports_state check (state in ('open', 'actioned', 'dismissed')),
  constraint comment_reports_resolution check (state = 'open' or resolved_at is not null),
  constraint comment_reports_one_per_member unique (comment_id, reporter_id)
);

create index if not exists comment_reports_queue_idx on public.comment_reports (state, created_at);
create index if not exists comment_reports_comment_idx on public.comment_reports (comment_id, created_at desc);
create index if not exists comment_reports_reporter_idx on public.comment_reports (reporter_id, created_at desc);
create index if not exists comment_reports_resolver_idx on public.comment_reports (resolved_by);

create or replace function public.guard_comment_shape()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parent_article uuid;
  v_parent_parent uuid;
  v_parent_state text;
begin
  if tg_op = 'UPDATE' then
    if new.parent_id is distinct from old.parent_id or new.article_id is distinct from old.article_id then
      raise exception using errcode = '42501', message = 'comment_immutable_parent',
        detail = 'A comment cannot be moved to another article or under another parent.';
    end if;
    return new;
  end if;

  if new.parent_id is null then
    return new;
  end if;

  select c.article_id, c.parent_id, c.state
    into v_parent_article, v_parent_parent, v_parent_state
  from public.comments c
  where c.id = new.parent_id;

  if not found then
    raise exception using errcode = '23503', message = 'comment_parent_not_found';
  end if;
  if v_parent_parent is not null then
    raise exception using errcode = '23514', message = 'comment_thread_depth',
      detail = 'Replies are one level deep. Reply to the top-level comment instead.';
  end if;
  if v_parent_state <> 'visible' then
    raise exception using errcode = '23514', message = 'comment_parent_not_visible';
  end if;
  if v_parent_article <> new.article_id then
    raise exception using errcode = '23514', message = 'comment_parent_other_article',
      detail = 'A reply must belong to the same article as its parent.';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_comment_shape() from public, anon, authenticated;
do $news_comment_triggers$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.comments'::regclass
      and tgname in ('comments_guard_shape', 'comments_guard_shape_forward')
      and not tgisinternal
  ) then
    create trigger comments_guard_shape_forward
      before insert or update on public.comments
      for each row execute function public.guard_comment_shape();
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.comments'::regclass
      and tgname in ('comments_set_updated_at', 'comments_set_updated_at_forward')
      and not tgisinternal
  ) then
    create trigger comments_set_updated_at_forward
      before update on public.comments
      for each row execute function public.set_updated_at();
  end if;
end;
$news_comment_triggers$;

create or replace function public.comment_delete(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_author uuid;
  v_state text;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  select c.author_id, c.state into v_author, v_state
  from public.comments c
  where c.id = p_comment_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'comment_not_found';
  end if;
  if v_author is distinct from v_actor then
    raise exception using errcode = '42501', message = 'not_comment_author';
  end if;
  if v_state = 'deleted' then
    return;
  end if;

  update public.comments
  set body = '', state = 'deleted', deleted_at = now()
  where id = p_comment_id;
  perform public.audit_event('member', 'comment.delete', 'comment', p_comment_id, 'success',
    jsonb_build_object('comment_id', p_comment_id));
end;
$$;

create or replace function public.comment_moderate(
  p_comment_id uuid,
  p_action text,
  p_reason text
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
  if p_action not in ('hide', 'restore') then
    raise exception using errcode = '22023', message = 'invalid_action';
  end if;
  if coalesce(char_length(btrim(p_reason)), 0) < 5 or char_length(btrim(p_reason)) > 1000 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;

  select c.state into v_state from public.comments c where c.id = p_comment_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'comment_not_found';
  end if;
  if p_action = 'restore' and v_state = 'deleted' then
    raise exception using errcode = '22023', message = 'deleted_comment_cannot_be_restored';
  end if;

  if p_action = 'hide' then
    update public.comments
    set state = 'hidden', hidden_reason = btrim(p_reason), hidden_by = v_actor, hidden_at = now()
    where id = p_comment_id;
  else
    update public.comments
    set state = 'visible', hidden_reason = null, hidden_by = null, hidden_at = null
    where id = p_comment_id;
  end if;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (v_actor, 'comment', p_comment_id, p_action, btrim(p_reason));
  perform public.audit_event('staff', 'comment.' || p_action, 'comment', p_comment_id, 'success',
    jsonb_build_object('reason', btrim(p_reason)));
end;
$$;

create or replace function public.comment_report_resolve(
  p_report_id uuid,
  p_action text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_comment_id uuid;
begin
  perform public.require_capability('moderation.review');
  if p_action not in ('actioned', 'dismissed') then
    raise exception using errcode = '22023', message = 'invalid_action';
  end if;
  if coalesce(char_length(btrim(p_reason)), 0) < 5 or char_length(btrim(p_reason)) > 1000 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;

  select r.comment_id into v_comment_id
  from public.comment_reports r
  where r.id = p_report_id and r.state = 'open'
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'open_report_not_found';
  end if;

  update public.comment_reports
  set state = p_action, resolved_by = v_actor, resolved_at = now()
  where id = p_report_id;

  -- Report state and audit metadata retain the decision; do not insert disallowed action values.
  perform public.audit_event('staff', 'comment.report.' || p_action, 'comment', v_comment_id, 'success',
    jsonb_build_object('report_id', p_report_id, 'reason', btrim(p_reason)));
end;
$$;

revoke all on function public.comment_delete(uuid) from public, anon, authenticated;
revoke all on function public.comment_moderate(uuid, text, text) from public, anon, authenticated;
revoke all on function public.comment_report_resolve(uuid, text, text) from public, anon, authenticated;
grant execute on function public.comment_delete(uuid) to authenticated;
grant execute on function public.comment_moderate(uuid, text, text) to authenticated;
grant execute on function public.comment_report_resolve(uuid, text, text) to authenticated;

alter table public.comments enable row level security;
alter table public.comment_reports enable row level security;
revoke all on table public.comments from public, anon, authenticated;
revoke all on table public.comment_reports from public, anon, authenticated;

grant select (id, article_id, parent_id, body, state, created_at) on table public.comments to anon, authenticated;
grant insert (article_id, parent_id, author_id, body) on table public.comments to authenticated;
grant update (body) on table public.comments to authenticated;
grant select (id, comment_id, reason, note, state, created_at) on table public.comment_reports to authenticated;
grant insert (comment_id, reporter_id, reason, note) on table public.comment_reports to authenticated;

do $news_comment_policies$
begin
  if not exists (select 1 from pg_policy where polrelid = 'public.comments'::regclass and polname = 'comments_read_public_forward') then
    create policy comments_read_public_forward on public.comments
      for select to anon, authenticated
      using (state = 'visible' and exists (
        select 1 from public.articles a
        where a.id = comments.article_id and a.published_version_id is not null
      ));
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.comments'::regclass and polname = 'comments_read_tombstones_forward') then
    create policy comments_read_tombstones_forward on public.comments
      for select to anon, authenticated
      using (state = 'deleted' and exists (
        select 1 from public.articles a
        where a.id = comments.article_id and a.published_version_id is not null
      ));
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.comments'::regclass and polname = 'comments_read_own_forward') then
    create policy comments_read_own_forward on public.comments
      for select to authenticated using (author_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.comments'::regclass and polname = 'comments_read_staff_forward') then
    create policy comments_read_staff_forward on public.comments
      for select to authenticated using (public.has_capability('moderation.review'));
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.comments'::regclass and polname = 'comments_insert_own_forward') then
    create policy comments_insert_own_forward on public.comments
      for insert to authenticated with check (
        author_id = (select auth.uid())
        and public.is_member_active()
        and not public.is_member_banned()
        and exists (
          select 1 from public.articles a
          where a.id = comments.article_id and a.published_version_id is not null
        )
      );
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.comments'::regclass and polname = 'comments_update_own_forward') then
    create policy comments_update_own_forward on public.comments
      for update to authenticated
      using (
        author_id = (select auth.uid()) and state = 'visible'
        and public.is_member_active() and not public.is_member_banned()
      )
      with check (author_id = (select auth.uid()) and state = 'visible');
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.comments'::regclass and polname = 'comments_read_anon_guard_forward') then
    create policy comments_read_anon_guard_forward on public.comments
      as restrictive for select to anon
      using (
        state in ('visible', 'deleted')
        and exists (
          select 1 from public.articles a
          where a.id = comments.article_id and a.published_version_id is not null
        )
      );
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.comments'::regclass and polname = 'comments_read_member_guard_forward') then
    create policy comments_read_member_guard_forward on public.comments
      as restrictive for select to authenticated
      using (
        (state in ('visible', 'deleted') and exists (
          select 1 from public.articles a
          where a.id = comments.article_id and a.published_version_id is not null
        ))
        or author_id = (select auth.uid())
        or public.has_capability('moderation.review')
      );
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.comments'::regclass and polname = 'comments_insert_member_guard_forward') then
    create policy comments_insert_member_guard_forward on public.comments
      as restrictive for insert to authenticated
      with check (
        author_id = (select auth.uid())
        and public.is_member_active()
        and not public.is_member_banned()
        and exists (
          select 1 from public.articles a
          where a.id = comments.article_id and a.published_version_id is not null
        )
      );
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.comments'::regclass and polname = 'comments_update_member_guard_forward') then
    create policy comments_update_member_guard_forward on public.comments
      as restrictive for update to authenticated
      using (
        author_id = (select auth.uid()) and state = 'visible'
        and public.is_member_active() and not public.is_member_banned()
      )
      with check (author_id = (select auth.uid()) and state = 'visible');
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.comment_reports'::regclass and polname = 'comment_reports_insert_own_forward') then
    create policy comment_reports_insert_own_forward on public.comment_reports
      for insert to authenticated with check (
        reporter_id = (select auth.uid())
        and public.is_member_active()
        and not public.is_member_banned()
        and exists (
          select 1 from public.comments c
          join public.articles a on a.id = c.article_id
          where c.id = comment_reports.comment_id
            and c.state = 'visible'
            and a.published_version_id is not null
        )
      );
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.comment_reports'::regclass and polname = 'comment_reports_read_own_forward') then
    create policy comment_reports_read_own_forward on public.comment_reports
      for select to authenticated using (reporter_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.comment_reports'::regclass and polname = 'comment_reports_read_staff_forward') then
    create policy comment_reports_read_staff_forward on public.comment_reports
      for select to authenticated using (public.has_capability('moderation.review'));
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.comment_reports'::regclass and polname = 'comment_reports_insert_guard_forward') then
    create policy comment_reports_insert_guard_forward on public.comment_reports
      as restrictive for insert to authenticated with check (
        reporter_id = (select auth.uid())
        and public.is_member_active()
        and not public.is_member_banned()
        and exists (
          select 1 from public.comments c
          join public.articles a on a.id = c.article_id
          where c.id = comment_reports.comment_id
            and c.state = 'visible'
            and a.published_version_id is not null
        )
      );
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.comment_reports'::regclass and polname = 'comment_reports_read_guard_forward') then
    create policy comment_reports_read_guard_forward on public.comment_reports
      as restrictive for select to authenticated
      using (reporter_id = (select auth.uid()) or public.has_capability('moderation.review'));
  end if;
end;
$news_comment_policies$;

-- Access is further constrained by the restrictive reconciliation policies above.
-- Public projections omit moderation-only fields and reporter identities.
-- This migration intentionally seeds no comments, reports, or other content.
