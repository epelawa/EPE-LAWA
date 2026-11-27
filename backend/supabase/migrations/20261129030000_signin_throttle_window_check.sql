-- EPE LAWA — sign-in throttle: count an outcome only inside its own window.
-- Forward-only. Follows 20261129020000_signin_throttle_reservations.sql.
--
-- Why (CodeRabbit review on PR #280): signin_throttle_record checked the
-- reservation's generation but not the window. A check admitted at second 899
-- and confirmed wrong at second 901, with no admission in between, still
-- matched the generation and added to the window that started at second 0, so
-- eight failures spread across two windows could start a lock. An outcome is
-- now discarded once its window has expired; eight confirmations inside the
-- window still lock exactly as before. Signature and grants are unchanged.

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

  -- Apply only to the reservation's own generation AND only while its window is
  -- still open: a rejection confirmed after the window expired must not add to
  -- it (the next admission starts a fresh window and generation anyway).
  if v_row.generation = p_reservation and v_row.window_started_at > v_now - window_length then
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
  -- A stale reservation (older generation, expired window, or a cleared key) changes nothing.

  if v_row.locked_until is null or v_row.locked_until <= v_now then return 0; end if;
  return greatest(1, pg_catalog.ceil(extract(epoch from (v_row.locked_until - v_now)))::integer);
end;
$function$;

revoke all on function public.signin_throttle_record(text, text, uuid) from public, anon, authenticated;
grant execute on function public.signin_throttle_record(text, text, uuid) to service_role;
