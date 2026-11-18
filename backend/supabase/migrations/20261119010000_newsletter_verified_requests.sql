-- Candidate only. Requires a trusted server, abuse controls and verified email
-- delivery before signup is exposed. Never grant these RPCs to client roles.
-- Pending requests cannot alter existing subscribers until mailbox proof.
create table if not exists public.newsletter_pending_confirmations (
  confirmation_hash text primary key check (confirmation_hash ~ '^[a-f0-9]{64}$'),
  email text not null check (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  unsubscribe_token_hash text not null check (unsubscribe_token_hash ~ '^[a-f0-9]{64}$'),
  management_otp_hash text not null check (management_otp_hash ~ '^[a-f0-9]{64}$'),
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists newsletter_pending_email_time_idx on public.newsletter_pending_confirmations (lower(email), requested_at desc);
alter table public.newsletter_pending_confirmations enable row level security;
revoke all on public.newsletter_pending_confirmations from public, anon, authenticated;
-- Cooldown survives confirmation and deleting pending tokens. Expired rows and
-- pending requests need a scheduled, restricted retention process before use.
create table if not exists public.newsletter_request_cooldowns (
  email text primary key, last_requested_at timestamptz not null
);
alter table public.newsletter_request_cooldowns enable row level security;
revoke all on public.newsletter_request_cooldowns from public, anon, authenticated;

-- Apply per-address cooldown while holding a transaction-scoped lock. This is
-- not a substitute for a trusted edge/IP/global rate limit or retention job.
create or replace function public.newsletter_request_verified(p_email text, p_confirmation_hash text, p_unsubscribe_hash text, p_otp_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare normalized text := lower(btrim(p_email));
begin
  if normalized is null or char_length(normalized) > 254 or normalized !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or p_confirmation_hash is null or p_confirmation_hash !~ '^[a-f0-9]{64}$'
    or p_unsubscribe_hash is null or p_unsubscribe_hash !~ '^[a-f0-9]{64}$'
    or p_otp_hash is null or p_otp_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_newsletter_request';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(normalized, 0));
  if exists (select 1 from public.newsletter_request_cooldowns where email = normalized and last_requested_at > now() - interval '1 minute') then return false; end if;
  insert into public.newsletter_request_cooldowns (email, last_requested_at) values (normalized, now())
    on conflict (email) do update set last_requested_at = excluded.last_requested_at;
  insert into public.newsletter_pending_confirmations (email, confirmation_hash, unsubscribe_token_hash, management_otp_hash, expires_at)
    values (normalized, p_confirmation_hash, p_unsubscribe_hash, p_otp_hash, now() + interval '30 minutes');
  return true;
end; $$;

create or replace function public.newsletter_confirm_verified(p_confirmation_hash text)
returns text language plpgsql security definer set search_path = '' as $$
declare pending public.newsletter_pending_confirmations%rowtype; address text; changed integer;
begin
  if p_confirmation_hash is null or p_confirmation_hash !~ '^[a-f0-9]{64}$' then return 'invalid'; end if;
  select email into address from public.newsletter_pending_confirmations where confirmation_hash = p_confirmation_hash;
  if address is null then return 'invalid'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(address, 0));
  select * into pending from public.newsletter_pending_confirmations where confirmation_hash = p_confirmation_hash for update;
  if not found or pending.expires_at <= now() then return 'invalid'; end if;
  -- A request for an already-active address must not rotate its existing token.
  insert into public.newsletter_subscribers (email, status, unsubscribe_token_hash, management_otp_hash, otp_expires_at, subscribed_at, unsubscribed_at, updated_at)
  values (pending.email, 'active', pending.unsubscribe_token_hash, pending.management_otp_hash, now() + interval '15 minutes', now(), null, now())
  on conflict (lower(email)) do update set status = 'active', unsubscribe_token_hash = excluded.unsubscribe_token_hash,
    management_otp_hash = excluded.management_otp_hash, otp_expires_at = excluded.otp_expires_at,
    subscribed_at = now(), unsubscribed_at = null, updated_at = now()
    where public.newsletter_subscribers.status = 'unsubscribed';
  get diagnostics changed = row_count;
  delete from public.newsletter_pending_confirmations where lower(email) = address;
  -- After proof the server can distinguish a newly activated subscription from
  -- an active one and must not email an invalid replacement unsubscribe token.
  return case when changed = 1 then 'activated' else 'already_active' end;
end; $$;
revoke all on function public.newsletter_request_verified(text,text,text,text) from public, anon, authenticated;
revoke all on function public.newsletter_confirm_verified(text) from public, anon, authenticated;
grant execute on function public.newsletter_request_verified(text,text,text,text) to service_role;
grant execute on function public.newsletter_confirm_verified(text) to service_role;
