-- Separate private visitor corrections from the approved map knowledge source.
begin;
insert into public.capabilities(key, description) values ('map.review', 'Review and verify map corrections and location knowledge') on conflict (key) do nothing;

create table public.map_correction_submissions (
  id uuid primary key default gen_random_uuid(),
  place_name text not null,
  details text not null,
  directions_query text,
  source_note text,
  source_url text,
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint map_correction_submission_status check (status in ('pending','approved','rejected')),
  constraint map_correction_submission_name check (char_length(btrim(place_name)) between 2 and 180),
  constraint map_correction_submission_details check (char_length(btrim(details)) between 2 and 4000),
  constraint map_correction_submission_query check (directions_query is null or char_length(btrim(directions_query)) between 2 and 500),
  constraint map_correction_submission_source_note check (source_note is null or char_length(btrim(source_note)) between 5 and 1200),
  constraint map_correction_submission_source_url check (source_url is null or source_url ~ '^https://[^[:space:]]+$'),
  constraint map_correction_submission_review_state check ((status = 'pending' and reviewed_at is null and reviewed_by is null) or (status <> 'pending' and reviewed_at is not null and reviewed_by is not null))
);
create index map_correction_submissions_queue_idx on public.map_correction_submissions(status, submitted_at);
alter table public.map_correction_submissions enable row level security;
revoke all on public.map_correction_submissions from public, anon, authenticated;
grant select on public.map_correction_submissions to authenticated;
grant insert (place_name,details,directions_query,source_note,source_url,status) on public.map_correction_submissions to service_role;
create policy map_correction_submissions_staff_read on public.map_correction_submissions for select to authenticated using (public.has_capability('map.review'));
-- Intake is performed by the server-side service role only. No public/visitor select or insert grants.

create table public.map_verified_knowledge (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.map_correction_submissions(id) on delete restrict,
  place_name text not null,
  details text not null,
  directions_query text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  source_note text not null,
  verified_at timestamptz not null default now(),
  verified_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active',
  constraint map_verified_status check (status in ('active','inactive')),
  constraint map_verified_name check (char_length(btrim(place_name)) between 2 and 180),
  constraint map_verified_details check (char_length(btrim(details)) between 2 and 4000),
  constraint map_verified_query check (char_length(btrim(directions_query)) between 2 and 500),
  constraint map_verified_source_note check (char_length(btrim(source_note)) between 5 and 1200),
  constraint map_verified_coords_pair check ((latitude is null) = (longitude is null)),
  constraint map_verified_latitude check (latitude is null or latitude between -90 and 90),
  constraint map_verified_longitude check (longitude is null or longitude between -180 and 180),
  constraint map_verified_epe_bounds check (latitude is null or (latitude between 6.4 and 6.76 and longitude between 3.6 and 4.37))
);
create index map_verified_knowledge_active_idx on public.map_verified_knowledge(verified_at desc) where status = 'active';
alter table public.map_verified_knowledge enable row level security;
revoke all on public.map_verified_knowledge from public, anon, authenticated;
grant select (id,place_name,details,directions_query,latitude,longitude,source_note,verified_at,verified_by,status) on public.map_verified_knowledge to service_role;

