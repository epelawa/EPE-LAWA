-- Trusted-server rate covering every public form family. The browser can never reach
-- this function: it is granted to service_role only and fingerprints are HMACs of the
-- edge-provided client address (see formClientKey in the web apps).
--
-- New scopes (each hour window, per fingerprint): auth signup/sign-in/password-reset,
-- the OTP verify + resend calls, and the public submission forms (business, tourism,
-- gallery, history). newsletter/enquiry keep their original budgets via defaults.
alter table public.form_rate_buckets drop constraint if exists form_rate_buckets_scope_check;
alter table public.form_rate_buckets add constraint form_rate_buckets_scope_check
  check (scope in (
    'newsletter', 'enquiry',
    'auth_signup', 'auth_signin', 'auth_reset', 'auth_otp', 'auth_resend',
    'business_submit', 'tourism_submit', 'gallery_submit', 'history_submit',
    'forum_post'
  ));

-- p_limit / p_global_limit tune the per-client and global hourly budgets per call
-- (sign-in allows more legitimate retries than a broadcast form; bots still hit the wall).
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
      'forum_post'
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
