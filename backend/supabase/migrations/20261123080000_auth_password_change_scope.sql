-- EPE LAWA — add a dedicated rate scope for the member change-password
-- action (Feat 18) so password re-authentication attempts are throttled
-- like the other auth scopes.

alter table public.form_rate_buckets drop constraint if exists form_rate_buckets_scope_check;
alter table public.form_rate_buckets add constraint form_rate_buckets_scope_check
  check (scope in (
    'newsletter', 'enquiry',
    'auth_signup', 'auth_signin', 'auth_reset', 'auth_otp', 'auth_resend',
    'business_submit', 'tourism_submit', 'gallery_submit', 'history_submit',
    'forum_post',
    'event_submit', 'song_request', 'business_claim', 'moderation_appeal',
    'auth_password_change'
  ));
