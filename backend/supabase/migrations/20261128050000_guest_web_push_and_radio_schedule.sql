-- Guest Web Push devices, scheduled radio pushes, and grant hardening.
--
-- Additive and non-destructive:
--   * web_push_devices: one row per browser subscription, member OR guest.
--     The endpoint and both browser keys are AES-256-GCM encrypted by the app
--     before they reach the database (lib/push-crypto.ts); lookups use an HMAC
--     of the endpoint, so a copy of this table alone cannot be used to send
--     anything or to identify anyone. No grants to anon/authenticated: only the
--     service role (server routes) can touch it.
--   * push_scheduled_sends: a queue the database fills at programme start
--     times; /api/push/scheduled claims due rows and delivers them.
--   * pg_cron + pg_net: a once-a-minute database tick enqueues radio slots that
--     start this minute (Africa/Lagos) and pings the site to deliver them.
--   * Grant hardening: removes write privileges that RLS already blocked but
--     that should never have been granted (TRUNCATE is not governed by RLS),
--     and stops signed-in members reading the primary_administrators view
--     (owner emails), which no app code reads with a member session.
-- The legacy member-only push_subscriptions table is left untouched and is
-- still delivered to, so existing subscribers keep working.

-- Guarded so the migration also runs where the extensions are unavailable
-- (local PGlite schema tests); on Supabase both are available and installed.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create schema if not exists extensions;
    create extension if not exists pg_net with schema extensions;
  end if;
end;
$$;

