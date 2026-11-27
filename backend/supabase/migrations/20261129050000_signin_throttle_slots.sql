-- EPE LAWA — sign-in throttle: track every reservation as its own slot.
-- Forward-only. Follows 20261129040000_signin_throttle_rollover.sql.
--
-- Why (CodeRabbit review on PR #280, two findings):
--  * Reservations were a bare `pending` count matched only by row generation,
--    so a late outcome from a reservation that had already been released as
--    idle still decremented `pending` and freed a slot held by a CURRENT
--    check (nine checks in flight against the eight-check budget).
--  * When recording rolled the window forward, idle reservations were not
--    released there, so seven dead requests plus one late rejection left
--    pending = 7 and the email answered "busy" for another 15 minutes.
--
-- Now:
--  * `held` maps each live reservation id to its admission time (epoch
--    seconds). `pending` is kept equal to the number of held slots.
--  * `released` maps reservations released as idle (held for 2 minutes:
--    their request died without recording) to their admission time, for 20
--    minutes, so a late outcome from one still counts its rejection (Strix's
--    boundary requirement) but never frees a slot it no longer holds.
--  * Idle release runs on EVERY admit and record, including the recording
--    path that rolls the window forward.
--  * The reservation token returned by admission is now the slot id (still a
--    uuid; the app-facing API is unchanged). A cleared key or an expired lock
--    empties both maps, so outcomes from before it are ignored.

alter table public.auth_signin_throttle
  add column if not exists held jsonb not null default '{}'::jsonb,
  add column if not exists released jsonb not null default '{}'::jsonb;

-- Tokens issued before this migration were row generations; they no longer
-- match any slot. Start every row with no live reservations.
update public.auth_signin_throttle set held = '{}'::jsonb, released = '{}'::jsonb, pending = 0;

-- Internal helper (not callable by any API role): moves held slots idle for
-- 2 minutes into `released` and forgets released slots older than 20 minutes.
create or replace function public.signin_throttle_release_idle(
  p_held jsonb, p_released jsonb, p_now timestamptz,
  out o_held jsonb, out o_released jsonb)
language sql
stable
set search_path to ''
as $function$
  select
    coalesce((select pg_catalog.jsonb_object_agg(e.key, e.value)
                from pg_catalog.jsonb_each(p_held) e
               where (e.value #>> '{}')::numeric > extract(epoch from p_now - interval '2 minutes')), '{}'::jsonb),
    coalesce((select pg_catalog.jsonb_object_agg(e.key, e.value)
                from (select r.key, r.value from pg_catalog.jsonb_each(p_released) r
                      union all
                      select h.key, h.value from pg_catalog.jsonb_each(p_held) h
                       where (h.value #>> '{}')::numeric <= extract(epoch from p_now - interval '2 minutes')) e
               where (e.value #>> '{}')::numeric > extract(epoch from p_now - interval '20 minutes')), '{}'::jsonb)
$function$;

revoke all on function public.signin_throttle_release_idle(jsonb, jsonb, timestamptz) from public, anon, authenticated, service_role;

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
  v_slot uuid;
  v_held_count integer;
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
    -- An expired lock: start clean. Outcomes from before the lock are ignored.
    v_row.failures := 0;
    v_row.held := '{}'::jsonb;
    v_row.released := '{}'::jsonb;
    v_row.generation := pg_catalog.gen_random_uuid();
    v_row.window_started_at := v_now;
    v_row.locked_until := null;
  else
    select i.o_held, i.o_released into v_row.held, v_row.released
      from public.signin_throttle_release_idle(v_row.held, v_row.released, v_now) i;
    if v_row.window_started_at <= v_now - window_length then
      -- Plain rollover: fresh failure count; live and released slots are kept,
      -- so checks still in flight are counted in the new window.
      v_row.failures := 0;
      v_row.window_started_at := v_now;
    end if;
  end if;

  select count(*) into v_held_count from pg_catalog.jsonb_object_keys(v_row.held);

  if v_row.failures + v_held_count >= max_attempts then
    -- Eight checks already spent or still in flight: refuse this one, start no lock.
    update public.auth_signin_throttle
       set failures = v_row.failures, held = v_row.held, released = v_row.released, pending = v_held_count,
           generation = v_row.generation, window_started_at = v_row.window_started_at, locked_until = null
     where account_key = p_account_key;
    return pg_catalog.jsonb_build_object('busy', busy_retry_seconds);
  end if;

  v_slot := pg_catalog.gen_random_uuid();
  v_row.held := v_row.held || pg_catalog.jsonb_build_object(v_slot::text, extract(epoch from v_now));
  update public.auth_signin_throttle
     set failures = v_row.failures, held = v_row.held, released = v_row.released, pending = v_held_count + 1,
         generation = v_row.generation, window_started_at = v_row.window_started_at, locked_until = null,
         last_failure_at = v_now
   where account_key = p_account_key;
  return pg_catalog.jsonb_build_object('admitted', true, 'reservation', v_slot);
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
  v_slot text := p_reservation::text;
  v_counted boolean := false;
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

  -- Release idle slots first, on this path too (CodeRabbit), so dead requests
  -- never keep the email "busy" after the window rolls forward here.
  select i.o_held, i.o_released into v_row.held, v_row.released
    from public.signin_throttle_release_idle(v_row.held, v_row.released, v_now) i;

  if v_row.held ? v_slot then
    v_row.held := v_row.held - v_slot;        -- a live slot: close it, freeing its place
    v_counted := true;
  elsif v_row.released ? v_slot then
    v_row.released := v_row.released - v_slot; -- released as idle: count, but free nothing
    v_counted := true;
  end if;
  -- Any other token (cleared key, expired lock, unknown slot) changes nothing.

  if v_counted then
    if v_row.window_started_at <= v_now - window_length
       and (v_row.locked_until is null or v_row.locked_until <= v_now) then
      -- Lands after its window closed: count it in the window it lands in.
      v_row.failures := 0;
      v_row.window_started_at := v_now;
      v_row.locked_until := null;
    end if;
    if p_outcome = 'rejected' then
      v_row.failures := v_row.failures + 1;
      if v_row.failures >= max_attempts and (v_row.locked_until is null or v_row.locked_until <= v_now) then
        v_row.locked_until := v_now + lock_length;
      end if;
    end if;
  end if;

  update public.auth_signin_throttle
     set held = v_row.held, released = v_row.released,
         pending = (select count(*) from pg_catalog.jsonb_object_keys(v_row.held)),
         failures = v_row.failures, locked_until = v_row.locked_until,
         window_started_at = v_row.window_started_at,
         last_failure_at = case when v_counted and p_outcome = 'rejected' then v_now else last_failure_at end
   where account_key = p_account_key;

  if v_row.locked_until is null or v_row.locked_until <= v_now then return 0; end if;
  return greatest(1, pg_catalog.ceil(extract(epoch from (v_row.locked_until - v_now)))::integer);
end;
$function$;

revoke all on function public.signin_throttle_admit(text) from public, anon, authenticated;
revoke all on function public.signin_throttle_record(text, text, uuid) from public, anon, authenticated;
grant execute on function public.signin_throttle_admit(text) to service_role;
grant execute on function public.signin_throttle_record(text, text, uuid) to service_role;
