-- EPE LAWA - Cron Job History Table
-- Tracks execution history of scheduled jobs (health checks, database pings, etc.)

create table if not exists public.cron_job_history (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  details jsonb,
  error_message text,
  constraint cron_job_history_status check (status in ('started', 'success', 'failed', 'timeout'))
);

create index if not exists cron_job_history_job_idx on public.cron_job_history (job_name);
create index if not exists cron_job_history_status_idx on public.cron_job_history (status);
create index if not exists cron_job_history_time_idx on public.cron_job_history (started_at desc);

-- Grant read access to authenticated users for admin viewing
alter publication supabase_realtime add table public.cron_job_history;

-- RLS Policies
revoke all on public.cron_job_history from anon, authenticated;

grant select on public.cron_job_history to authenticated;
grant insert, update on public.cron_job_history to service_role;

-- Function to record a cron job start
create or replace function public.cron_job_start(p_job_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.cron_job_history (job_name, status, started_at)
  values (p_job_name, 'started', now())
  returning id into strict result;
  return result;
end;
$$;

-- Function to record a cron job completion
create or replace function public.cron_job_complete(
  p_job_id uuid,
  p_status text,
  p_error_message text default null,
  p_details jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.cron_job_history
  set
    status = p_status,
    completed_at = now(),
    duration_ms = extract(epoch from (now() - started_at)) * 1000,
    error_message = p_error_message,
    details = p_details
  where id = p_job_id;
end;
$$;

-- Function to get recent cron job history
create or replace function public.get_cron_job_history(p_limit integer default 100)
returns setof public.cron_job_history
language sql
security definer
set search_path = ''
as $$
  select * from public.cron_job_history
  order by started_at desc
  limit p_limit;
$$;

-- Function to get cron job stats
create or replace function public.get_cron_job_stats()
returns table (
  job_name text,
  total_runs bigint,
  success_count bigint,
  failure_count bigint,
  avg_duration_ms double precision,
  last_run timestamptz,
  last_status text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select
    h.job_name,
    count(*) as total_runs,
    sum(case when h.status = 'success' then 1 else 0 end) as success_count,
    sum(case when h.status = 'failed' then 1 else 0 end) as failure_count,
    avg(h.duration_ms) as avg_duration_ms,
    max(h.started_at) as last_run,
    (select h2.status from public.cron_job_history h2 where h2.job_name = h.job_name order by h2.started_at desc limit 1) as last_status
  from public.cron_job_history h
  group by h.job_name
  order by h.job_name;
end;
$$;

comment on table public.cron_job_history is 'Tracks execution history of scheduled cron jobs for monitoring and debugging';
comment on column public.cron_job_history.job_name is 'Name of the cron job (e.g., health_check, database_ping)';
comment on column public.cron_job_history.status is 'Job status: started, success, failed, timeout';
comment on column public.cron_job_history.duration_ms is 'Duration of job execution in milliseconds';
comment on column public.cron_job_history.details is 'Additional job-specific details stored as JSON';
comment on column public.cron_job_history.error_message is 'Error message if job failed';
