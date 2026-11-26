-- EPE LAWA — public (guest) submissions, submission images, event review and
-- Ìtàn Ilú Mi correction requests. Forward-only and additive.
--
-- Why:
--  * Business, event, Ìtàn Ilú Mi and tourism submissions must work without an
--    account. Guest rows carry a contact name and email instead of a profile id.
--    Guest rows are written only by the server (service role) behind the
--    per-network form limiter; no new anon grants are added here.
--  * A staff/admin account has no member profile, so the profile foreign keys
--    rejected their submissions (surfaced as "could not confirm whether the
--    submission was saved"). Those accounts now submit as contacts.
--  * Events and Ìtàn Ilú Mi contributions can include one reviewed image.
--  * Event submissions had no staff queue; events.review is added and the
--    existing staff_event_decide accepts it.
--  * Ìtàn Ilú Mi correction/removal requests get their own private queue instead
--    of the general enquiries inbox.

-- 0. Regex repairs ------------------------------------------------------------------
-- PostgreSQL rejects bounded repeats above 255 ("invalid regular expression") and
-- only compiles a pattern when it is first evaluated. These patterns therefore
-- failed at runtime:
--   * businesses_logo_key_format / business_submit / business_staff_create:
--     every listing with a logo raised an error, which the public form reported as
--     "We could not confirm whether the submission was saved".
--   * push_subscription_register: every browser push subscription raised an error,
--     so no member could ever subscribe.
-- Lengths are now checked with char_length and the patterns use unbounded repeats.
alter table public.businesses drop constraint if exists businesses_logo_key_format;
alter table public.businesses add constraint businesses_logo_key_format
  check (logo_key is null or (char_length(logo_key) <= 608 and logo_key ~ '^(https://[^[:space:]]{3,}|[a-z0-9][a-z0-9/._-]{2,})$'));

create or replace function public.business_submit(p_name text, p_category_id uuid, p_description text, p_area text, p_address text, p_landmark text, p_phone text, p_whatsapp text, p_email text, p_website text, p_hours jsonb, p_logo_key text default null::text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare v_id uuid:=gen_random_uuid();
begin
  if auth.uid() is null or not public.is_member_active() or public.is_member_banned() then
    raise exception using errcode='42501',message='member_profile_required';
  end if;
  if p_logo_key is not null and (char_length(p_logo_key) > 608 or p_logo_key !~ '^(https://[^[:space:]]{3,}|[a-z0-9][a-z0-9/._-]{2,})$') then
    raise exception using errcode='22023',message='business_logo_invalid';
  end if;
  insert into public.businesses(id,slug,owner_user_id,name,category_id,description,area,address,landmark,phone,whatsapp,email,website,hours,logo_key,status)
  values(v_id,public.slugify(p_name)||'-'||substr(replace(v_id::text,'-',''),1,6),auth.uid(),btrim(p_name),p_category_id,p_description,p_area,p_address,p_landmark,p_phone,p_whatsapp,p_email,p_website,p_hours,nullif(btrim(coalesce(p_logo_key,'')),''),'submitted');
  perform public.audit_event('member','business.submit','business',v_id,'success',jsonb_build_object('name',btrim(p_name),'category_id',p_category_id));
  return v_id;
end;
$function$;

create or replace function public.business_staff_create(p_name text, p_category_id uuid, p_description text, p_area text, p_address text, p_landmark text, p_phone text, p_whatsapp text, p_email text, p_website text, p_hours jsonb, p_verify boolean, p_evidence text, p_logo_key text default null::text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_id    uuid := gen_random_uuid();
  v_base  text;
  v_slug  text;
  v_n     integer := 1;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  perform public.require_capability('business.review');
  if p_name is null or char_length(btrim(p_name)) not between 2 and 160 then
    raise exception using errcode = '22023', message = 'business_name_invalid';
  end if;
  if not exists (select 1 from public.business_categories c where c.id = p_category_id and c.is_active) then
    raise exception using errcode = '23503', message = 'business_category_unavailable';
  end if;
  if p_hours is not null and jsonb_typeof(p_hours) <> 'object' then
    raise exception using errcode = '22023', message = 'business_hours_invalid';
  end if;
  if p_verify and (p_evidence is null or char_length(btrim(p_evidence)) not between 10 and 2000) then
    raise exception using errcode = '22023', message = 'verification_evidence_required';
  end if;
  if p_logo_key is not null and (char_length(p_logo_key) > 608 or p_logo_key !~ '^(https://[^[:space:]]{3,}|[a-z0-9][a-z0-9/._-]{2,})$') then
    raise exception using errcode = '22023', message = 'business_logo_invalid';
  end if;
  v_base := coalesce(public.slugify(btrim(p_name)), 'business');
  v_slug := v_base;
  loop
    exit when not exists (select 1 from public.businesses b where b.slug = v_slug);
    v_n := v_n + 1;
    if v_n > 50 then
      v_slug := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
      exit;
    end if;
    v_slug := v_base || '-' || v_n::text;
  end loop;
  insert into public.businesses (
    slug, owner_user_id, name, category_id, description, area, address, landmark,
    phone, whatsapp, email, website, hours, logo_key, status, published_at
  ) values (
    v_slug, null, btrim(p_name), p_category_id,
    nullif(btrim(coalesce(p_description, '')), ''),
    nullif(btrim(coalesce(p_area, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    nullif(btrim(coalesce(p_landmark, '')), ''),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_whatsapp, '')), ''),
    nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(p_website, '')), ''),
    p_hours,
    nullif(btrim(coalesce(p_logo_key, '')), ''),
    'published',
    now()
  ) returning id into v_id;
  if p_verify then
    insert into public.business_verifications (business_id, verified_by, note)
    values (v_id, v_actor, btrim(p_evidence));
  end if;
  perform public.audit_event('staff', 'business.staff_create', 'business', v_id, 'success',
    jsonb_build_object('name', btrim(p_name), 'category_id', p_category_id, 'verified', coalesce(p_verify, false)));
  return v_id;
end;
$function$;

create or replace function public.push_subscription_register(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null::text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select auth.uid()) is null or not public.is_member_active() then return false; end if;
  if p_endpoint is null
     or p_endpoint !~ '^https://'
     or p_endpoint ~ '^https://localhost'
     or char_length(p_endpoint) > 2048
     or p_p256dh is null or char_length(p_p256dh) not between 40 and 512 or p_p256dh !~ '^[A-Za-z0-9_-]+$'
     or p_auth is null or char_length(p_auth) not between 8 and 512 or p_auth !~ '^[A-Za-z0-9_-]+$'
  then return false; end if;
  if p_user_agent is not null and char_length(p_user_agent) > 500 then
    p_user_agent := left(p_user_agent, 500);
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id <> (select auth.uid());
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, last_used_at)
    values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, p_user_agent, now())
    on conflict (endpoint) do update
      set p256dh = excluded.p256dh,
          auth = excluded.auth,
          user_agent = excluded.user_agent,
          failed_count = 0,
          last_used_at = now();
  return true;
