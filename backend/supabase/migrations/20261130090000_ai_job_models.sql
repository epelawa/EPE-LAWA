-- AI Scheduler: administrators choose which free OpenRouter models each AI job
-- uses, in order (first choice, then backups). No shuffling. Only ids ending in
-- ":free" can be saved, so a paid model can never be selected even by mistake.

alter table public.ai_settings add column if not exists job_models jsonb not null default '{}'::jsonb;
alter table public.ai_settings drop constraint if exists ai_settings_job_models_check;
alter table public.ai_settings add constraint ai_settings_job_models_check check (jsonb_typeof(job_models) = 'object');

create or replace function public.ai_models_save(p_job_models jsonb, p_reason text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_jobs text[] := array['news', 'enquiries', 'businesses', 'moderation', 'admin_logs'];
  v_clean jsonb := '{}'::jsonb;
  v_job text;
  v_list jsonb;
  v_email text;
begin
  if not coalesce(public.staff_roles_authorized(), false) then
    raise exception using errcode = '42501', message = 'ai_settings_forbidden';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) > 500 then
    raise exception using errcode = '22023', message = 'reason_too_long';
  end if;
  if p_job_models is null or jsonb_typeof(p_job_models) <> 'object'
     or exists (select 1 from jsonb_object_keys(p_job_models) k where k <> all (v_jobs)) then
    raise exception using errcode = '22023', message = 'invalid_job_models';
  end if;
  foreach v_job in array v_jobs loop
    v_list := coalesce(p_job_models -> v_job, '[]'::jsonb);
    if jsonb_typeof(v_list) <> 'array' or jsonb_array_length(v_list) > 5
       or exists (
         select 1 from jsonb_array_elements(v_list) m
         where jsonb_typeof(m) <> 'string'
            or char_length(m #>> '{}') not between 6 and 120
            or (m #>> '{}') !~ '^[A-Za-z0-9._~-]+/[A-Za-z0-9._~/-]+:free$'
       )
       or (select count(*) from jsonb_array_elements_text(v_list)) <> (select count(distinct x) from jsonb_array_elements_text(v_list) x) then
      raise exception using errcode = '22023', message = 'invalid_job_models';
    end if;
    if jsonb_array_length(v_list) > 0 then
      v_clean := v_clean || jsonb_build_object(v_job, v_list);
    end if;
  end loop;
  select email into v_email from auth.users where id = auth.uid();
  update public.ai_settings set job_models = v_clean, updated_at = now(), updated_by = auth.uid() where id = 1;
  insert into public.ai_activity (job, action, outcome, title, reason, details, actor_id)
  values ('schedule', 'settings.models', 'done', 'AI models chosen by ' || coalesce(v_email, 'an administrator'),
    nullif(btrim(coalesce(p_reason, '')), ''), jsonb_build_object('job_models', v_clean), auth.uid());
  perform public.audit_event('staff', 'ai.models', 'ai_settings', null, 'success',
    jsonb_build_object('job_models', v_clean, 'reason', nullif(btrim(coalesce(p_reason, '')), '')));
end $$;
revoke all on function public.ai_models_save(jsonb, text) from public, anon;
grant execute on function public.ai_models_save(jsonb, text) to authenticated;
