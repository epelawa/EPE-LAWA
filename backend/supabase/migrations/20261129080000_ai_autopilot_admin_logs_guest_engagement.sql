-- AI Autopilot, admin activity logs, guest comments and likes.
-- Owner request (27 Nov 2026): an AI desk that runs on its own once switched
-- on (news every hour from reputable outlets, business checks, enquiry replies,
-- ad rotation, comment moderation, push), a full audit of everything it did,
-- skipped or escalated, an admin activity log with location and device, and
-- comments/likes without signing in.
--
-- Safety model
--   * The AI never gets new powers of its own. It acts through a dedicated,
--     sign-in-disabled staff identity (created by the app through the Auth admin
--     API with app_metadata.epe_lawa_ai = true) that holds only the capabilities
--     listed in ai_actor_bootstrap, and every write goes through the SAME audited
--     RPCs a human uses (article_create_with_hashtags, article_publish,
--     business_review_decide, business_ad_assign, comment_moderate, ...).
--   * Every ai_* wrapper is callable by service_role only and impersonates the
--     AI identity for that one transaction (set_config(..., is_local => true)).
--   * The 5-minute pg_cron dispatcher posts a single-use nonce to the site, so
--     no shared secret is stored in the database or needed in Vercel.
--   * AI tables and admin logs are readable only by the primary administrators
--     (staff_roles_authorized) and writable only through service_role or RPCs.

-- 1. Rate scopes for signed-out comments and likes ---------------------------
alter table public.form_rate_buckets drop constraint if exists form_rate_buckets_scope_check;
alter table public.form_rate_buckets add constraint form_rate_buckets_scope_check check (scope = any (array[
  'newsletter', 'enquiry',
  'auth_signup', 'auth_signin', 'auth_reset', 'auth_otp', 'auth_resend', 'auth_password_change',
  'business_submit', 'business_claim', 'tourism_submit', 'gallery_submit',
  'history_submit', 'history_correction', 'event_submit', 'article_correction',
  'forum_post', 'song_request', 'moderation_appeal', 'push_subscribe', 'image_upload',
  'guest_comment', 'engagement_like'
]::text[]));

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
      'guest_comment', 'engagement_like'
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
revoke all on function public.form_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.form_rate_limit(text, text, integer, integer) to service_role;

-- 2. AI articles use the existing Editorial Desk author (slug epe-lawa-editorial-desk).

-- 3. AI settings, runs, activity, sources ----------------------------------
create table if not exists public.ai_settings (
  id smallint primary key default 1 check (id = 1),
  autopilot_enabled boolean not null default false,
  schedule_enabled boolean not null default false,
  daily_start time,
  daily_stop time,
  last_window_state boolean,
  auto_on_at timestamptz,
  auto_off_at timestamptz,
  news_interval_minutes integer not null default 60 check (news_interval_minutes between 30 and 1440),
  articles_per_run integer not null default 1 check (articles_per_run between 1 and 6),
  daily_request_budget integer not null default 50 check (daily_request_budget between 5 and 5000),
  push_daily_limit integer not null default 3 check (push_daily_limit between 0 and 20),
  capabilities jsonb not null default jsonb_build_object(
    'news', true, 'categories', true, 'business_review', true, 'enquiry_reply', true,
    'ads', true, 'push', true, 'comment_moderation', true, 'admin_log_explain', true
  ) check (jsonb_typeof(capabilities) = 'object'),
  actor_user_id uuid references auth.users(id) on delete set null,
  model_cache jsonb,
  model_cache_at timestamptz,
  last_news_run_at timestamptz,
  last_ads_run_at timestamptz,
  last_explain_run_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  check (daily_start is null or daily_stop is null or daily_start <> daily_stop)
);
insert into public.ai_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null check (job in ('news', 'enquiries', 'businesses', 'ads', 'moderation', 'admin_logs', 'tick')),
  trigger text not null check (trigger in ('schedule', 'manual')),
  triggered_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed', 'skipped')),
  summary text check (summary is null or char_length(summary) <= 2000),
  stats jsonb not null default '{}'::jsonb check (jsonb_typeof(stats) = 'object')
);
create index if not exists ai_runs_started_idx on public.ai_runs (started_at desc);

