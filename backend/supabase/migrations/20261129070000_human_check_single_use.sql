-- EPE LAWA — single-use human-check tokens for the sign-in forms.
-- Forward-only. Follows 20261129060000_signin_lock_exit_lane.sql.
--
-- Why (Strix review on PR #280, LOW): anyone could arm a chosen address's
-- sign-in lock with eight plain requests. The member and staff sign-in forms
-- now need a solved challenge per password check (lib/human-check.ts,
-- verifySigninHumanCheck). The built-in challenge is stateless and was valid
-- for two hours, so a single solve could be replayed for every attempt; this
-- table spends each sign-in token on first use.
--
-- Only tokens that the server signed AND the caller solved reach this table,
-- after the per-network sign-in budget, so a flood cannot grow it cheaply.
-- Rows are kept only until the token would have expired anyway.

create table if not exists public.human_check_spent (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null
);

alter table public.human_check_spent enable row level security;
revoke all on table public.human_check_spent from public, anon, authenticated;

create index if not exists human_check_spent_expires_idx on public.human_check_spent (expires_at);

create or replace function public.human_check_spend(p_token_hash text, p_expires_at timestamptz)
returns boolean
language plpgsql
volatile
security definer
set search_path to ''
as $function$
declare
  v_now timestamptz := pg_catalog.now();
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_expires_at is null or p_expires_at <= v_now or p_expires_at > v_now + interval '3 hours' then
    return false;
  end if;
  -- Bounded clean-up of expired rows on every call.
  delete from public.human_check_spent
   where token_hash in (select token_hash from public.human_check_spent where expires_at <= v_now limit 200);
  insert into public.human_check_spent (token_hash, expires_at) values (p_token_hash, p_expires_at)
  on conflict (token_hash) do nothing;
  return found;
end;
$function$;

revoke all on function public.human_check_spend(text, timestamptz) from public, anon, authenticated;
grant execute on function public.human_check_spend(text, timestamptz) to service_role;
