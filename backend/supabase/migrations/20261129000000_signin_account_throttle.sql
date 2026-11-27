-- EPE LAWA — per-account sign-in throttle. Forward-only, additive.
--
-- Why: form_rate_limit('auth_signin') limits each network (15/hour) and all
-- networks together (500/hour), but nothing limits guesses against ONE account
-- spread across many networks, and the staff login had no limit at all.
--
-- Design:
--   * account_key is an HMAC of the normalised email computed by the app with
--     FORM_RATE_SECRET, so this table never holds an email address and a key
--     cannot be derived for an arbitrary email without the secret.
--   * Only failed password checks count. MAX_FAILURES failures inside a
--     15-minute window lock the key for 15 minutes; a successful sign-in or a
--     completed password reset clears it.
--   * The lock is applied to any email string, registered or not, so the
--     response never reveals whether an account exists.
--   * The lock is short and fixed (not escalating) to bound the harm of
--     someone deliberately locking another person out; password reset still
--     works and clears the lock.
--   * service_role only: anon/authenticated can neither read nor reset state.

create table if not exists public.auth_signin_throttle (
  account_key text primary key,
  failures integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  last_failure_at timestamptz not null default now(),
  constraint auth_signin_throttle_key check (account_key ~ '^[a-f0-9]{64}$'),
  constraint auth_signin_throttle_failures check (failures between 0 and 1000)
);
create index if not exists auth_signin_throttle_last_failure_idx on public.auth_signin_throttle (last_failure_at);

alter table public.auth_signin_throttle enable row level security;
revoke all on public.auth_signin_throttle from public, anon, authenticated;
grant select, insert, update, delete on public.auth_signin_throttle to service_role;

-- Seconds until this key may attempt a sign-in again; 0 means allowed now.
create or replace function public.signin_throttle_status(p_account_key text)
returns integer
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare v_locked_until timestamptz;
begin
  if p_account_key is null or p_account_key !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_account_key';
  end if;
  select locked_until into v_locked_until from public.auth_signin_throttle where account_key = p_account_key;
  if v_locked_until is null or v_locked_until <= pg_catalog.now() then return 0; end if;
  return greatest(1, pg_catalog.ceil(extract(epoch from (v_locked_until - pg_catalog.now())))::integer);
end;
$function$;

-- Records one password check. Success clears the key; failure counts toward the
-- lock. Returns the seconds the key is now locked for (0 when not locked).
create or replace function public.signin_throttle_record(p_account_key text, p_succeeded boolean)
returns integer
language plpgsql
volatile
security definer
set search_path to ''
as $function$
declare
  max_failures constant integer := 8;
  window_length constant interval := interval '15 minutes';
  lock_length constant interval := interval '15 minutes';
  v_row public.auth_signin_throttle%rowtype;
  v_now timestamptz := pg_catalog.now();
begin
  if p_account_key is null or p_account_key !~ '^[a-f0-9]{64}$' or p_succeeded is null then
    raise exception using errcode = '22023', message = 'invalid_signin_throttle_input';
  end if;

  if p_succeeded then
    delete from public.auth_signin_throttle where account_key = p_account_key;
    return 0;
  end if;

  insert into public.auth_signin_throttle (account_key, failures, window_started_at, last_failure_at)
  values (p_account_key, 0, v_now, v_now)
  on conflict (account_key) do nothing;
  select * into v_row from public.auth_signin_throttle where account_key = p_account_key for update;

  -- A failure while still locked (a request that passed the status check just
  -- before the lock) neither extends the lock nor starts a new window.
  if v_row.locked_until is not null and v_row.locked_until > v_now then
    return greatest(1, pg_catalog.ceil(extract(epoch from (v_row.locked_until - v_now)))::integer);
  end if;

  if v_row.locked_until is not null or v_row.window_started_at <= v_now - window_length then
    v_row.failures := 0;
    v_row.window_started_at := v_now;
    v_row.locked_until := null;
  end if;
  v_row.failures := least(v_row.failures + 1, 1000);
  if v_row.failures >= max_failures then v_row.locked_until := v_now + lock_length; end if;

  update public.auth_signin_throttle
     set failures = v_row.failures,
         window_started_at = v_row.window_started_at,
         locked_until = v_row.locked_until,
         last_failure_at = v_now
   where account_key = p_account_key;

  -- Keep the table small without a separate job: stale, unlocked keys go.
  delete from public.auth_signin_throttle
   where last_failure_at < v_now - interval '1 day'
     and (locked_until is null or locked_until < v_now);

  if v_row.locked_until is null then return 0; end if;
  return greatest(1, pg_catalog.ceil(extract(epoch from (v_row.locked_until - v_now)))::integer);
end;
$function$;

revoke all on function public.signin_throttle_status(text) from public, anon, authenticated;
revoke all on function public.signin_throttle_record(text, boolean) from public, anon, authenticated;
grant execute on function public.signin_throttle_status(text) to service_role;
grant execute on function public.signin_throttle_record(text, boolean) to service_role;
