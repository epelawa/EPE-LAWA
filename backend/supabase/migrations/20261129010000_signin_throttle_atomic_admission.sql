-- EPE LAWA — make the per-account sign-in throttle reserve attempts atomically.
-- Forward-only. Follows 20261129000000_signin_account_throttle.sql.
--
-- Why (Strix review on PR #280, MEDIUM): admission was a read-only status check
-- and the failure was written only after the provider round-trip, so a burst of
-- parallel requests for one email all passed the check before any failure was
-- recorded, and the 8-attempt lock never applied to them.
--
-- Now every password check must first RESERVE a slot under the row lock:
--   signin_throttle_admit(key)        -> 0 = admitted (slot reserved),
--                                        n > 0 = locked for n seconds.
--   signin_throttle_record(key, outcome)
--       'verified' -> clears the key (correct password; also used after a reset)
--       'rejected' -> keeps the reserved slot as a failure; locks at 8
--       'unknown'  -> releases the reserved slot (outage, provider rate limit,
--                     network limiter refusal: no password was judged)
-- At most 8 password checks can be in flight or spent per 15-minute window,
-- however many requests arrive at once. The two earlier functions are dropped;
-- no deployed code calls them (they shipped with this PR, not yet merged).
--
-- `failures` now counts reserved attempts (in flight or failed) in the window;
-- `last_failure_at` is the time of the latest reservation or failure and is
-- what the stale-row prune uses.

drop function if exists public.signin_throttle_status(text);
drop function if exists public.signin_throttle_record(text, boolean);

create or replace function public.signin_throttle_admit(p_account_key text)
returns integer
language plpgsql
volatile
security definer
set search_path to ''
as $function$
declare
  max_attempts constant integer := 8;
  window_length constant interval := interval '15 minutes';
  lock_length constant interval := interval '15 minutes';
  v_row public.auth_signin_throttle%rowtype;
  v_now timestamptz := pg_catalog.now();
begin
  if p_account_key is null or p_account_key !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_account_key';
  end if;

  insert into public.auth_signin_throttle (account_key, failures, window_started_at, last_failure_at)
  values (p_account_key, 0, v_now, v_now)
  on conflict (account_key) do nothing;
  -- The row lock serialises admission for this key: parallel requests queue here.
  select * into v_row from public.auth_signin_throttle where account_key = p_account_key for update;

  if v_row.locked_until is not null and v_row.locked_until > v_now then
    return greatest(1, pg_catalog.ceil(extract(epoch from (v_row.locked_until - v_now)))::integer);
  end if;

  if v_row.locked_until is not null or v_row.window_started_at <= v_now - window_length then
    v_row.failures := 0;
    v_row.window_started_at := v_now;
    v_row.locked_until := null;
  end if;

  if v_row.failures >= max_attempts then
    -- Eight checks are already spent or in flight in this window: lock now.
    v_row.locked_until := v_now + lock_length;
    update public.auth_signin_throttle
       set failures = v_row.failures, window_started_at = v_row.window_started_at,
           locked_until = v_row.locked_until, last_failure_at = v_now
     where account_key = p_account_key;
    return greatest(1, pg_catalog.ceil(extract(epoch from lock_length))::integer);
  end if;

  update public.auth_signin_throttle
     set failures = v_row.failures + 1, window_started_at = v_row.window_started_at,
         locked_until = null, last_failure_at = v_now
   where account_key = p_account_key;
  return 0;
end;
$function$;

create or replace function public.signin_throttle_record(p_account_key text, p_outcome text)
returns integer
language plpgsql
volatile
security definer
set search_path to ''
as $function$
declare
  max_attempts constant integer := 8;
  lock_length constant interval := interval '15 minutes';
  v_row public.auth_signin_throttle%rowtype;
  v_now timestamptz := pg_catalog.now();
begin
  if p_account_key is null or p_account_key !~ '^[a-f0-9]{64}$'
    or p_outcome is null or p_outcome not in ('verified', 'rejected', 'unknown') then
    raise exception using errcode = '22023', message = 'invalid_signin_throttle_input';
  end if;

  if p_outcome = 'verified' then
    delete from public.auth_signin_throttle where account_key = p_account_key;
    return 0;
  end if;

  select * into v_row from public.auth_signin_throttle where account_key = p_account_key for update;
  if not found then return 0; end if;

  if p_outcome = 'unknown' then
    -- No password was judged: give the reserved slot back. An existing lock stays.
    update public.auth_signin_throttle set failures = greatest(v_row.failures - 1, 0) where account_key = p_account_key;
  elsif v_row.locked_until is null or v_row.locked_until <= v_now then
    -- 'rejected': the slot reserved at admission is now a counted failure.
    if v_row.failures >= max_attempts then v_row.locked_until := v_now + lock_length; else v_row.locked_until := null; end if;
    update public.auth_signin_throttle set locked_until = v_row.locked_until, last_failure_at = v_now where account_key = p_account_key;
  end if;

  -- Keep the table small without a separate job: stale, unlocked keys go.
  delete from public.auth_signin_throttle
   where last_failure_at < v_now - interval '1 day'
     and (locked_until is null or locked_until < v_now);

  if v_row.locked_until is null or v_row.locked_until <= v_now then return 0; end if;
  return greatest(1, pg_catalog.ceil(extract(epoch from (v_row.locked_until - v_now)))::integer);
end;
$function$;

revoke all on function public.signin_throttle_admit(text) from public, anon, authenticated;
revoke all on function public.signin_throttle_record(text, text) from public, anon, authenticated;
grant execute on function public.signin_throttle_admit(text) to service_role;
grant execute on function public.signin_throttle_record(text, text) to service_role;
