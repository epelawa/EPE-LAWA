-- EPE LAWA — per-account sign-in throttle: identifiable reservations,
-- confirmed-failure locks, bounded table growth.
-- Forward-only. Follows 20261129010000_signin_throttle_atomic_admission.sql.
--
-- Review findings on PR #280 addressed here:
--  * CodeRabbit: in-flight reservations shared the `failures` counter, so a
--    ninth admission, or one rejection while others were still pending, could
--    start the lock before eight passwords were actually judged wrong, and an
--    outage could leave a lock behind.
--    -> `pending` (in flight) and `failures` (provider-confirmed wrong
--       passwords) are now separate. Only the 8th confirmed failure starts
--       the 15-minute lock. When 8 checks are already spent or in flight, a
--       further admission is refused as "busy" without starting a lock.
--  * CodeRabbit: an 'unknown' outcome decremented whatever row held the key,
--    so a late outcome could lower a newer generation's count after a
--    'verified' deleted and a new admission re-created the row.
--    -> every row carries a random `generation`. Admission returns it as the
--       reservation token. 'rejected' and 'unknown' only touch the row when
--       their token matches, so stale outcomes are ignored.
--  * Strix (MEDIUM, CWE-770): each never-seen email created a row, so a
--    caller cycling fresh addresses could grow the table at request rate.
--    The app now spends the shared 'auth_signin' network budget (500 per
--    hour) BEFORE admission. As a database backstop, at most 1000 new keys
--    may be created per rolling hour; beyond that, admission reports
--    "capacity" and the app fails safe ("temporarily unavailable"). Every new
--    key first prunes rows idle for a day, so the table stays bounded at
--    about 24 000 rows. Existing keys are never affected by the cap.
--
-- API (service_role only):
--   signin_throttle_admit(key) -> jsonb, one of
--     {"admitted": true, "reservation": "<uuid>"}
--     {"locked": <seconds>}   8 confirmed failures in the window
--     {"busy": <seconds>}     8 checks spent or in flight; retry shortly, no lock
--     {"capacity": true}      hourly new-key cap reached
--   signin_throttle_record(key, outcome, reservation) -> integer lock seconds
--     'verified'  clears the key (reservation may be null: reset / emailed code)
--     'rejected'  closes the reservation as a confirmed failure; locks at 8
--     'unknown'   closes the reservation without counting it

alter table public.auth_signin_throttle
  add column if not exists pending integer not null default 0,
  add column if not exists generation uuid not null default gen_random_uuid(),
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'auth_signin_throttle_pending'
                 and conrelid = 'public.auth_signin_throttle'::regclass) then
    alter table public.auth_signin_throttle
      add constraint auth_signin_throttle_pending check (pending between 0 and 1000);
  end if;
end;
$$;

create index if not exists auth_signin_throttle_created_at_idx
  on public.auth_signin_throttle (created_at);

-- Rows written by the previous functions counted reservations as failures;
-- none are meaningful under the new model.
delete from public.auth_signin_throttle where locked_until is null or locked_until <= now();

drop function if exists public.signin_throttle_admit(text);
drop function if exists public.signin_throttle_record(text, text);

create function public.signin_throttle_admit(p_account_key text)
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

  if v_row.locked_until is not null or v_row.window_started_at <= v_now - window_length then
    -- Fresh window (or an expired lock): a new generation, so outcomes of
    -- attempts from the old window can no longer change the counts.
    v_row.failures := 0;
    v_row.pending := 0;
    v_row.generation := pg_catalog.gen_random_uuid();
    v_row.window_started_at := v_now;
    v_row.locked_until := null;
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

create function public.signin_throttle_record(p_account_key text, p_outcome text, p_reservation uuid)
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
    v_row.pending := greatest(v_row.pending - 1, 0);
    if p_outcome = 'rejected' then
      v_row.failures := v_row.failures + 1;
      if v_row.failures >= max_attempts and (v_row.locked_until is null or v_row.locked_until <= v_now) then
        v_row.locked_until := v_now + lock_length;
      end if;
    end if;
    update public.auth_signin_throttle
       set pending = v_row.pending, failures = v_row.failures, locked_until = v_row.locked_until,
           last_failure_at = case when p_outcome = 'rejected' then v_now else last_failure_at end
     where account_key = p_account_key;
  end if;
  -- A stale reservation (older window, or the key was cleared) changes nothing.

  if v_row.locked_until is null or v_row.locked_until <= v_now then return 0; end if;
  return greatest(1, pg_catalog.ceil(extract(epoch from (v_row.locked_until - v_now)))::integer);
end;
$function$;

revoke all on function public.signin_throttle_admit(text) from public, anon, authenticated;
revoke all on function public.signin_throttle_record(text, text, uuid) from public, anon, authenticated;
grant execute on function public.signin_throttle_admit(text) to service_role;
grant execute on function public.signin_throttle_record(text, text, uuid) to service_role;
