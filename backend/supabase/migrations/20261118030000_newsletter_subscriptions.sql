-- EPE LAWA — standalone newsletter subscriptions.
--
-- This does not use Supabase Auth confirmation links. The application owns the
-- subscription record, hashes its management token/OTP before storage, and uses
-- the configured SMTP transport for branded mail delivery.

create table if not exists public.newsletter_subscribers (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null,
  status                text not null default 'active',
  unsubscribe_token_hash text not null,
  management_otp_hash   text not null,
  otp_expires_at        timestamptz not null,
  subscribed_at         timestamptz not null default now(),
  unsubscribed_at       timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint newsletter_subscribers_email_format check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint newsletter_subscribers_status check (status in ('active', 'unsubscribed')),
  constraint newsletter_subscribers_token_hash_format check (unsubscribe_token_hash ~ '^[a-f0-9]{64}$'),
  constraint newsletter_subscribers_otp_hash_format check (management_otp_hash ~ '^[a-f0-9]{64}$')
);

create unique index if not exists newsletter_subscribers_email_lower_idx
  on public.newsletter_subscribers (lower(email));
create unique index if not exists newsletter_subscribers_token_hash_idx
  on public.newsletter_subscribers (unsubscribe_token_hash);
create index if not exists newsletter_subscribers_active_idx
  on public.newsletter_subscribers (status, subscribed_at desc);

alter table public.newsletter_subscribers enable row level security;
revoke all on table public.newsletter_subscribers from public, anon, authenticated;

drop trigger if exists newsletter_subscribers_set_updated_at on public.newsletter_subscribers;
create trigger newsletter_subscribers_set_updated_at
  before update on public.newsletter_subscribers
  for each row execute function public.set_updated_at();

create or replace function public.newsletter_subscribe_request(
  p_email text,
  p_unsubscribe_token_hash text,
  p_management_otp_hash text,
  p_otp_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_email is null or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or p_unsubscribe_token_hash is null or p_unsubscribe_token_hash !~ '^[a-f0-9]{64}$'
     or p_management_otp_hash is null or p_management_otp_hash !~ '^[a-f0-9]{64}$'
     or p_otp_expires_at is null or p_otp_expires_at <= now()
  then
    raise exception using errcode = '22023', message = 'invalid_newsletter_request';
  end if;

  insert into public.newsletter_subscribers (
    email, status, unsubscribe_token_hash, management_otp_hash, otp_expires_at,
    subscribed_at, unsubscribed_at, updated_at
  ) values (
    lower(btrim(p_email)), 'active', p_unsubscribe_token_hash, p_management_otp_hash, p_otp_expires_at,
    now(), null, now()
  )
  on conflict (lower(email)) do update set
    status = 'active',
    unsubscribe_token_hash = excluded.unsubscribe_token_hash,
    management_otp_hash = excluded.management_otp_hash,
    otp_expires_at = excluded.otp_expires_at,
    subscribed_at = now(),
    unsubscribed_at = null,
    updated_at = now();

  return true;
end;
$$;

create or replace function public.newsletter_unsubscribe(p_unsubscribe_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_unsubscribe_token_hash is null or p_unsubscribe_token_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  update public.newsletter_subscribers
  set status = 'unsubscribed', unsubscribed_at = now(), updated_at = now()
  where unsubscribe_token_hash = p_unsubscribe_token_hash and status = 'active';

  return found;
end;
$$;

revoke all on function public.newsletter_subscribe_request(text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.newsletter_unsubscribe(text) from public, anon, authenticated;
grant execute on function public.newsletter_subscribe_request(text, text, text, timestamptz) to anon, authenticated;
grant execute on function public.newsletter_unsubscribe(text) to anon, authenticated;
