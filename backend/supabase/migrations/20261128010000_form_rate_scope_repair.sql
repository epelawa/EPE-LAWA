-- EPE LAWA — repair the form rate-limit scope allowlist. Forward-only, additive.
--
-- Why: public.form_rate_limit() returns false for any scope missing from its
-- allowlist, and the app treats false as "rate limited" (fail closed on Vercel).
-- 20261124130000_push_subscription_register.sql re-created the function with a
-- shorter list, which silently dropped scopes added by earlier migrations. Since
-- then these production forms always answered "Too many attempts from this
-- network": event submission, song requests, business claims, moderation
-- appeals, password change and news correction reports.
-- 20261128000000 also re-wrote the table CHECK without auth_password_change /
-- push_subscribe / article_correction. This migration restores one complete list
-- in both places. Keep the two lists identical when adding a scope.

alter table public.form_rate_buckets drop constraint if exists form_rate_buckets_scope_check;
alter table public.form_rate_buckets add constraint form_rate_buckets_scope_check
  check (scope in (
    'newsletter', 'enquiry',
    'auth_signup', 'auth_signin', 'auth_reset', 'auth_otp', 'auth_resend', 'auth_password_change',
    'business_submit', 'business_claim', 'tourism_submit', 'gallery_submit',
    'history_submit', 'history_correction', 'event_submit', 'article_correction',
    'forum_post', 'song_request', 'moderation_appeal', 'push_subscribe', 'image_upload'
  ));

create or replace function public.form_rate_limit(p_scope text, p_fingerprint text, p_limit integer default 5, p_global_limit integer default 100)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare current_bucket timestamptz := pg_catalog.date_trunc('hour', now()); global_count integer; client_count integer;
begin
  if p_scope is null
    or p_scope not in (
      'newsletter', 'enquiry',
      'auth_signup', 'auth_signin', 'auth_reset', 'auth_otp', 'auth_resend', 'auth_password_change',
      'business_submit', 'business_claim', 'tourism_submit', 'gallery_submit',
      'history_submit', 'history_correction', 'event_submit', 'article_correction',
      'forum_post', 'song_request', 'moderation_appeal', 'push_subscribe', 'image_upload'
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
end; $function$;

revoke all on function public.form_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.form_rate_limit(text, text, integer, integer) to service_role;