create table if not exists public.web_push_devices (
  id uuid primary key default gen_random_uuid(),
  endpoint_hash text not null unique check (endpoint_hash ~ '^[a-f0-9]{64}$'),
  endpoint_enc text not null check (length(endpoint_enc) between 32 and 8192),
  p256dh_enc text not null check (length(p256dh_enc) between 32 and 2048),
  auth_enc text not null check (length(auth_enc) between 32 and 2048),
  key_version smallint not null default 1 check (key_version between 1 and 100),
  user_id uuid references auth.users(id) on delete cascade,
  push_news boolean not null default false,
  push_radio boolean not null default false,
  failed_count integer not null default 0 check (failed_count >= 0),
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists web_push_devices_news_idx on public.web_push_devices (id) where push_news;
create index if not exists web_push_devices_radio_idx on public.web_push_devices (id) where push_radio;
create index if not exists web_push_devices_user_idx on public.web_push_devices (user_id) where user_id is not null;

alter table public.web_push_devices enable row level security;
revoke all on public.web_push_devices from public, anon, authenticated;
grant select, insert, update, delete on public.web_push_devices to service_role;

comment on table public.web_push_devices is
  'Browser push subscriptions (members and guests). endpoint/p256dh/auth are app-encrypted (AES-256-GCM); endpoint_hash is an HMAC used for lookups. Service role only.';

create table if not exists public.push_scheduled_sends (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique check (length(dedupe_key) between 3 and 200),
  kind text not null check (kind in ('radio_live', 'news_published')),
  title text not null check (length(title) between 1 and 140),
  body text not null check (length(body) between 1 and 1000),
  url text check (url is null or (url ~ '^/[A-Za-z0-9/_?=&%.-]*$' and length(url) <= 300)),
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  claimed_at timestamptz,
  finished_at timestamptz,
  sent integer not null default 0,
  failed integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists push_scheduled_sends_due_idx on public.push_scheduled_sends (due_at) where status = 'pending';

alter table public.push_scheduled_sends enable row level security;
revoke all on public.push_scheduled_sends from public, anon, authenticated;
grant select, insert, update, delete on public.push_scheduled_sends to service_role;

-- Where the database should ping to deliver due pushes. Change the row if the
-- production domain changes (e.g. to https://epelawa.com).
create table if not exists public.push_schedule_settings (
  id smallint primary key default 1 check (id = 1),
  site_origin text not null check (site_origin ~ '^https://[a-z0-9.-]+(:[0-9]+)?$'),
  radio_fallback_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.push_schedule_settings (id, site_origin) values (1, 'https://epelawa.vercel.app')
  on conflict (id) do nothing;
alter table public.push_schedule_settings enable row level security;
revoke all on public.push_schedule_settings from public, anon, authenticated;
grant select, update on public.push_schedule_settings to service_role;

-- Runs every minute from pg_cron. Enqueues a radio push for any published
-- programme slot starting in the last two minutes (Lagos time). When no slot is
-- published, falls back to the client-provided flyer time used across the site
-- (Thursday 13:30 WAT, lib/radio-reminder.ts). The dedupe key makes repeats
-- harmless; the site is only pinged when something new is due.
create or replace function public.push_radio_tick()
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_lagos timestamp := (now() at time zone 'Africa/Lagos');
  v_dow smallint := extract(dow from v_lagos)::smallint;
  v_minute time := date_trunc('minute', v_lagos)::time;
  v_inserted integer := 0;
  v_rows integer := 0;
  v_published integer := 0;
  v_origin text;
  v_fallback boolean;
begin
  select site_origin, radio_fallback_enabled into v_origin, v_fallback from public.push_schedule_settings where id = 1;

  select count(*) into v_published
  from public.radio_schedule s join public.programmes p on p.id = s.programme_id
  where s.publication_status = 'published' and p.is_active and p.publication_status = 'published';

  if v_published > 0 then
    insert into public.push_scheduled_sends (dedupe_key, kind, title, body, url, due_at)
    select
      'radio:' || s.id::text || ':' || to_char(v_lagos, 'YYYY-MM-DD'),
      'radio_live',
      left(p.name || ' is on air', 140),
      'EPE LAWA Radio is live now. Tap to listen.',
      '/radio',
      now()
    from public.radio_schedule s join public.programmes p on p.id = s.programme_id
    where s.publication_status = 'published' and p.is_active and p.publication_status = 'published'
      and s.day_of_week = v_dow
      and s.starts_at <= v_minute
      and s.starts_at > v_minute - interval '2 minutes'
    on conflict (dedupe_key) do nothing;
    get diagnostics v_inserted = row_count;
  elsif coalesce(v_fallback, false) and v_dow = 4 and v_minute >= time '13:30' and v_minute < time '13:32' then
    insert into public.push_scheduled_sends (dedupe_key, kind, title, body, url, due_at)
    values ('radio:flyer:' || to_char(v_lagos, 'YYYY-MM-DD'), 'radio_live', 'EPE LAWA Radio is on air',
            'The Thursday 1:30 pm programme is starting now. Tap to listen.', '/radio', now())
    on conflict (dedupe_key) do nothing;
    get diagnostics v_inserted = row_count;
  end if;

  select count(*) into v_rows from public.push_scheduled_sends where status = 'pending' and due_at <= now();
  if v_rows > 0 and v_origin is not null then
    perform net.http_post(
      url := v_origin || '/api/push/scheduled',
      body := '{}'::jsonb,
      headers := '{"content-type":"application/json"}'::jsonb,
      timeout_milliseconds := 5000
    );
  end if;
  return v_inserted;
end;
$$;

revoke all on function public.push_radio_tick() from public, anon, authenticated;

-- Claims due sends atomically so overlapping deliveries never double-send.
-- Sends that are more than 30 minutes late are skipped rather than delivered
-- ("on air now" is useless an hour later).
create or replace function public.push_scheduled_claim()
returns setof public.push_scheduled_sends
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.push_scheduled_sends set status = 'skipped', finished_at = now()
  where status = 'pending' and due_at < now() - interval '30 minutes';
  update public.push_scheduled_sends set status = 'pending', claimed_at = null
  where status = 'sending' and claimed_at < now() - interval '10 minutes';
  return query
  update public.push_scheduled_sends q set status = 'sending', claimed_at = now()
  where q.id in (
    select id from public.push_scheduled_sends
    where status = 'pending' and due_at <= now()
    order by due_at
    limit 5
    for update skip locked
  )
  returning q.*;
end;
$$;

revoke all on function public.push_scheduled_claim() from public, anon, authenticated;
grant execute on function public.push_scheduled_claim() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'epe-radio-push-tick') then
      perform cron.unschedule('epe-radio-push-tick');
    end if;
    perform cron.schedule('epe-radio-push-tick', '* * * * *', 'select public.push_radio_tick()');
  end if;
end;
$$;

-- Grant hardening ---------------------------------------------------------
-- Views are read-only; writes were never possible, but the grants are removed
-- so nothing depends on them.
revoke insert, update, delete, truncate, references, trigger on
  public.active_business_sponsorships, public.forum_poll_results, public.published_article_engagement,
  public.published_articles, public.published_businesses, public.published_people, public.radio_status
  from anon, authenticated;
-- TRUNCATE bypasses RLS entirely; no client role needs it.
revoke truncate, references, trigger on public.site_pages, public.saved_articles from anon, authenticated;
revoke insert, update, delete on public.site_pages from anon;
-- Owner emails: staff code reads this through security-definer functions only.
revoke all on public.primary_administrators from anon, authenticated;
