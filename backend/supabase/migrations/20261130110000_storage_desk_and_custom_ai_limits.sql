-- Storage desk + custom AI limits.
--
-- 1. AI Scheduler limits accept custom values (not only the preset choices):
--    news every 10 minutes .. 7 days, 1..20 stories per run, 5..10000 model
--    requests per day, 0..50 pushes per day.
-- 2. `news_times`: optional exact daily times for news runs (Lagos time).
-- 3. `news_owed`: when a news run reaches its time limit before writing the
--    number of stories the administrators asked for, the remainder is carried
--    to the next 5-minute pass, so the AI follows the chosen "stories per run".
-- 4. Storage desk: job log with live progress, the list of objects already
--    compressed, the database size, and a scan that tells which R2 object
--    keys are still referenced by site content (so cleanup never removes an
--    image a live page uses). All of it is server-only (service_role).

alter table public.ai_settings drop constraint if exists ai_settings_news_interval_minutes_check;
alter table public.ai_settings drop constraint if exists ai_settings_articles_per_run_check;
alter table public.ai_settings drop constraint if exists ai_settings_daily_request_budget_check;
alter table public.ai_settings drop constraint if exists ai_settings_push_daily_limit_check;
alter table public.ai_settings add constraint ai_settings_news_interval_minutes_check check (news_interval_minutes between 10 and 10080);
alter table public.ai_settings add constraint ai_settings_articles_per_run_check check (articles_per_run between 1 and 20);
alter table public.ai_settings add constraint ai_settings_daily_request_budget_check check (daily_request_budget between 5 and 10000);
alter table public.ai_settings add constraint ai_settings_push_daily_limit_check check (push_daily_limit between 0 and 50);

alter table public.ai_settings add column if not exists news_owed integer not null default 0;
alter table public.ai_settings drop constraint if exists ai_settings_news_owed_check;
alter table public.ai_settings add constraint ai_settings_news_owed_check check (news_owed between 0 and 20);

-- Custom news times: when set (Lagos HH:MM, up to 24), news runs at exactly
-- these times every day instead of every N minutes.
alter table public.ai_settings add column if not exists news_times text[] not null default '{}'::text[];
alter table public.ai_settings drop constraint if exists ai_settings_news_times_check;
alter table public.ai_settings add constraint ai_settings_news_times_check check (
  cardinality(news_times) <= 24
  and (cardinality(news_times) = 0 or array_to_string(news_times, ',') ~ '^([01][0-9]|2[0-3]):[0-5][0-9](,([01][0-9]|2[0-3]):[0-5][0-9])*$')
);

-- Saved right after ai_admin_save by the AI Scheduler form. A new schedule or
-- a new "stories per run" starts clean, so nothing owed from before carries over.
create or replace function public.ai_news_schedule_save(p_news_times text[])
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare v_times text[];
begin
  if not coalesce(public.staff_roles_authorized(), false) then
    raise exception using errcode = '42501', message = 'ai_settings_forbidden';
  end if;
  select coalesce(array_agg(distinct t order by t), '{}'::text[]) into v_times
    from unnest(coalesce(p_news_times, '{}'::text[])) t
   where t ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$';
  if cardinality(v_times) > 24 then
    raise exception using errcode = '22023', message = 'too_many_news_times';
  end if;
  update public.ai_settings set news_times = v_times, news_owed = 0 where id = 1;
end $$;
revoke all on function public.ai_news_schedule_save(text[]) from public, anon;
grant execute on function public.ai_news_schedule_save(text[]) to authenticated;

create table if not exists public.storage_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('cleanup', 'compress')),
  scope text not null check (char_length(scope) between 1 and 60),
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  progress text check (progress is null or char_length(progress) <= 300),
  stats jsonb not null default '{}'::jsonb check (jsonb_typeof(stats) = 'object'),
  started_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists storage_jobs_started_idx on public.storage_jobs (started_at desc);
