-- EPE LAWA — push subscription registration RPC ('push_subscribe' rate scope plus register function).
--
-- Completes the storage half of web push: the authenticated subscribe route calls
-- push_subscription_register instead of writing to public.push_subscriptions directly,
-- so user_id always comes from the caller's session and never from the client.
-- Endpoint is a capability URL: an endpoint arriving from another account's device is
-- re-pointed at the current session by explicit server logic here, never via client data.
--
-- Rate limiting reuses public.form_rate_limit with a new 'push_subscribe' hourly scope
-- (20261119012000_form_rate_limits.sql / 20261122010000_form_rate_scope_widen.sql).

alter table public.form_rate_buckets drop constraint if exists form_rate_buckets_scope_check;
alter table public.form_rate_buckets add constraint form_rate_buckets_scope_check
  check (scope in (
    'newsletter', 'enquiry',
    'auth_signup', 'auth_signin', 'auth_reset', 'auth_otp', 'auth_resend',
    'business_submit', 'tourism_submit', 'gallery_submit', 'history_submit',
    'forum_post', 'push_subscribe'
  ));

drop function if exists public.form_rate_limit(text, text, integer, integer);
drop function if exists public.form_rate_limit(text, text);
create function public.form_rate_limit(
  p_scope text,
  p_fingerprint text,
  p_limit integer default 5,
  p_global_limit integer default 100
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_bucket timestamptz := pg_catalog.date_trunc('hour', now()); global_count integer; client_count integer;
begin
  if p_scope is null
    or p_scope not in (
      'newsletter', 'enquiry',
      'auth_signup', 'auth_signin', 'auth_reset', 'auth_otp', 'auth_resend',
      'business_submit', 'tourism_submit', 'gallery_submit', 'history_submit',
      'forum_post', 'push_subscribe'
    )
    or p_fingerprint is null
    or p_fingerprint !~ '^[a-f0-9]{64}$'
    or p_limit is null or p_limit < 1 or p_limit > 50
    or p_global_limit is null or p_global_limit < 1 or p_global_limit > 10000
  then return false; end if;
  -- Serialize a scope's counters to avoid exceeding the global budget under race.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('form-limit:' || p_scope, 0));
  select requests into global_count from public.form_rate_buckets where scope = p_scope and bucket = current_bucket and fingerprint = 'global';
  select requests into client_count from public.form_rate_buckets where scope = p_scope and bucket = current_bucket and fingerprint = p_fingerprint;
  if coalesce(global_count, 0) >= p_global_limit or coalesce(client_count, 0) >= p_limit then return false; end if;
  insert into public.form_rate_buckets(scope,bucket,fingerprint,requests) values(p_scope,current_bucket,'global',1),(p_scope,current_bucket,p_fingerprint,1)
    on conflict(scope,bucket,fingerprint) do update set requests = public.form_rate_buckets.requests + 1;
  return true;
end; $$;
revoke all on function public.form_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.form_rate_limit(text, text, integer, integer) to service_role;

-- Register (or refresh) this browser's push subscription for the signed-in member.
-- Security definer is needed to re-point a stale endpoint recorded under a different
-- member (RLS hides those rows from every session); the membership check is repeated
-- here because definer bypasses the table's insert policy.
create or replace function public.push_subscription_register(
  p_endpoint  text,
  p_p256dh    text,
  p_auth      text,
  p_user_agent text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_member_active() then return false; end if;
  if p_endpoint is null
     or p_endpoint !~ '^https://'
     or p_endpoint ~ '^https://localhost'
     or char_length(p_endpoint) > 2048
     or p_p256dh is null or p_p256dh !~ '^[A-Za-z0-9_-]{40,512}$'
     or p_auth is null or p_auth !~ '^[A-Za-z0-9_-]{8,512}$'
  then return false; end if;
  if p_user_agent is not null and char_length(p_user_agent) > 500 then
    p_user_agent := left(p_user_agent, 500);
  end if;

  delete from public.push_subscriptions where endpoint = p_endpoint and user_id <> (select auth.uid());

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, last_used_at)
    values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, p_user_agent, now())
    on conflict (endpoint) do update
      set p256dh = excluded.p256dh,
          auth = excluded.auth,
          user_agent = excluded.user_agent,
          failed_count = 0,
          last_used_at = now();

  return true;
end;
$$;
revoke all on function public.push_subscription_register(text, text, text, text) from public, anon, authenticated;
grant execute on function public.push_subscription_register(text, text, text, text) to authenticated;
