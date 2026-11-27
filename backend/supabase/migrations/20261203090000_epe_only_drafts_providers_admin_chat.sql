-- Turn 26 (owner): EPE LAWA covers Epe Division only, with no news categories.
-- The AI desk only saves drafts. Free models can come from several providers.
-- Administrators get an AI chat whose risky actions wait for a confirmation.

-- 1. One news section. The schema still needs a category on every article, so
--    every story goes into "Epe Division" and the old sections are switched off.
insert into public.categories (slug, label, description, sort_order, is_active)
values ('epe-division', 'Epe Division', 'News from Epe Division: Epe and Ibeju-Lekki local governments and their LCDAs.', 0, true)
on conflict (slug) do update set label = excluded.label, description = excluded.description, sort_order = 0, is_active = true;

update public.categories set is_active = false where slug <> 'epe-division' and is_active;

-- 2. The AI never publishes news. p_publish is kept so older callers still
--    work, but it is ignored: every AI story and re-edit waits for an editor.
create or replace function public.ai_publish_article(p_title text, p_summary text, p_body jsonb, p_category_id uuid, p_seo_title text, p_seo_description text, p_cover_url text, p_cover_alt text, p_cover_credit text, p_cover_source_url text, p_cover_license_url text, p_cover_caption text, p_tags text[], p_sources jsonb, p_model text, p_publish boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_author uuid; v_id uuid; v_slug text;
begin
  perform public.ai_require_service_role();
  if p_sources is null or jsonb_typeof(p_sources) <> 'array' or jsonb_array_length(p_sources) not between 1 and 8
     or exists (
       select 1 from jsonb_array_elements(p_sources) s
       where jsonb_typeof(s) <> 'object' or not public.news_cover_url_is_safe(s ->> 'url')
         or coalesce(char_length(btrim(s ->> 'outlet')), 0) not between 2 and 80
     ) then
    raise exception using errcode = '22023', message = 'ai_sources_invalid';
  end if;
  select a.id into v_author from public.authors a where a.slug = 'epe-lawa-editorial-desk';
  if v_author is null then
    raise exception using errcode = '55000', message = 'editorial_desk_missing';
  end if;
  perform public.ai_impersonate();
  v_id := public.article_create_with_hashtags(
    p_title, p_summary, p_body, v_author, p_category_id, p_seo_title, p_seo_description,
    p_cover_url, p_cover_alt, p_cover_credit, p_cover_source_url, p_cover_license_url, p_cover_caption,
    coalesce(p_tags, array[]::text[])
  );
  select a.slug::text into v_slug from public.articles a where a.id = v_id;
  -- Drafts only (owner's rule): an editor checks and publishes every AI story.
  insert into public.ai_article_meta (article_id, sources, model) values (v_id, p_sources, left(p_model, 120));
  return jsonb_build_object('id', v_id, 'slug', v_slug, 'published', false);
end $function$;

create or replace function public.ai_revise_article(p_article_id uuid, p_title text, p_summary text, p_body jsonb, p_category_id uuid, p_seo_title text, p_seo_description text, p_cover_url text, p_cover_alt text, p_cover_credit text, p_cover_source_url text, p_cover_license_url text, p_cover_caption text, p_tags text[], p_model text, p_publish boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_author uuid; v_revision bigint; v_slug text;
begin
  perform public.ai_require_service_role();
  if not exists (select 1 from public.ai_article_meta m where m.article_id = p_article_id) then
    raise exception using errcode = '42501', message = 'not_an_ai_article';
  end if;
  select a.id into v_author from public.authors a where a.slug = 'epe-lawa-editorial-desk';
  if v_author is null then
    raise exception using errcode = '55000', message = 'editorial_desk_missing';
  end if;
  perform public.ai_impersonate();
  select a.revision, a.slug::text into v_revision, v_slug
    from public.articles a where a.id = p_article_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'article_not_found';
  end if;
  -- A new working version only; the published version (if any) is unchanged
  -- until an editor publishes the re-edit.
  perform public.article_revise_with_cover(
    p_article_id, v_revision, p_title, p_summary, p_body, v_author, p_category_id, p_seo_title, p_seo_description,
    p_cover_url, p_cover_alt, p_cover_credit, p_cover_source_url, p_cover_license_url, p_cover_caption
  );
  begin
    perform public.article_tags_save(p_article_id, coalesce(p_tags, array[]::text[]));
  exception when others then
    null; -- tags are optional; a missing capability must not lose the re-edit
  end;
  update public.ai_article_meta
     set revised_at = now(), revise_note = 'Re-edit saved as a draft for an editor.',
         model = left(coalesce(p_model, model), 120)
   where article_id = p_article_id;
  return jsonb_build_object('id', p_article_id, 'slug', v_slug, 'published', false);
end $function$;

-- The AI no longer creates news sections.
revoke execute on function public.ai_category_create from public, anon, authenticated, service_role;

-- 3. Free models from OpenRouter ("vendor/model:free") or from another
--    provider's free tier ("provider@model").
create or replace function public.ai_models_save(p_job_models jsonb, p_reason text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_jobs text[] := array['news', 'enquiries', 'support', 'businesses', 'moderation', 'admin_logs', 'chat', 'directions'];
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
            or not (
              (m #>> '{}') ~ '^[A-Za-z0-9._~-]+/[A-Za-z0-9._~/-]+:free$'
              or (m #>> '{}') ~ '^(kilo|gemini|groq|cerebras|mistral)@[A-Za-z0-9._~/:-]+$'
            )
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

-- 4. Admin AI chat: the conversation and the actions it proposes. Only the
--    server (service role, after the primary-admin check) reads or writes these.
create table if not exists public.ai_admin_chat_messages (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'ai')),
  content text not null check (char_length(content) between 1 and 8000),
  action_id uuid,
  model text,
  created_at timestamptz not null default now()
);
create index if not exists ai_admin_chat_messages_admin_idx on public.ai_admin_chat_messages (admin_id, created_at desc);

create table if not exists public.ai_admin_chat_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users (id) on delete cascade,
  request text not null check (char_length(request) between 1 and 2000),
  plan jsonb not null,
  needs_confirm boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'done', 'partial', 'failed', 'cancelled', 'expired')),
  result jsonb,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists ai_admin_chat_actions_admin_idx on public.ai_admin_chat_actions (admin_id, created_at desc);

alter table public.ai_admin_chat_messages enable row level security;
alter table public.ai_admin_chat_actions enable row level security;
revoke all on public.ai_admin_chat_messages from public, anon, authenticated;
revoke all on public.ai_admin_chat_actions from public, anon, authenticated;
grant select, insert, update, delete on public.ai_admin_chat_messages to service_role;
grant select, insert, update, delete on public.ai_admin_chat_actions to service_role;

-- 5. The public map assistant (Epe directions) is rate limited like the forms:
--    a few questions per network each hour, with a site-wide ceiling.
create or replace function public.form_rate_limit(p_scope text, p_fingerprint text, p_limit integer default 5, p_global_limit integer default 100)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare current_bucket timestamptz := pg_catalog.date_trunc('hour', now()); global_count integer; client_count integer;
begin
  if p_scope is null
    or p_scope not in (
      'newsletter', 'enquiry',
      'auth_signup', 'auth_signin', 'auth_reset', 'auth_otp', 'auth_resend', 'auth_password_change',
      'business_submit', 'business_claim', 'tourism_submit', 'gallery_submit',
      'history_submit', 'history_correction', 'event_submit', 'article_correction',
      'forum_post', 'song_request', 'moderation_appeal', 'push_subscribe', 'image_upload',
      'guest_comment', 'engagement_like', 'map_assistant'
    )
    or p_fingerprint is null
    or p_fingerprint !~ '^[a-f0-9]{64}$'
    or p_limit is null or p_limit < 1 or p_limit > 100
    or p_global_limit is null or p_global_limit < 1 or p_global_limit > 10000
  then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('form-limit:' || p_scope, 0));
  select requests into global_count from public.form_rate_buckets where scope = p_scope and bucket = current_bucket and fingerprint = 'global';
  select requests into client_count from public.form_rate_buckets where scope = p_scope and bucket = current_bucket and fingerprint = p_fingerprint;
  if coalesce(global_count, 0) >= p_global_limit or coalesce(client_count, 0) >= p_limit then return false; end if;
  insert into public.form_rate_buckets(scope,bucket,fingerprint,requests) values(p_scope,current_bucket,'global',1),(p_scope,current_bucket,p_fingerprint,1)
    on conflict(scope,bucket,fingerprint) do update set requests = public.form_rate_buckets.requests + 1;
  return true;
end; $function$;

alter table public.form_rate_buckets drop constraint if exists form_rate_buckets_scope_check;
alter table public.form_rate_buckets add constraint form_rate_buckets_scope_check
  check (scope = any (array['newsletter', 'enquiry', 'auth_signup', 'auth_signin', 'auth_reset', 'auth_otp', 'auth_resend', 'auth_password_change',
    'business_submit', 'business_claim', 'tourism_submit', 'gallery_submit', 'history_submit', 'history_correction', 'event_submit',
    'article_correction', 'forum_post', 'song_request', 'moderation_appeal', 'push_subscribe', 'image_upload', 'guest_comment',
    'engagement_like', 'map_assistant']));
