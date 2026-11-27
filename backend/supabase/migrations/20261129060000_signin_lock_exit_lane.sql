-- EPE LAWA — a reserved lane for the ways out of a sign-in lock.
-- Forward-only. Follows 20261129050000_signin_throttle_slots.sql.
--
-- Why (Strix review on PR #280, LOW): a locked address is cleared by a
-- completed password reset or a valid emailed code, but both forms draw on one
-- site-wide hourly budget ('auth_reset', 'auth_otp': 100 per hour shared) that
-- anyone can fill first, so the way out of a lock could be closed at will.
--
-- signin_throttle_exit_allowance(key, kind) is consulted by the app only after
-- the normal budget has refused. It grants a small per-address allowance, and
-- only while that address is actually locked:
--   'reset' -> 3 per address per hour. A reset request always mails the real
--              owner, so someone spending it only sends the owner usable links.
--   'code'  -> 10 code checks per address per hour.
-- The general queue cannot consume it, and because it needs an active lock
-- (8 confirmed wrong passwords, behind the sign-in network budget) the extra
-- mail it can cause is bounded by the number of locks.

alter table public.auth_signin_throttle
  add column if not exists exit_bucket timestamptz,
  add column if not exists exit_resets integer not null default 0,
  add column if not exists exit_codes integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'auth_signin_throttle_exits'
                 and conrelid = 'public.auth_signin_throttle'::regclass) then
    alter table public.auth_signin_throttle
      add constraint auth_signin_throttle_exits check (exit_resets between 0 and 1000 and exit_codes between 0 and 1000);
  end if;
end;
$$;

create or replace function public.signin_throttle_exit_allowance(p_account_key text, p_kind text)
returns boolean
language plpgsql
volatile
security definer
set search_path to ''
as $function$
declare
  max_resets constant integer := 3;
  max_codes constant integer := 10;
  v_row public.auth_signin_throttle%rowtype;
  v_bucket timestamptz := pg_catalog.date_trunc('hour', pg_catalog.now());
begin
  if p_account_key is null or p_account_key !~ '^[a-f0-9]{64}$'
    or p_kind is null or p_kind not in ('reset', 'code') then
    raise exception using errcode = '22023', message = 'invalid_signin_exit_input';
  end if;

  select * into v_row from public.auth_signin_throttle where account_key = p_account_key for update;
  if not found or v_row.locked_until is null or v_row.locked_until <= pg_catalog.now() then
    return false; -- not locked: the normal shared budget applies
  end if;

  if v_row.exit_bucket is distinct from v_bucket then
    v_row.exit_resets := 0;
    v_row.exit_codes := 0;
  end if;

  if p_kind = 'reset' then
    if v_row.exit_resets >= max_resets then return false; end if;
    v_row.exit_resets := v_row.exit_resets + 1;
  else
    if v_row.exit_codes >= max_codes then return false; end if;
    v_row.exit_codes := v_row.exit_codes + 1;
  end if;

  update public.auth_signin_throttle
     set exit_bucket = v_bucket, exit_resets = v_row.exit_resets, exit_codes = v_row.exit_codes
   where account_key = p_account_key;
  return true;
end;
$function$;

revoke all on function public.signin_throttle_exit_allowance(text, text) from public, anon, authenticated;
grant execute on function public.signin_throttle_exit_allowance(text, text) to service_role;