create table if not exists public.ai_activity (
  id bigint generated always as identity primary key,
  run_id uuid references public.ai_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  job text not null check (char_length(job) between 2 and 40),
  action text not null check (char_length(action) between 2 and 80),
  outcome text not null check (outcome in ('done', 'skipped', 'escalated', 'failed')),
  resource_type text check (resource_type is null or char_length(resource_type) <= 60),
  resource_id uuid,
  title text check (title is null or char_length(title) <= 300),
  reason text check (reason is null or char_length(reason) <= 4000),
  model text check (model is null or char_length(model) <= 120),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  actor_id uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 1000)
);
create index if not exists ai_activity_created_idx on public.ai_activity (created_at desc);
create index if not exists ai_activity_open_escalations_idx on public.ai_activity (created_at desc) where outcome = 'escalated' and resolved_at is null;

create table if not exists public.ai_model_calls (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  run_id uuid references public.ai_runs(id) on delete set null,
  job text not null,
  model text not null check (char_length(model) <= 120),
  ok boolean not null,
  http_status integer,
  latency_ms integer,
  error text check (error is null or char_length(error) <= 500)
);
create index if not exists ai_model_calls_created_idx on public.ai_model_calls (created_at desc);

create table if not exists public.ai_news_seen (
  url_hash text primary key check (url_hash ~ '^[a-f0-9]{64}$'),
  url text not null check (char_length(url) <= 2048),
  title text not null check (char_length(title) <= 400),
  outlet text not null check (char_length(outlet) <= 80),
  published_at timestamptz,
  first_seen_at timestamptz not null default now(),
  status text not null default 'seen' check (status in ('seen', 'used', 'skipped')),
  article_id uuid references public.articles(id) on delete set null
);
create index if not exists ai_news_seen_first_seen_idx on public.ai_news_seen (first_seen_at desc);

