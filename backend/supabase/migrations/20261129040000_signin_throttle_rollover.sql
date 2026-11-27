-- EPE LAWA — sign-in throttle: count every confirmed failure across a window
-- rollover. Forward-only. Follows 20261129030000_signin_throttle_window_check.sql.
--
-- Why (Strix review on PR #280, LOW, CWE-799): 030000 discarded a rejection
-- confirmed after its window closed, and admission gave the next window a new
-- generation, so a batch of checks timed across the boundary was counted in
-- neither window: about sixteen checks per cycle instead of eight.
--
-- Now:
--  * a plain window rollover keeps the generation (only a lock expiry or a
--    cleared key renews it), so checks still in flight stay matched;
--  * an outcome that lands after its window closed rolls the window forward
--    and counts in the window it lands in. It never adds to the expired window
--    (the CodeRabbit requirement behind 030000) and is never dropped;
--  * at a rollover, reservations idle for 2 minutes (requests that died
--    without recording) stop holding slots.
-- Signatures and grants are unchanged.

create or replace function public.signin_throttle_admit(p_account_key text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $function$
declare
  max_attempts constant integer := 8;
  window_length constant interval := interval '15 minutes';
  busy_retry_seconds constant integer := 30;
  max_new_keys_per_hour constant integer := 1000;
  v_row public.auth_signin_throttle%rowtype;
  v_now timestamptz := pg_catalog.now();
begin
  if p_account_key is null or p_account_key !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_account_key';
  end if;

  select * into v_row from public.auth_signin_throttle where account_key = p_account_key for update;

  if not found then
    -- New key: serialise creation so a burst cannot overrun the hourly cap.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('public.signin_throttle_admit:new_key'));
    delete from public.auth_signin_throttle
     where last_failure_at < v_now - interval '1 day'
       and (locked_until is null or locked_until < v_now);
    if (select count(*) from public.auth_signin_throttle where created_at > v_now - interval '1 hour') >= max_new_keys_per_hour then
      return pg_catalog.jsonb_build_object('capacity', true);
    end if;
    insert into public.auth_signin_throttle (account_key, failures, pending, window_started_at, last_failure_at, created_at)
    values (p_account_key, 0, 0, v_now, v_now, v_now)
    on conflict (account_key) do nothing;
    select * into v_row from public.auth_signin_throttle where account_key = p_account_key for update;
  end if;

  if v_row.locked_until is not null and v_row.locked_until > v_now then
    return pg_catalog.jsonb_build_object('locked',
      greatest(1, pg_catalog.ceil(extract(epoch from (v_row.locked_until - v_now)))::integer));
  end if;

  if v_row.locked_until is not null then
    -- An expired lock: start clean with a new generation. (No check can be in
    -- flight here: the 8th confirmed failure set the lock with pending = 0, and
    -- admission is refused while locked.)
    v_row.failures := 0;
    v_row.pending := 0;
    v_row.generation := pg_catalog.gen_random_uuid();
    v_row.window_started_at := v_now;
    v_row.locked_until := null;
  elsif v_row.window_started_at <= v_now - window_length then
    -- Plain rollover: fresh failure count, SAME generation, so checks still in
    -- flight are matched and counted in the new window (Strix review on PR
    -- #280). Reservations idle for 2 minutes belong to requests that died
    -- without recording; they stop holding slots. (A late outcome from one
    -- still counts its rejection; pending never drops below 0.)
    v_row.failures := 0;
    v_row.window_started_at := v_now;
    if v_row.last_failure_at <= v_now - interval '2 minutes' then
      v_row.pending := 0;
    end if;
  end if;

  if v_row.failures + v_row.pending >= max_attempts then
    -- Eight checks already spent or still in flight: refuse this one, start no lock.
    update public.auth_signin_throttle
       set failures = v_row.failures, pending = v_row.pending, generation = v_row.generation,
           window_started_at = v_row.window_started_at, locked_until = null
     where account_key = p_account_key;
    return pg_catalog.jsonb_build_object('busy', busy_retry_seconds);
  end if;

  update public.auth_signin_throttle
     set failures = v_row.failures, pending = v_row.pending + 1, generation = v_row.generation,
         window_started_at = v_row.window_started_at, locked_until = null, last_failure_at = v_now
   where account_key = p_account_key;
  return pg_catalog.jsonb_build_object('admitted', true, 'reservation', v_row.generation);
end;
$function$;

create or replace function public.signin_throttle_record(p_account_key text, p_outcome text, p_reservation uuid)
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
  if p_account_key is null or p_account_key !~ '^[a-f0-9]{64}$'
    or p_outcome is null or p_outcome not in ('verified', 'rejected', 'unknown')
    or (p_outcome <> 'verified' and p_reservation is null) then
    raise exception using errcode = '22023', message = 'invalid_signin_throttle_input';
  end if;

  if p_outcome = 'verified' then
    delete from public.auth_signin_throttle where account_key = p_account_key;
    return 0;
  end if;

  select * into v_row from public.auth_signin_throttle where account_key = p_account_key for update;
  if not found then return 0; end if;

  if v_row.generation = p_reservation then
    if v_row.window_started_at <= v_now - window_length
       and (v_row.locked_until is null or v_row.locked_until <= v_now) then
      -- The outcome lands after its window closed: roll the window forward and
      -- count it in the window it lands in, never in the expired one
      -- (CodeRabbit), and never drop it (Strix review on PR #280).
      v_row.failures := 0;
      v_row.window_started_at := v_now;
      v_row.locked_until := null;
    end if;
    v_row.pending := greatest(v_row.pending - 1, 0);
    if p_outcome = 'rejected' then
      v_row.failures := v_row.failures + 1;
      if v_row.failures >= max_attempts and (v_row.locked_until is null or v_row.locked_until <= v_now) then
        v_row.locked_until := v_now + lock_length;
      end if;
    end if;
    update public.auth_signin_throttle
       set pending = v_row.pending, failures = v_row.failures, locked_until = v_row.locked_until,
           window_started_at = v_row.window_started_at,
           last_failure_at = case when p_outcome = 'rejected' then v_now else last_failure_at end
     where account_key = p_account_key;
  end if;
  -- A stale reservation (an older generation, or a cleared key) changes nothing.

  if v_row.locked_until is null or v_row.locked_until <= v_now then return 0; end if;
  return greatest(1, pg_catalog.ceil(extract(epoch from (v_row.locked_until - v_now)))::integer);
end;
$function$;

revoke all on function public.signin_throttle_admit(text) from public, anon, authenticated;
revoke all on function public.signin_throttle_record(text, text, uuid) from public, anon, authenticated;
grant execute on function public.signin_throttle_admit(text) to service_role;
grant execute on function public.signin_throttle_record(text, text, uuid) to service_role;
