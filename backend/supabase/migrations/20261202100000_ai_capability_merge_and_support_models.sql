-- 1. ai_admin_save rebuilt capabilities from a fixed list of 8 keys, silently
--    switching off "breaking" and "support_reply" on every settings save.
--    It now knows all ten, and a key the form does not send keeps its value.
-- 2. ai_models_save accepts a model list for the new "support" job.

create or replace function public.ai_admin_save(p_autopilot boolean, p_schedule_enabled boolean, p_daily_start time without time zone, p_daily_stop time without time zone, p_auto_on_at timestamp with time zone, p_auto_off_at timestamp with time zone, p_news_interval integer, p_articles_per_run integer, p_daily_budget integer, p_push_daily_limit integer, p_capabilities jsonb, p_reason text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare v_before public.ai_settings; v_email text; v_caps jsonb := '{}'::jsonb; k text;
begin
  if not coalesce(public.staff_roles_authorized(), false) then
    raise exception using errcode = '42501', message = 'ai_settings_forbidden';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) > 500 then
    raise exception using errcode = '22023', message = 'reason_too_long';
  end if;
  if p_capabilities is null or jsonb_typeof(p_capabilities) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_capabilities';
  end if;
  if p_auto_off_at is not null and p_auto_off_at <= now() then
    raise exception using errcode = '22023', message = 'auto_off_in_past';
  end if;
  if p_auto_on_at is not null and p_auto_on_at <= now() then
    raise exception using errcode = '22023', message = 'auto_on_in_past';
  end if;
  select * into v_before from public.ai_settings where id = 1 for update;
  foreach k in array array['news','categories','business_review','enquiry_reply','support_reply','ads','push','breaking','comment_moderation','admin_log_explain'] loop
    v_caps := v_caps || jsonb_build_object(k, case
      when p_capabilities ? k then coalesce((p_capabilities ->> k)::boolean, false)
      else coalesce((v_before.capabilities ->> k)::boolean, false) end);
  end loop;
  select email into v_email from auth.users where id = auth.uid();
  update public.ai_settings set
    autopilot_enabled = p_autopilot,
    schedule_enabled = p_schedule_enabled,
    daily_start = p_daily_start,
    daily_stop = p_daily_stop,
    last_window_state = case when p_daily_start is distinct from v_before.daily_start or p_daily_stop is distinct from v_before.daily_stop or p_schedule_enabled is distinct from v_before.schedule_enabled then null else last_window_state end,
    auto_on_at = p_auto_on_at,
    auto_off_at = p_auto_off_at,
    news_interval_minutes = p_news_interval,
    articles_per_run = p_articles_per_run,
    daily_request_budget = p_daily_budget,
    push_daily_limit = p_push_daily_limit,
    capabilities = v_caps,
    updated_at = now(),
    updated_by = auth.uid()
  where id = 1;
  if v_before.autopilot_enabled is distinct from p_autopilot then
    insert into public.ai_activity (job, action, outcome, title, reason, actor_id)
    values ('schedule', case when p_autopilot then 'autopilot.on' else 'autopilot.off' end, 'done',
      case when p_autopilot then 'Autopilot switched on by ' else 'Autopilot switched off by ' end || coalesce(v_email, 'an administrator'),
      nullif(btrim(coalesce(p_reason, '')), ''), auth.uid());
  end if;
  insert into public.ai_activity (job, action, outcome, title, reason, details, actor_id)
  values ('schedule', 'settings.update', 'done', 'Autopilot settings saved by ' || coalesce(v_email, 'an administrator'),
    nullif(btrim(coalesce(p_reason, '')), ''),
    jsonb_build_object('autopilot', p_autopilot, 'schedule_enabled', p_schedule_enabled, 'daily_start', p_daily_start, 'daily_stop', p_daily_stop,
      'auto_on_at', p_auto_on_at, 'auto_off_at', p_auto_off_at, 'news_interval_minutes', p_news_interval,
      'articles_per_run', p_articles_per_run, 'push_daily_limit', p_push_daily_limit, 'capabilities', v_caps),
    auth.uid());
  perform public.audit_event('staff', 'ai.settings', 'ai_settings', null, 'success',
    jsonb_build_object('autopilot', p_autopilot, 'reason', nullif(btrim(coalesce(p_reason, '')), '')));
end $function$;

create or replace function public.ai_models_save(p_job_models jsonb, p_reason text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_jobs text[] := array['news', 'enquiries', 'support', 'businesses', 'moderation', 'admin_logs'];
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
end $function$;