-- Public "how this story was produced" box: outlets and links the AI used.
create table if not exists public.ai_article_meta (
  article_id uuid primary key references public.articles(id) on delete cascade,
  sources jsonb not null check (jsonb_typeof(sources) = 'array' and jsonb_array_length(sources) between 1 and 8),
  model text check (model is null or char_length(model) <= 120),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_tick_nonces (
  nonce text primary key check (nonce ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

-- 4. Admin activity log -------------------------------------------------------
create table if not exists public.admin_activity_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text check (actor_email is null or char_length(actor_email) <= 254),
  event text not null check (event in ('login', 'login_failed', 'logout', 'session_expired', 'page_view', 'action')),
  method text check (method is null or method in ('GET', 'POST', 'HEAD')),
  path text check (path is null or char_length(path) <= 600),
  section text check (section is null or char_length(section) <= 80),
  action_id text check (action_id is null or char_length(action_id) <= 120),
  reason text check (reason is null or char_length(reason) <= 500),
  ip text check (ip is null or char_length(ip) <= 64),
  user_agent text check (user_agent is null or char_length(user_agent) <= 600),
  device text check (device is null or char_length(device) <= 120),
  browser text check (browser is null or char_length(browser) <= 80),
  os text check (os is null or char_length(os) <= 80),
  country text check (country is null or char_length(country) <= 80),
  region text check (region is null or char_length(region) <= 120),
  city text check (city is null or char_length(city) <= 120),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  timezone text check (timezone is null or char_length(timezone) <= 64),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);
create index if not exists admin_activity_log_created_idx on public.admin_activity_log (created_at desc);
create index if not exists admin_activity_log_actor_idx on public.admin_activity_log (actor_id, created_at desc);

create table if not exists public.admin_activity_summaries (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  period_start timestamptz not null,
  period_end timestamptz not null,
  summary text not null check (char_length(summary) between 1 and 6000),
  model text check (model is null or char_length(model) <= 120),
  events integer not null default 0,
  created_at timestamptz not null default now(),
  unique (actor_id, period_start)
);
create index if not exists admin_activity_summaries_period_idx on public.admin_activity_summaries (period_start desc);

-- Foreign keys are indexed (schema test); ai_settings is a one-row singleton and is exempt like stream_config.
create index if not exists ai_activity_run_idx on public.ai_activity (run_id);
create index if not exists ai_activity_actor_idx on public.ai_activity (actor_id);
create index if not exists ai_activity_resolved_by_idx on public.ai_activity (resolved_by);
create index if not exists ai_model_calls_run_idx on public.ai_model_calls (run_id);
create index if not exists ai_news_seen_article_idx on public.ai_news_seen (article_id);
create index if not exists ai_runs_triggered_by_idx on public.ai_runs (triggered_by);
drop trigger if exists ai_settings_set_updated_at on public.ai_settings;
create trigger ai_settings_set_updated_at before update on public.ai_settings
  for each row execute function public.set_updated_at();

-- 5. Read access: primary administrators only; writes via service_role/RPCs --
do $$
declare t text;
begin
  foreach t in array array['ai_settings','ai_runs','ai_activity','ai_model_calls','ai_news_seen','ai_tick_nonces','admin_activity_log','admin_activity_summaries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
  foreach t in array array['ai_settings','ai_runs','ai_activity','ai_model_calls','ai_news_seen','admin_activity_log','admin_activity_summaries'] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_read', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.staff_roles_authorized()))', t || '_admin_read', t);
    execute format('grant select on table public.%I to authenticated', t);
  end loop;
end $$;

alter table public.ai_article_meta enable row level security;
revoke all on table public.ai_article_meta from public, anon, authenticated;
grant all on table public.ai_article_meta to service_role;
grant select (article_id, sources, created_at) on table public.ai_article_meta to anon, authenticated;
drop policy if exists ai_article_meta_public_read on public.ai_article_meta;
create policy ai_article_meta_public_read on public.ai_article_meta for select to anon, authenticated
  using (exists (select 1 from public.articles a where a.id = ai_article_meta.article_id and a.published_version_id is not null));

-- 6. The AI identity -----------------------------------------------------------
create or replace function public.ai_require_service_role()
returns void
language plpgsql
stable
set search_path to ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;
end $$;
revoke all on function public.ai_require_service_role() from public, anon, authenticated;

create or replace function public.ai_actor_bootstrap(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_caps text[] := array['article.create', 'article.publish', 'article.review', 'business.review', 'advertising.manage', 'moderation.review'];
begin
  perform public.ai_require_service_role();
  if not exists (
    select 1 from auth.users u
    where u.id = p_user_id and u.raw_app_meta_data ->> 'epe_lawa_ai' = 'true' and u.email_confirmed_at is not null
  ) then
    raise exception using errcode = '22023', message = 'not_the_ai_actor';
  end if;
  insert into public.staff_profiles (user_id, is_active, must_change_password) values (p_user_id, true, false)
    on conflict (user_id) do update set is_active = true, must_change_password = false;
  insert into public.staff_capability_grants (user_id, capability, granted_by)
    select p_user_id, c, null from unnest(v_caps) as c
    where exists (select 1 from public.capabilities k where k.key = c)
    on conflict (user_id, capability) do update set revoked_at = null;
  -- Anything outside the list is revoked, so the identity never gains powers.
  update public.staff_capability_grants set revoked_at = now()
    where user_id = p_user_id and revoked_at is null and capability <> all (v_caps);
  update public.ai_settings set actor_user_id = p_user_id where id = 1;
end $$;
revoke all on function public.ai_actor_bootstrap(uuid) from public, anon, authenticated;
grant execute on function public.ai_actor_bootstrap(uuid) to service_role;

-- Internal: act as the AI identity for the rest of this transaction only.
create or replace function public.ai_impersonate()
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare v_actor uuid;
begin
  perform public.ai_require_service_role();
  select s.actor_user_id into v_actor from public.ai_settings s
    join auth.users u on u.id = s.actor_user_id and u.raw_app_meta_data ->> 'epe_lawa_ai' = 'true'
    where s.id = 1;
  if v_actor is null then
    raise exception using errcode = '55000', message = 'ai_actor_missing';
  end if;
  perform pg_catalog.set_config('request.jwt.claims', pg_catalog.json_build_object('sub', v_actor, 'role', 'authenticated')::text, true);
  perform pg_catalog.set_config('request.jwt.claim.sub', v_actor::text, true);
  perform pg_catalog.set_config('request.jwt.claim.role', 'authenticated', true);
  return v_actor;
end $$;
revoke all on function public.ai_impersonate() from public, anon, authenticated, service_role;

-- 7. AI wrappers over the existing, audited RPCs ---------------------------------
create or replace function public.ai_publish_article(
  p_title text, p_summary text, p_body jsonb, p_category_id uuid, p_seo_title text, p_seo_description text,
  p_cover_url text, p_cover_alt text, p_cover_credit text, p_cover_source_url text, p_cover_license_url text, p_cover_caption text,
  p_tags text[], p_sources jsonb, p_model text, p_publish boolean
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare v_author uuid; v_id uuid; v_revision bigint; v_slug text;
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
  select a.revision, a.slug::text into v_revision, v_slug from public.articles a where a.id = v_id;
  -- Autopilot publishes at once; otherwise the draft waits for a human editor.
  if coalesce(p_publish, false) then
    perform public.article_publish(v_id, v_revision);
  end if;
  insert into public.ai_article_meta (article_id, sources, model) values (v_id, p_sources, left(p_model, 120));
  return jsonb_build_object('id', v_id, 'slug', v_slug, 'published', coalesce(p_publish, false));
end $$;

create or replace function public.ai_category_create(p_label text, p_description text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare v_slug text; v_id uuid; v_sort integer;
begin
  perform public.ai_require_service_role();
  v_slug := pg_catalog.btrim(pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(coalesce(p_label, ''))), '[^a-z0-9]+', '-', 'g'), '-');
  if v_slug = '' or char_length(btrim(coalesce(p_label, ''))) not between 3 and 40 then
    raise exception using errcode = '22023', message = 'invalid_category';
  end if;
  select c.id into v_id from public.categories c where c.slug::text = v_slug;
  if v_id is not null then return v_id; end if;
  select coalesce(max(c.sort_order), 0) + 1 into v_sort from public.categories c;
  perform public.ai_impersonate();
  return public.newsroom_category_save(null, v_slug, btrim(p_label), left(btrim(coalesce(p_description, '')), 500), v_sort, true);
end $$;

create or replace function public.ai_business_decide(p_business_id uuid, p_status text, p_note text, p_evidence text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.ai_require_service_role();
  perform public.ai_impersonate();
  perform public.business_review_decide(p_business_id, p_status, p_note, p_evidence);
end $$;

create or replace function public.ai_ad_assign(p_business_id uuid, p_position integer)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.ai_require_service_role();
  perform public.ai_impersonate();
  return public.business_ad_assign(p_business_id, p_position, true);
end $$;

create or replace function public.ai_ad_remove(p_slot_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.ai_require_service_role();
  perform public.ai_impersonate();
  perform public.business_ad_remove(p_slot_id);
end $$;

create or replace function public.ai_comment_hide(p_comment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.ai_require_service_role();
  perform public.ai_impersonate();
  perform public.comment_moderate(p_comment_id, 'hide', p_reason);
end $$;

-- Enquiry replies are sent by the app (with an AI disclosure); this records it.
create or replace function public.ai_enquiry_resolve(p_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare v_id uuid;
begin
  perform public.ai_require_service_role();
  if char_length(btrim(coalesce(p_note, ''))) not between 5 and 1000 then
    raise exception using errcode = '22023', message = 'invalid_note';
  end if;
  update public.private_enquiries set status = 'resolved', revision = revision + 1
    where id = p_id and status = 'open' returning id into v_id;
  if v_id is null then
    raise exception using errcode = '40001', message = 'enquiry_conflict';
  end if;
  perform public.audit_event('system', 'enquiry.ai_reply', 'private_enquiry', v_id, 'success', jsonb_build_object('note', btrim(p_note)));
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'ai_publish_article(text,text,jsonb,uuid,text,text,text,text,text,text,text,text,text[],jsonb,text,boolean)',
    'ai_category_create(text,text)', 'ai_business_decide(uuid,text,text,text)',
    'ai_ad_assign(uuid,integer)', 'ai_ad_remove(uuid)', 'ai_comment_hide(uuid,text)', 'ai_enquiry_resolve(uuid,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- 8. Schedule, dispatcher and nonces ------------------------------------------
create or replace function public.ai_log_schedule(p_action text, p_reason text)
returns void
language sql
security definer
set search_path to ''
as $$
  insert into public.ai_activity (job, action, outcome, title, reason)
  values ('schedule', p_action, 'done', case when p_action = 'autopilot.on' then 'Autopilot switched on' else 'Autopilot switched off' end, p_reason);
$$;
revoke all on function public.ai_log_schedule(text, text) from public, anon, authenticated;

-- Applies the one-off switch-on/off times and the daily Lagos-time window.
-- The window acts only at its edges, so an administrator can still override
-- it by hand between edges.
create or replace function public.ai_apply_schedule()
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
declare s public.ai_settings; v_on boolean; v_local time; v_want boolean;
begin
  select * into s from public.ai_settings where id = 1 for update;
  if not found then return false; end if;
  v_on := s.autopilot_enabled;
  -- One-off times, applied in the order they fell due (the later one wins).
  if s.auto_on_at is not null and s.auto_on_at <= now() and s.auto_off_at is not null and s.auto_off_at <= now() then
    v_want := s.auto_on_at > s.auto_off_at;
    if v_want is distinct from v_on then
      perform public.ai_log_schedule(case when v_want then 'autopilot.on' else 'autopilot.off' end,
        'Both scheduled times had passed; the later one (' || to_char(greatest(s.auto_on_at, s.auto_off_at) at time zone 'Africa/Lagos', 'DD Mon YYYY HH24:MI') || ' WAT) was applied.');
    end if;
    v_on := v_want;
    update public.ai_settings set auto_on_at = null, auto_off_at = null where id = 1;
  elsif s.auto_on_at is not null and s.auto_on_at <= now() then
    if not v_on then perform public.ai_log_schedule('autopilot.on', 'Switched on at the time an administrator scheduled (' || to_char(s.auto_on_at at time zone 'Africa/Lagos', 'DD Mon YYYY HH24:MI') || ' WAT).'); end if;
    v_on := true;
    update public.ai_settings set auto_on_at = null where id = 1;
  elsif s.auto_off_at is not null and s.auto_off_at <= now() then
    if v_on then perform public.ai_log_schedule('autopilot.off', 'Shut down automatically at the time an administrator scheduled (' || to_char(s.auto_off_at at time zone 'Africa/Lagos', 'DD Mon YYYY HH24:MI') || ' WAT).'); end if;
    v_on := false;
    update public.ai_settings set auto_off_at = null where id = 1;
  end if;
  if s.schedule_enabled and s.daily_start is not null and s.daily_stop is not null then
    v_local := (now() at time zone 'Africa/Lagos')::time;
    v_want := case when s.daily_start < s.daily_stop
      then v_local >= s.daily_start and v_local < s.daily_stop
      else v_local >= s.daily_start or v_local < s.daily_stop end;
    if s.last_window_state is distinct from v_want then
      if v_want and not v_on then
        perform public.ai_log_schedule('autopilot.on', 'Daily schedule: working hours started at ' || to_char(s.daily_start, 'HH24:MI') || ' WAT.');
      elsif not v_want and v_on then
        perform public.ai_log_schedule('autopilot.off', 'Daily schedule: working hours ended at ' || to_char(s.daily_stop, 'HH24:MI') || ' WAT.');
      end if;
      v_on := v_want;
      update public.ai_settings set last_window_state = v_want where id = 1;
    end if;
  end if;
  if v_on is distinct from s.autopilot_enabled then
    update public.ai_settings set autopilot_enabled = v_on, updated_at = now() where id = 1;
  end if;
  return v_on;
end $$;
revoke all on function public.ai_apply_schedule() from public, anon, authenticated;
grant execute on function public.ai_apply_schedule() to service_role;

create or replace function public.ai_tick_dispatch()
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare v_on boolean; v_origin text; v_nonce text;
begin
  v_on := public.ai_apply_schedule();
  delete from public.ai_tick_nonces where created_at < now() - interval '1 day';
  if not v_on then return; end if;
  select site_origin into v_origin from public.push_schedule_settings where id = 1;
  v_origin := coalesce(nullif(v_origin, ''), 'https://epelawa.vercel.app');
  if v_origin !~ '^https://[a-z0-9.-]+$' then return; end if;
  v_nonce := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.ai_tick_nonces (nonce) values (v_nonce);
  perform net.http_post(
    url := v_origin || '/api/ai/tick',
    body := jsonb_build_object('nonce', v_nonce),
    headers := '{"content-type":"application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
end $$;
revoke all on function public.ai_tick_dispatch() from public, anon, authenticated;

create or replace function public.ai_tick_consume(p_nonce text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
declare v_found text;
begin
  perform public.ai_require_service_role();
  if p_nonce is null or p_nonce !~ '^[a-f0-9]{64}$' then return false; end if;
  update public.ai_tick_nonces set consumed_at = now()
    where nonce = p_nonce and consumed_at is null and created_at > now() - interval '10 minutes'
    returning nonce into v_found;
  return v_found is not null;
end $$;
revoke all on function public.ai_tick_consume(text) from public, anon, authenticated;
grant execute on function public.ai_tick_consume(text) to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'epe-ai-autopilot-tick') then
      perform cron.unschedule('epe-ai-autopilot-tick');
    end if;
    perform cron.schedule('epe-ai-autopilot-tick', '*/5 * * * *', 'select public.ai_tick_dispatch()');
  end if;
end $$;

-- 9. Administrator controls --------------------------------------------------
create or replace function public.ai_admin_save(
  p_autopilot boolean, p_schedule_enabled boolean, p_daily_start time, p_daily_stop time,
  p_auto_on_at timestamptz, p_auto_off_at timestamptz, p_news_interval integer, p_articles_per_run integer,
  p_daily_budget integer, p_push_daily_limit integer, p_capabilities jsonb, p_reason text
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
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
  foreach k in array array['news','categories','business_review','enquiry_reply','ads','push','comment_moderation','admin_log_explain'] loop
    v_caps := v_caps || jsonb_build_object(k, coalesce((p_capabilities ->> k)::boolean, false));
  end loop;
  if p_auto_off_at is not null and p_auto_off_at <= now() then
    raise exception using errcode = '22023', message = 'auto_off_in_past';
  end if;
  if p_auto_on_at is not null and p_auto_on_at <= now() then
    raise exception using errcode = '22023', message = 'auto_on_in_past';
  end if;
  select * into v_before from public.ai_settings where id = 1 for update;
  select email into v_email from auth.users where id = auth.uid();
  update public.ai_settings set
    autopilot_enabled = p_autopilot,
    schedule_enabled = p_schedule_enabled,
    daily_start = p_daily_start,
    daily_stop = p_daily_stop,
    -- A new window starts fresh, so its next edge is honoured.
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
      'articles_per_run', p_articles_per_run, 'daily_request_budget', p_daily_budget, 'push_daily_limit', p_push_daily_limit, 'capabilities', v_caps),
    auth.uid());
  perform public.audit_event('staff', 'ai.settings', 'ai_settings', null, 'success',
    jsonb_build_object('autopilot', p_autopilot, 'reason', nullif(btrim(coalesce(p_reason, '')), '')));
end $$;
revoke all on function public.ai_admin_save(boolean,boolean,time,time,timestamptz,timestamptz,integer,integer,integer,integer,jsonb,text) from public, anon;
grant execute on function public.ai_admin_save(boolean,boolean,time,time,timestamptz,timestamptz,integer,integer,integer,integer,jsonb,text) to authenticated;

create or replace function public.ai_activity_resolve(p_id bigint, p_note text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not coalesce(public.staff_roles_authorized(), false) then
    raise exception using errcode = '42501', message = 'ai_activity_forbidden';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) not between 3 and 1000 then
    raise exception using errcode = '22023', message = 'invalid_note';
  end if;
  update public.ai_activity set resolved_at = now(), resolved_by = auth.uid(), resolution_note = btrim(p_note)
    where id = p_id and outcome = 'escalated' and resolved_at is null;
  if not found then
    raise exception using errcode = '40001', message = 'ai_activity_conflict';
  end if;
  perform public.audit_event('staff', 'ai.escalation_resolve', 'ai_activity', null, 'success', jsonb_build_object('activity_id', p_id, 'note', btrim(p_note)));
end $$;
revoke all on function public.ai_activity_resolve(bigint, text) from public, anon;
grant execute on function public.ai_activity_resolve(bigint, text) to authenticated;

-- Admin log readers see who did what in audit_events too (actor email join).
create or replace function public.admin_audit_feed(p_since timestamptz, p_until timestamptz, p_actor uuid default null)
returns table (id bigint, created_at timestamptz, actor_id uuid, actor_email text, actor_kind text, action text, resource_type text, resource_id uuid, outcome text, metadata jsonb)
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  if not coalesce(public.staff_roles_authorized(), false) then
    raise exception using errcode = '42501', message = 'admin_logs_forbidden';
  end if;
  return query
    select e.id, e.created_at, e.actor_id, u.email::text, e.actor_kind, e.action, e.resource_type, e.resource_id, e.outcome, e.metadata
    from public.audit_events e left join auth.users u on u.id = e.actor_id
    where e.created_at >= p_since and e.created_at < p_until
      and e.actor_kind in ('staff', 'system')
      and (p_actor is null or e.actor_id = p_actor)
    order by e.created_at desc
    limit 1000;
end $$;
revoke all on function public.admin_audit_feed(timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.admin_audit_feed(timestamptz, timestamptz, uuid) to authenticated, service_role;

-- 10. Guest comments, comment likes and article likes ------------------------
alter table public.comments add column if not exists guest_name text;
alter table public.comments add column if not exists guest_key text;
alter table public.comments drop constraint if exists comments_guest_name_check;
alter table public.comments add constraint comments_guest_name_check check (guest_name is null or char_length(btrim(guest_name)) between 2 and 60);
alter table public.comments drop constraint if exists comments_guest_key_check;
alter table public.comments add constraint comments_guest_key_check check (guest_key is null or guest_key ~ '^[a-f0-9]{64}$');
grant select (guest_name) on table public.comments to anon, authenticated;

create or replace function public.comment_post_guest(p_article_id uuid, p_parent_id uuid, p_body text, p_name text, p_guest_key text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare v_id uuid; v_name text := nullif(btrim(coalesce(p_name, '')), '');
begin
  perform public.ai_require_service_role();
  if p_guest_key is null or p_guest_key !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'guest_key_invalid';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception using errcode = '22023', message = 'comment_length';
  end if;
  if v_name is not null and char_length(v_name) not between 2 and 60 then
    raise exception using errcode = '22023', message = 'guest_name_length';
  end if;
  if not exists (select 1 from public.articles a where a.id = p_article_id and a.published_version_id is not null) then
    raise exception using errcode = '22023', message = 'article_not_published';
  end if;
  insert into public.comments (article_id, parent_id, author_id, body, guest_name, guest_key)
  values (p_article_id, p_parent_id, null, btrim(p_body), v_name, p_guest_key)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.comment_delete_guest(p_comment_id uuid, p_guest_key text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.ai_require_service_role();
  update public.comments set state = 'deleted', body = '', deleted_at = now(), updated_at = now()
    where id = p_comment_id and guest_key = p_guest_key and author_id is null and state = 'visible';
  if not found then
    raise exception using errcode = '42501', message = 'comment_delete_denied';
  end if;
end $$;

create table if not exists public.comment_guest_votes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  voter_key text not null check (voter_key ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  primary key (comment_id, voter_key)
);
alter table public.comment_guest_votes enable row level security;
revoke all on table public.comment_guest_votes from public, anon, authenticated;
grant all on table public.comment_guest_votes to service_role;

create or replace function public.comment_guest_vote_toggle(p_comment_id uuid, p_voter_key text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.ai_require_service_role();
  if p_voter_key is null or p_voter_key !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'voter_key_invalid';
  end if;
  if not exists (
    select 1 from public.comments c join public.articles a on a.id = c.article_id
    where c.id = p_comment_id and c.state = 'visible' and a.published_version_id is not null
  ) then
    raise exception using errcode = '22023', message = 'comment_not_votable';
  end if;
  delete from public.comment_guest_votes where comment_id = p_comment_id and voter_key = p_voter_key;
  if found then return false; end if;
  insert into public.comment_guest_votes (comment_id, voter_key) values (p_comment_id, p_voter_key);
  return true;
end $$;

create or replace function public.comment_vote_totals(p_comment_ids uuid[])
returns table (comment_id uuid, total bigint)
language sql
stable
security definer
set search_path to ''
as $$
  with ids as (
    select distinct c.id from public.comments c join public.articles a on a.id = c.article_id
    where c.id = any ((coalesce(p_comment_ids, array[]::uuid[]))[1:500]) and c.state = 'visible' and a.published_version_id is not null
  )
  select ids.id,
    (select count(*) from public.comment_votes v where v.comment_id = ids.id)
    + (select count(*) from public.comment_guest_votes g where g.comment_id = ids.id)
  from ids;
$$;

create or replace function public.comment_guest_voted(p_comment_ids uuid[], p_voter_key text)
returns setof uuid
language sql
stable
security definer
set search_path to ''
as $$
  select g.comment_id from public.comment_guest_votes g
  where g.voter_key = p_voter_key and g.comment_id = any ((coalesce(p_comment_ids, array[]::uuid[]))[1:500]);
$$;

create table if not exists public.article_likes (
  article_id uuid not null references public.articles(id) on delete cascade,
  voter_key text not null check (voter_key ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  primary key (article_id, voter_key)
);
alter table public.article_likes enable row level security;
revoke all on table public.article_likes from public, anon, authenticated;
grant all on table public.article_likes to service_role;

create or replace function public.article_like_toggle(p_article_id uuid, p_voter_key text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.ai_require_service_role();
  if p_voter_key is null or p_voter_key !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'voter_key_invalid';
  end if;
  if not exists (select 1 from public.articles a where a.id = p_article_id and a.published_version_id is not null) then
    raise exception using errcode = '22023', message = 'article_not_published';
  end if;
  delete from public.article_likes where article_id = p_article_id and voter_key = p_voter_key;
  if found then return false; end if;
  insert into public.article_likes (article_id, voter_key) values (p_article_id, p_voter_key);
  return true;
end $$;

create or replace function public.article_like_total(p_article_id uuid)
returns bigint
language sql
stable
security definer
set search_path to ''
as $$
  select count(*) from public.article_likes l join public.articles a on a.id = l.article_id
  where l.article_id = p_article_id and a.published_version_id is not null;
$$;

create or replace function public.article_like_state(p_article_id uuid, p_voter_key text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (select 1 from public.article_likes where article_id = p_article_id and voter_key = p_voter_key);
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'comment_post_guest(uuid,uuid,text,text,text)', 'comment_delete_guest(uuid,text)',
    'comment_guest_vote_toggle(uuid,text)', 'comment_guest_voted(uuid[],text)',
    'article_like_toggle(uuid,text)', 'article_like_state(uuid,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
  foreach f in array array['comment_vote_totals(uuid[])', 'article_like_total(uuid)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated, service_role', f);
  end loop;
end $$;
