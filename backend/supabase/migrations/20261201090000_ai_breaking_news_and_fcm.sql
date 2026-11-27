-- Turn 24: the AI can flag breaking news, every AI story notifies subscribers,
-- and devices can carry an optional Firebase Cloud Messaging token.
-- Idempotent: safe to run more than once.

-- 1. Breaking-news settings for the AI.
--    breaking_hours: how long an AI-flagged story stays in the ticker.
--    breaking_max:   how many stories the AI may keep breaking at the same time.
alter table public.ai_settings add column if not exists breaking_hours integer not null default 6;
alter table public.ai_settings add column if not exists breaking_max integer not null default 5;
alter table public.ai_settings drop constraint if exists ai_settings_breaking_hours_check;
alter table public.ai_settings add constraint ai_settings_breaking_hours_check check (breaking_hours between 1 and 72);
alter table public.ai_settings drop constraint if exists ai_settings_breaking_max_check;
alter table public.ai_settings add constraint ai_settings_breaking_max_check check (breaking_max between 1 and 10);

-- The new "breaking" capability starts on where the push capability is on
-- (the AI already judged "major breaking" stories for push).
update public.ai_settings
   set capabilities = capabilities || jsonb_build_object('breaking', coalesce((capabilities ->> 'push')::boolean, false))
 where id = 1 and not (capabilities ? 'breaking');

-- Saved right after ai_admin_save (whose capability list predates "breaking"),
-- so the breaking toggle is merged here.
drop function if exists public.ai_breaking_save(integer, integer);
create or replace function public.ai_breaking_save(p_hours integer, p_max integer, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not coalesce(public.staff_roles_authorized(), false) then
    raise exception using errcode = '42501', message = 'ai_settings_forbidden';
  end if;
  if p_hours is null or p_hours not between 1 and 72 or p_max is null or p_max not between 1 and 10 then
    raise exception using errcode = '22023', message = 'breaking_settings_invalid';
  end if;
  update public.ai_settings
     set breaking_hours = p_hours,
         breaking_max = p_max,
         capabilities = capabilities || jsonb_build_object('breaking', coalesce(p_enabled, false))
   where id = 1;
end $$;
revoke all on function public.ai_breaking_save(integer, integer, boolean) from public, anon;
grant execute on function public.ai_breaking_save(integer, integer, boolean) to authenticated;

-- 2. The AI's breaking flag (service role only). Returns false, without error,
--    when the ticker already holds breaking_max active AI-or-staff breaking stories.
create or replace function public.ai_mark_breaking(p_article_id uuid, p_hours integer)
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_max integer;
  v_active integer;
  v_hours integer := greatest(1, least(coalesce(p_hours, 6), 72));
begin
  select breaking_max into v_max from public.ai_settings where id = 1;
  select count(*) into v_active from public.articles
   where is_breaking and breaking_until > now() and id <> p_article_id;
  if v_active >= coalesce(v_max, 5) then
    return false;
  end if;
  update public.articles
     set is_breaking = true,
         breaking_until = now() + make_interval(hours => v_hours),
         revision = revision + 1
   where id = p_article_id and published_version_id is not null;
  return found;
end $$;
revoke all on function public.ai_mark_breaking(uuid, integer) from public, anon, authenticated;
grant execute on function public.ai_mark_breaking(uuid, integer) to service_role;

-- 3. Optional FCM token per device, encrypted by the app like the endpoint.
alter table public.web_push_devices add column if not exists fcm_token_enc text;
alter table public.web_push_devices add column if not exists fcm_token_at timestamptz;
alter table public.web_push_devices drop constraint if exists web_push_devices_fcm_token_enc_check;
alter table public.web_push_devices add constraint web_push_devices_fcm_token_enc_check
  check (fcm_token_enc is null or length(fcm_token_enc) between 32 and 8192);

comment on column public.web_push_devices.fcm_token_enc is
  'Firebase Cloud Messaging registration token for this device, app-encrypted (AES-256-GCM). Null until Firebase is configured.';