end;
$function$;

-- 1. Guest contact columns -------------------------------------------------------
alter table public.businesses
  add column if not exists submitter_name text,
  add column if not exists submitter_email text;

alter table public.events
  alter column submitter_id drop not null,
  add column if not exists submitter_name text,
  add column if not exists submitter_email text,
  add column if not exists image_key text,
  add column if not exists image_alt text;

alter table public.history_contributions
  alter column contributor_id drop not null,
  add column if not exists submitter_name text,
  add column if not exists submitter_email text,
  add column if not exists image_key text,
  add column if not exists image_alt text;

alter table public.tourism_submissions
  alter column contributor_id drop not null,
  add column if not exists submitter_name text,
  add column if not exists submitter_email text;

alter table public.history_records
  add column if not exists image_key text,
  add column if not exists image_alt text;

do $$
declare
  t text;
begin
  foreach t in array array['businesses', 'events', 'history_contributions', 'tourism_submissions'] loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_submitter_name_len');
    execute format('alter table public.%I add constraint %I check (submitter_name is null or char_length(btrim(submitter_name)) between 2 and 100)', t, t || '_submitter_name_len');
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_submitter_email_fmt');
    execute format($c$alter table public.%I add constraint %I check (submitter_email is null or (char_length(submitter_email) <= 254 and submitter_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'))$c$, t, t || '_submitter_email_fmt');
  end loop;
end $$;

-- A row must identify either a member or a reachable guest contact.
alter table public.events drop constraint if exists events_submitter_identified;
alter table public.events add constraint events_submitter_identified
  check (submitter_id is not null or submitter_email is not null);
alter table public.history_contributions drop constraint if exists history_contributions_submitter_identified;
alter table public.history_contributions add constraint history_contributions_submitter_identified
  check (contributor_id is not null or submitter_email is not null);
alter table public.tourism_submissions drop constraint if exists tourism_submissions_submitter_identified;
alter table public.tourism_submissions add constraint tourism_submissions_submitter_identified
  check (contributor_id is not null or submitter_email is not null);

-- Image keys are R2 object keys produced by the server upload route.
do $$
declare
  t text;
begin
  foreach t in array array['events', 'history_contributions', 'history_records'] loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_image_key_fmt');
    execute format($c$alter table public.%I add constraint %I check (image_key is null or image_key ~ '^media/[a-z0-9][a-z0-9/._-]{2,}$' and char_length(image_key) <= 300)$c$, t, t || '_image_key_fmt');
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_image_alt_len');
    execute format('alter table public.%I add constraint %I check (image_alt is null or char_length(btrim(image_alt)) <= 300)', t, t || '_image_alt_len');
  end loop;
end $$;

-- 2. Event review ----------------------------------------------------------------
insert into public.capabilities (key, description)
values ('events.review', 'Review, publish and reject community event submissions')
on conflict (key) do nothing;

drop policy if exists events_staff_read on public.events;
create policy events_staff_read on public.events
  for select to authenticated
  using (public.has_capability('events.review') or public.has_capability('article.publish'));

create or replace function public.staff_event_decide(p_event_id uuid, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not (public.has_capability('events.review') or public.has_capability('article.publish')) then
    raise exception using errcode = '42501', message = 'event_forbidden';
  end if;
  if p_status not in ('published', 'rejected') then
    raise exception using errcode = '22023', message = 'event_status_invalid';
  end if;
  if p_status = 'rejected' and (p_note is null or char_length(btrim(p_note)) < 2) then
    raise exception using errcode = '22023', message = 'event_note_required';
  end if;
  -- Published events may be withdrawn (rejected) later; rejected events stay final.
  if not exists (
    select 1 from public.events
    where id = p_event_id
      and (status = 'submitted' or (status = 'published' and p_status = 'rejected'))
  ) then
    raise exception using errcode = '22023', message = 'event_unknown';
  end if;
  update public.events
     set status = p_status,
         published_at = case when p_status = 'published' then now() else null end,
         updated_at = now()
   where id = p_event_id;
  perform public.audit_event('staff', 'event.decide', 'event', p_event_id, 'success',
    jsonb_build_object('status', p_status, 'note', nullif(btrim(coalesce(p_note, '')), '')));
end;
$function$;

revoke all on function public.staff_event_decide(uuid, text, text) from public, anon;
grant execute on function public.staff_event_decide(uuid, text, text) to authenticated, service_role;

-- 3. History publication may carry the reviewed image -----------------------------
drop function if exists public.history_contribution_decide(uuid, text, text, text, text, text, text);

create function public.history_contribution_decide(
  p_contribution_id uuid,
  p_decision text,
  p_public_account text,
  p_public_family_name text,
  p_public_lineage_description text,
  p_public_citation text,
  p_public_source_url text,
  p_publish_image boolean default false
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_contribution public.history_contributions%rowtype;
  v_record_id uuid;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not exists (
    select 1 from auth.users u
    join public.staff_profiles p on p.user_id = u.id
    where u.id = v_actor and u.email_confirmed_at is not null and p.is_active
  ) then
    raise exception using errcode = '42501', message = 'active_verified_staff_required';
  end if;
  if not public.has_capability('history.review') then
    raise exception using errcode = '42501', message = 'history_review_required';
  end if;
  if p_decision is null or p_decision not in ('needs_revision', 'rejected', 'published') then
    raise exception using errcode = '22023', message = 'invalid_history_decision';
  end if;
  if p_decision = 'published' and (p_public_account is null or char_length(btrim(p_public_account)) not between 20 and 20000) then
    raise exception using errcode = '22023', message = 'approved_public_account_required';
  end if;
  if p_decision = 'published' and (p_public_citation is null or char_length(btrim(p_public_citation)) not between 3 and 1000) then
    raise exception using errcode = '22023', message = 'approved_public_citation_required';
  end if;
  if p_public_source_url is not null and btrim(p_public_source_url) <> '' and
     (char_length(btrim(p_public_source_url)) > 1000 or btrim(p_public_source_url) !~* '^https://') then
    raise exception using errcode = '22023', message = 'invalid_public_source_url';
  end if;
  if p_public_family_name is not null and btrim(p_public_family_name) <> '' and char_length(btrim(p_public_family_name)) > 180 then
    raise exception using errcode = '22023', message = 'invalid_public_family_name';
  end if;
  if p_public_lineage_description is not null and btrim(p_public_lineage_description) <> '' and char_length(btrim(p_public_lineage_description)) > 5000 then
    raise exception using errcode = '22023', message = 'invalid_public_lineage_description';
  end if;

  select * into v_contribution
  from public.history_contributions
  where id = p_contribution_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'history_contribution_not_found';
  end if;
  if v_contribution.status <> 'pending' or v_contribution.reviewed_at is not null
     or v_contribution.reviewed_by is not null then
    raise exception using errcode = '40001', message = 'history_contribution_already_reviewed';
  end if;

  if p_decision = 'published' then
    insert into public.history_records
      (title, account, published_by, community, category, family_name, lineage_description, image_key, image_alt)
    values
      (v_contribution.title, p_public_account, v_actor, v_contribution.community,
       v_contribution.category, nullif(btrim(p_public_family_name), ''), nullif(btrim(p_public_lineage_description), ''),
       case when coalesce(p_publish_image, false) then v_contribution.image_key else null end,
       case when coalesce(p_publish_image, false) then v_contribution.image_alt else null end)
    returning id into v_record_id;

    insert into public.history_record_sources (record_id, citation, source_url)
    values (v_record_id, btrim(p_public_citation), nullif(btrim(p_public_source_url), ''));
  end if;

  update public.history_contributions
  set status = p_decision, reviewed_at = pg_catalog.now(), reviewed_by = v_actor
  where id = p_contribution_id;

  perform public.audit_event(
    'staff', 'history.contribution_decide', 'history_contribution', p_contribution_id, 'success',
    jsonb_build_object('decision', p_decision, 'record_id', v_record_id,
      'image_published', coalesce(p_publish_image, false) and v_contribution.image_key is not null)
  );

  return v_record_id;
end;
$function$;

revoke all on function public.history_contribution_decide(uuid, text, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.history_contribution_decide(uuid, text, text, text, text, text, text, boolean) to authenticated, service_role;

-- 4. Ìtàn Ilú Mi correction / removal requests --------------------------------------
create table if not exists public.history_correction_requests (
  id uuid primary key default gen_random_uuid(),
  record_ref text not null check (char_length(btrim(record_ref)) between 2 and 300),
  request_kind text not null default 'correction' check (request_kind in ('correction', 'removal')),
  message text not null check (char_length(btrim(message)) between 10 and 5000),
  sender_name text not null check (char_length(btrim(sender_name)) between 2 and 100),
  sender_email text not null check (char_length(sender_email) <= 254 and sender_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  submitter_id uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  staff_note text check (staff_note is null or char_length(staff_note) <= 2000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create index if not exists history_correction_requests_open_idx
  on public.history_correction_requests (created_at) where status = 'open';

alter table public.history_correction_requests enable row level security;
revoke all on public.history_correction_requests from anon, authenticated;
grant select on public.history_correction_requests to authenticated;

drop policy if exists history_correction_requests_staff_read on public.history_correction_requests;
create policy history_correction_requests_staff_read on public.history_correction_requests
  for select to authenticated
  using (public.has_capability('history.review'));

create or replace function public.staff_history_correction_resolve(p_request_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not public.has_capability('history.review') then
    raise exception using errcode = '42501', message = 'history_review_required';
  end if;
  if p_status not in ('resolved', 'dismissed') then
    raise exception using errcode = '22023', message = 'correction_status_invalid';
  end if;
  update public.history_correction_requests
     set status = p_status,
         staff_note = nullif(btrim(coalesce(p_note, '')), ''),
         resolved_at = now(),
         resolved_by = auth.uid()
   where id = p_request_id and status = 'open';
  if not found then
    raise exception using errcode = '40001', message = 'correction_already_closed';
  end if;
  perform public.audit_event('staff', 'history.correction_resolve', 'history_correction_request', p_request_id, 'success',
    jsonb_build_object('status', p_status));
end;
$function$;

revoke all on function public.staff_history_correction_resolve(uuid, text, text) from public, anon;
grant execute on function public.staff_history_correction_resolve(uuid, text, text) to authenticated, service_role;

-- 5. Rate-limit scopes for the new public surfaces ---------------------------------
alter table public.form_rate_buckets drop constraint if exists form_rate_buckets_scope_check;
alter table public.form_rate_buckets add constraint form_rate_buckets_scope_check
  check (scope in (
    'newsletter', 'enquiry',
    'auth_signup', 'auth_signin', 'auth_reset', 'auth_otp', 'auth_resend',
    'business_submit', 'tourism_submit', 'gallery_submit', 'history_submit',
    'forum_post',
    'event_submit', 'song_request', 'business_claim', 'moderation_appeal',
    'image_upload', 'history_correction'
  ));

-- 6. Read access ---------------------------------------------------------------------
-- The public calendar had no SELECT privilege on events, so /events always showed
-- "The calendar could not load". Grant only public columns; submitter identity and
-- contact details stay private (staff read them through the RPC below).
grant select (id, slug, title, description, venue, category, starts_at, ends_at, status,
              published_at, created_at, updated_at, image_key, image_alt)
  on public.events to anon, authenticated;

grant select (image_key, image_alt) on public.history_records to anon, authenticated;

create or replace function public.staff_event_queue(p_status text default 'submitted', p_limit integer default 100)
returns table (
  id uuid, slug text, title text, description text, venue text, category text,
  starts_at timestamptz, ends_at timestamptz, status text, published_at timestamptz,
  created_at timestamptz, image_key text, image_alt text,
  submitter_id uuid, submitter_name text, submitter_email text
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if not (public.has_capability('events.review') or public.has_capability('article.publish')) then
    raise exception using errcode = '42501', message = 'event_forbidden';
  end if;
  if p_status not in ('submitted', 'published', 'rejected') then
    raise exception using errcode = '22023', message = 'event_status_invalid';
  end if;
  return query
    select e.id, e.slug, e.title, e.description, e.venue, e.category, e.starts_at, e.ends_at,
           e.status, e.published_at, e.created_at, e.image_key, e.image_alt,
           e.submitter_id,
           coalesce(e.submitter_name, pr.display_name),
           coalesce(e.submitter_email, u.email::text)
      from public.events e
      left join auth.users u on u.id = e.submitter_id
      left join public.profiles pr on pr.user_id = e.submitter_id
     where e.status = p_status
     order by case when p_status = 'submitted' then e.created_at end asc,
              e.starts_at desc
     limit greatest(1, least(coalesce(p_limit, 100), 200));
end;
$function$;

revoke all on function public.staff_event_queue(text, integer) from public, anon;
grant execute on function public.staff_event_queue(text, integer) to authenticated, service_role;

create or replace function public.staff_business_submitters(p_ids uuid[])
returns table (business_id uuid, submitter_name text, submitter_email text)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if not public.has_capability('business.review') then
    raise exception using errcode = '42501', message = 'business_review_required';
  end if;
  return query
    select b.id, b.submitter_name, b.submitter_email
      from public.businesses b
     where b.id = any(coalesce(p_ids, '{}'::uuid[]))
       and (b.submitter_email is not null or b.submitter_name is not null);
end;
$function$;

revoke all on function public.staff_business_submitters(uuid[]) from public, anon;
grant execute on function public.staff_business_submitters(uuid[]) to authenticated, service_role;
