-- EPE LAWA — form rate scopes for new submission surfaces (forward-only).
--
-- The community submission flows added with the feature program (events,
-- song requests, business claims, moderation appeals) share the trusted
-- server-side hourly limiter; these scopes cover them.

alter table public.form_rate_buckets drop constraint if exists form_rate_buckets_scope_check;
alter table public.form_rate_buckets add constraint form_rate_buckets_scope_check
  check (scope in (
    'newsletter', 'enquiry',
    'auth_signup', 'auth_signin', 'auth_reset', 'auth_otp', 'auth_resend',
    'business_submit', 'tourism_submit', 'gallery_submit', 'history_submit',
    'forum_post',
    'event_submit', 'song_request', 'business_claim', 'moderation_appeal'
  ));