create or replace function public.map_correction_decide(
 p_submission_id uuid, p_decision text, p_place_name text default null,
 p_details text default null, p_directions_query text default null,
 p_latitude numeric default null, p_longitude numeric default null,
 p_source_note text default null, p_source_url text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_submission public.map_correction_submissions%rowtype; v_knowledge uuid;
begin
 if v_actor is null or not exists (select 1 from auth.users u join public.staff_profiles p on p.user_id=u.id where u.id=v_actor and u.email_confirmed_at is not null and p.is_active) then raise exception using errcode='42501', message='active_verified_staff_required'; end if;
 if not public.has_capability('map.review') then raise exception using errcode='42501', message='map_review_required'; end if;
 if p_decision not in ('approve','reject') then raise exception using errcode='22023', message='invalid_map_correction_decision'; end if;
 select * into v_submission from public.map_correction_submissions where id=p_submission_id for update;
 if not found then raise exception using errcode='P0002', message='map_correction_not_found'; end if;
 if v_submission.status <> 'pending' or v_submission.reviewed_at is not null then raise exception using errcode='40001', message='map_correction_already_reviewed'; end if;
 if p_decision='approve' then
   if p_source_url is null or p_source_url !~ '^https://[^[:space:]]+$' then raise exception using errcode='22023', message='verified_https_source_required'; end if;
   insert into public.map_verified_knowledge(submission_id,place_name,details,directions_query,latitude,longitude,source_note,verified_by)
   values(p_submission_id,coalesce(nullif(btrim(p_place_name),''),v_submission.place_name),coalesce(nullif(btrim(p_details),''),v_submission.details),coalesce(nullif(btrim(p_directions_query),''),v_submission.directions_query),p_latitude,p_longitude,btrim(p_source_note),v_actor) returning id into v_knowledge;
 end if;
 update public.map_correction_submissions set status=case when p_decision='approve' then 'approved' else 'rejected' end, reviewed_at=now(), reviewed_by=v_actor where id=p_submission_id;
 perform public.audit_event('staff','map.correction_decide','map_correction_submission',p_submission_id,'success',jsonb_build_object('decision',p_decision,'knowledge_id',v_knowledge,'source_url',case when p_decision='approve' then p_source_url else null end));
 return v_knowledge;
end; $$;
revoke all on function public.map_correction_decide(uuid,text,text,text,text,numeric,numeric,text,text) from public, anon;
grant execute on function public.map_correction_decide(uuid,text,text,text,numeric,numeric,text,text) to authenticated;

-- The intake endpoint uses this dedicated scope; widen both server-side checks.
create or replace function public.form_rate_limit(p_scope text, p_fingerprint text, p_limit integer default 5, p_global_limit integer default 100)
 returns boolean language plpgsql security definer set search_path to '' as $function$
declare current_bucket timestamptz := pg_catalog.date_trunc('hour', now()); global_count integer; client_count integer;
begin
  if p_scope is null or p_scope not in (
      'newsletter', 'enquiry', 'auth_signup', 'auth_signin', 'auth_reset', 'auth_otp', 'auth_resend', 'auth_password_change',
      'business_submit', 'business_claim', 'tourism_submit', 'gallery_submit', 'history_submit', 'history_correction', 'event_submit',
      'article_correction', 'forum_post', 'song_request', 'moderation_appeal', 'push_subscribe', 'image_upload', 'guest_comment',
      'engagement_like', 'map_assistant', 'map_correction')
    or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$'
    or p_limit is null or p_limit < 1 or p_limit > 100 or p_global_limit is null or p_global_limit < 1 or p_global_limit > 10000
  then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('form-limit:' || p_scope, 0));
  select requests into global_count from public.form_rate_buckets where scope=p_scope and bucket=current_bucket and fingerprint='global';
  select requests into client_count from public.form_rate_buckets where scope=p_scope and bucket=current_bucket and fingerprint=p_fingerprint;
  if coalesce(global_count,0)>=p_global_limit or coalesce(client_count,0)>=p_limit then return false; end if;
  insert into public.form_rate_buckets(scope,bucket,fingerprint,requests) values(p_scope,current_bucket,'global',1),(p_scope,current_bucket,p_fingerprint,1)
    on conflict(scope,bucket,fingerprint) do update set requests=public.form_rate_buckets.requests+1;
  return true;
end; $function$;
revoke all on function public.form_rate_limit(text,text,integer,integer) from public;
grant execute on function public.form_rate_limit(text,text,integer,integer) to anon, authenticated;
grant execute on function public.form_rate_limit(text,text,integer,integer) to service_role;
alter table public.form_rate_buckets drop constraint if exists form_rate_buckets_scope_check;
alter table public.form_rate_buckets add constraint form_rate_buckets_scope_check check (scope = any (array[
  'newsletter','enquiry','auth_signup','auth_signin','auth_reset','auth_otp','auth_resend','auth_password_change',
  'business_submit','business_claim','tourism_submit','gallery_submit','history_submit','history_correction','event_submit',
  'article_correction','forum_post','song_request','moderation_appeal','push_subscribe','image_upload','guest_comment',
  'engagement_like','map_assistant','map_correction']));
commit;