create index if not exists storage_jobs_started_by_idx on public.storage_jobs (started_by);
drop trigger if exists storage_jobs_set_updated_at on public.storage_jobs;
create trigger storage_jobs_set_updated_at before update on public.storage_jobs
  for each row execute function public.set_updated_at();
alter table public.storage_jobs enable row level security;
revoke all on table public.storage_jobs from public, anon, authenticated;
grant all on table public.storage_jobs to service_role;

create table if not exists public.storage_compressed (
  bucket text not null check (bucket in ('public', 'private')),
  object_key text not null check (char_length(object_key) between 1 and 1024),
  bytes_before bigint not null check (bytes_before >= 0),
  bytes_after bigint not null check (bytes_after >= 0),
  compressed_at timestamptz not null default now(),
  primary key (bucket, object_key)
);
alter table public.storage_compressed enable row level security;
revoke all on table public.storage_compressed from public, anon, authenticated;
grant all on table public.storage_compressed to service_role;

-- Database size for the storage chart (Supabase free plan: 500 MB).
create or replace function public.storage_db_usage()
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  select jsonb_build_object(
    'database_bytes', pg_catalog.pg_database_size(pg_catalog.current_database()),
    'tables', coalesce((
      select jsonb_agg(jsonb_build_object('name', t.name, 'bytes', t.bytes) order by t.bytes desc)
        from (
          select c.relname::text as name, pg_catalog.pg_total_relation_size(c.oid) as bytes
            from pg_catalog.pg_class c
            join pg_catalog.pg_namespace n on n.oid = c.relnamespace
           where c.relkind in ('r', 'p') and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
           order by 2 desc
           limit 8
        ) t
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.storage_db_usage() from public, anon, authenticated;
grant execute on function public.storage_db_usage() to service_role;

-- Which of the given object keys appear anywhere in site content. Logs,
-- counters and throttles are skipped so a deleted item's audit trail never
-- keeps its file alive. Everything else (all article versions and bodies,
-- businesses, people, events, history, tourism, site pages, profiles…) counts.
create or replace function public.storage_keys_in_use(p_keys text[])
returns text[]
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_left text[] := coalesce(p_keys, '{}'::text[]);
  v_found text[] := '{}'::text[];
  v_hit text[];
  r record;
begin
  if cardinality(v_left) = 0 then
    return v_found;
  end if;
  if cardinality(v_left) > 20000 then
    raise exception using errcode = '22023', message = 'too_many_keys';
  end if;
  for r in
    select c.relname
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p')
       and c.relname not in (
         'admin_activity_log', 'admin_activity_summaries', 'ai_activity', 'ai_model_calls', 'ai_runs', 'ai_news_seen',
         'ai_tick_nonces', 'article_views', 'audit_events', 'auth_rate_limit_buckets', 'auth_signin_throttle',
         'business_contact_clicks', 'cron_job_history', 'form_rate_buckets', 'human_check_spent', 'reader_presence',
         'stream_status_checks', 'storage_jobs', 'storage_compressed', 'web_push_devices', 'push_subscriptions',
         'article_likes', 'comment_votes', 'comment_guest_votes', 'forum_reactions', 'forum_thread_reads'
       )
  loop
    exit when cardinality(v_left) = 0;
    execute format(
      'select coalesce(array_agg(distinct k), ''{}'') from unnest($1) k where exists (select 1 from public.%I t where strpos(t::text, k) > 0)',
      r.relname
    ) into v_hit using v_left;
    if cardinality(v_hit) > 0 then
      v_found := v_found || v_hit;
      v_left := array(select k from unnest(v_left) k where not (k = any (v_hit)));
    end if;
  end loop;
  return v_found;
end $$;
revoke all on function public.storage_keys_in_use(text[]) from public, anon, authenticated;
grant execute on function public.storage_keys_in_use(text[]) to service_role;
