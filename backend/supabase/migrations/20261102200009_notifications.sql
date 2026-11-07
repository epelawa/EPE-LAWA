-- EPE LAWA — M9: notifications and push subscriptions.
--
-- Nothing here sends anything. This is storage only: what a member opted into, which devices
-- they registered, and what the platform has already told them.
--
-- Push opt-in is explicit and per category. In-app defaults follow docs/07-database-schema.md §9;
-- push defaults are all false, because a browser permission prompt that arrives because somebody
-- registered an account is not consent (docs/10-integrations.md §7).

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(user_id) on delete cascade,
  -- The endpoint is a capability URL: whoever holds it can push to that device. It is never
  -- public and it is revoked on logout.
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  failed_count integer not null default 0,
  last_used_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint push_subscriptions_endpoint_https check (endpoint ~ '^https://'),
  constraint push_subscriptions_failed_count check (failed_count >= 0),
  constraint push_subscriptions_user_agent_length check (user_agent is null or char_length(user_agent) <= 500)
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table if not exists public.notification_preferences (
  user_id      uuid primary key references public.profiles(user_id) on delete cascade,
  in_app_news     boolean not null default true,
  in_app_radio    boolean not null default false,
  in_app_comments boolean not null default true,
  in_app_forum    boolean not null default false,
  push_news       boolean not null default false,
  push_radio      boolean not null default false,
  push_comments   boolean not null default false,
  push_forum      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(user_id) on delete cascade,
  kind          text not null,
  title         text not null,
  body          text not null,
  url           text,
  resource_type text,
  resource_id   uuid,
  read_at       timestamptz,
  created_at    timestamptz not null default now(),
  constraint notifications_kind check (
    kind in ('comment_reply', 'forum_reply', 'news_published', 'radio_live', 'order_status', 'moderation')
  ),
  constraint notifications_title_length check (char_length(btrim(title)) between 1 and 140),
  constraint notifications_body_length check (char_length(body) between 1 and 1000),
  -- In-app notification links are literal same-site paths, never absolute URLs. An absolute URL
  -- in a notification is an open redirect waiting to be written.
  constraint notifications_url_relative check (
    url is null or (url ~ '^/[A-Za-z0-9/_?=&%.-]*$' and url !~ '^//')
  )
);

-- The unread badge and the notification list are the only two reads.
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

------------------------------------------------------------------------------
-- updated_at
------------------------------------------------------------------------------

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- RLS — every row here belongs to exactly one member, and only that member
------------------------------------------------------------------------------

alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;

revoke all on table public.push_subscriptions from public, anon, authenticated;
revoke all on table public.notification_preferences from public, anon, authenticated;
revoke all on table public.notifications from public, anon, authenticated;

grant select, insert, delete on table public.push_subscriptions to authenticated;
grant update (user_agent, failed_count, last_used_at) on table public.push_subscriptions to authenticated;

grant select on table public.notification_preferences to authenticated;
grant insert, update on table public.notification_preferences to authenticated;

grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

drop policy if exists push_subscriptions_own_select on public.push_subscriptions;
create policy push_subscriptions_own_select on public.push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists push_subscriptions_own_insert on public.push_subscriptions;
create policy push_subscriptions_own_insert on public.push_subscriptions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member_active());

drop policy if exists push_subscriptions_own_delete on public.push_subscriptions;
create policy push_subscriptions_own_delete on public.push_subscriptions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Updates are limited by column grant to user_agent / failed_count / last_used_at, so a member
-- cannot re-point an existing subscription at a different user_id.
drop policy if exists push_subscriptions_own_update on public.push_subscriptions;
create policy push_subscriptions_own_update on public.push_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists notification_preferences_own_select on public.notification_preferences;
create policy notification_preferences_own_select on public.notification_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists notification_preferences_own_insert on public.notification_preferences;
create policy notification_preferences_own_insert on public.notification_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member_active());

drop policy if exists notification_preferences_own_update on public.notification_preferences;
create policy notification_preferences_own_update on public.notification_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists notifications_own_select on public.notifications;
create policy notifications_own_select on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists notifications_own_mark_read on public.notifications;
create policy notifications_own_mark_read on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No INSERT grant or policy for anyone: a member who could insert their own notifications could
-- forge a "your order shipped" message. Creation happens in server code with the service role.
-- No DELETE either; read_at is the only mutable column.
