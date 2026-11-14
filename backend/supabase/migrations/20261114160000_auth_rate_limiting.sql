-- Persistent auth throttling. Callers supply HMAC-SHA256 digests, never raw identifiers.
-- The service-role-only RPC atomically counts independent email and trusted-IP buckets.
create table if not exists public.auth_rate_limit_buckets (
  flow text not null check (flow in ('signup','signin','otp_verify','otp_resend','recovery')),
  subject_hash text not null check (subject_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0),
  primary key (flow, subject_hash)
);
alter table public.auth_rate_limit_buckets enable row level security;
revoke all on table public.auth_rate_limit_buckets from public, anon, authenticated;
create index if not exists auth_rate_limit_window_idx on public.auth_rate_limit_buckets(window_started_at);

-- Private atomic bucket primitive; only the owning definer function can call it.
create or replace function public._consume_auth_rate_limit_bucket(
  p_flow text,
  p_subject_hash text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
begin
  if p_flow is null or p_flow not in ('signup','signin','otp_verify','otp_resend','recovery')
     or p_subject_hash is null or p_subject_hash !~ '^[a-f0-9]{64}$'
     or p_limit is null or p_limit < 1 or p_limit > 1000
     or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid auth limiter bucket arguments';
  end if;

  insert into public.auth_rate_limit_buckets(flow, subject_hash, window_started_at, attempts)
  values (p_flow, p_subject_hash, v_now, 1)
  on conflict (flow, subject_hash) do update
    set attempts = case
          when public.auth_rate_limit_buckets.window_started_at <= v_now - make_interval(secs => p_window_seconds) then 1
          else public.auth_rate_limit_buckets.attempts + 1
        end,
        window_started_at = case
          when public.auth_rate_limit_buckets.window_started_at <= v_now - make_interval(secs => p_window_seconds) then v_now
          else public.auth_rate_limit_buckets.window_started_at
        end
  returning attempts into v_count;
  return v_count <= p_limit;
end;
$$;
revoke all on function public._consume_auth_rate_limit_bucket(text,text,integer,integer) from public, anon, authenticated;

create or replace function public.consume_auth_rate_limit(
  p_email_hash text,
  p_ip_hash text,
  p_flow text,
  p_email_limit integer,
  p_email_window_seconds integer,
  p_ip_limit integer,
  p_ip_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ip_allowed boolean;
begin
  if p_flow is null or p_flow not in ('signup','signin','otp_verify','otp_resend','recovery')
     or p_email_hash is null or p_email_hash !~ '^[a-f0-9]{64}$'
     or (p_ip_hash is not null and p_ip_hash !~ '^[a-f0-9]{64}$')
     or p_email_limit is null or p_email_limit < 1 or p_email_limit > 100
     or p_email_window_seconds is null or p_email_window_seconds < 1 or p_email_window_seconds > 86400
     or p_ip_limit is null or p_ip_limit < 1 or p_ip_limit > 1000
     or p_ip_window_seconds is null or p_ip_window_seconds < 1 or p_ip_window_seconds > 86400 then
    raise exception 'invalid auth limiter arguments';
  end if;

  -- Bounded cleanup is part of each request, so stale rows do not accumulate forever.
  -- Only 100 expired rows are pruned per call; a short indexed scan stays cost-conscious.
  with stale as (
    select flow, subject_hash
    from public.auth_rate_limit_buckets
    where window_started_at < clock_timestamp() - interval '2 days'
    order by window_started_at
    limit 100
    for update skip locked
  )
  delete from public.auth_rate_limit_buckets as bucket
  using stale
  where bucket.flow = stale.flow and bucket.subject_hash = stale.subject_hash;

  -- Check the IP first so requests blocked at the network bucket do not create an
  -- unbounded number of new per-email rows by rotating email addresses.
  if p_ip_hash is not null then
    v_ip_allowed := public._consume_auth_rate_limit_bucket(
      p_flow, p_ip_hash, p_ip_limit, p_ip_window_seconds
    );
    if not v_ip_allowed then return false; end if;
  end if;

  return public._consume_auth_rate_limit_bucket(
    p_flow, p_email_hash, p_email_limit, p_email_window_seconds
  );
end;
$$;
revoke all on function public.consume_auth_rate_limit(text,text,text,integer,integer,integer,integer) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.consume_auth_rate_limit(text,text,text,integer,integer,integer,integer) to service_role';
  end if;
end;
$$;
