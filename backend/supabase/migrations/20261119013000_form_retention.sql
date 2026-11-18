-- Candidate bounded retention primitive; not scheduled or applied automatically.
-- Subscriber and enquiry records are deliberately outside its scope.
create or replace function public.purge_expired_form_data()
returns table(pending_deleted bigint, cooldowns_deleted bigint, buckets_deleted bigint)
language plpgsql security definer set search_path = '' as $$
begin
  with candidates as (
    select confirmation_hash from public.newsletter_pending_confirmations
    where expires_at < now() - interval '1 day' order by expires_at limit 1000
    for update skip locked
  ), removed as (
    delete from public.newsletter_pending_confirmations p using candidates c
    where p.confirmation_hash = c.confirmation_hash returning 1
  ) select count(*) into pending_deleted from removed;

  with candidates as (
    select email from public.newsletter_request_cooldowns
    where last_requested_at < now() - interval '1 day' order by last_requested_at limit 1000
    for update skip locked
  ), removed as (
    delete from public.newsletter_request_cooldowns p using candidates c
    where p.email = c.email returning 1
  ) select count(*) into cooldowns_deleted from removed;

  with candidates as (
    select scope, bucket, fingerprint from public.form_rate_buckets
    where bucket < now() - interval '2 days' order by bucket limit 1000
    for update skip locked
  ), removed as (
    delete from public.form_rate_buckets p using candidates c
    where p.scope = c.scope and p.bucket = c.bucket and p.fingerprint = c.fingerprint returning 1
  ) select count(*) into buckets_deleted from removed;
  return next;
end; $$;
revoke all on function public.purge_expired_form_data() from public, anon, authenticated;
grant execute on function public.purge_expired_form_data() to service_role;
