-- Tourism: sourced destinations are private until verified and published. No seed data.
insert into public.capabilities (key, description) values
  ('tourism.review', 'Review, verify and publish sourced tourism destinations')
on conflict (key) do nothing;

create table public.tourism_destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  visitor_context text,
  visit_details text,
  location_label text,
  directions_query text,
  latitude numeric(9,6), longitude numeric(9,6),
  opening_hours text, price_details text, access_details text,
  source_citation text not null,
  source_url text,
  media_url text,
  media_rights text,
  published_at timestamptz not null default now(),
  published_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint tourism_slug check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint tourism_name_len check (char_length(btrim(name)) between 2 and 180),
  constraint tourism_description_len check (char_length(btrim(description)) between 20 and 12000),
  constraint tourism_source_citation_len check (char_length(btrim(source_citation)) between 5 and 2000),
  constraint tourism_source_url_https check (source_url is null or source_url ~ '^https://'),
  constraint tourism_media_url_https check (media_url is null or media_url ~ '^https://'),
  constraint tourism_coords_pair check ((latitude is null) = (longitude is null)),
  constraint tourism_latitude check (latitude is null or latitude between -90 and 90),
  constraint tourism_longitude check (longitude is null or longitude between -180 and 180)
);
create table public.tourism_submissions (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.profiles(user_id) on delete restrict,
  name text not null,
  description text not null,
  visitor_context text,
  visit_details text,
  location_label text,
  directions_query text,
  opening_hours text,
  price_details text,
  access_details text,
  source_citation text not null,
  source_url text,
  media_url text,
  media_rights text,
  consent_version text not null,
  consent_text text not null,
  status text not null default 'pending' check (status in ('pending','needs_revision','rejected','published')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint tourism_submission_name check (char_length(btrim(name)) between 2 and 180),
  constraint tourism_submission_description check (char_length(btrim(description)) between 20 and 12000),
  constraint tourism_submission_source check (char_length(btrim(source_citation)) between 5 and 2000),
  constraint tourism_submission_source_url check (source_url is null or source_url ~ '^https://'),
  constraint tourism_submission_media_url check (media_url is null or media_url ~ '^https://'),
  constraint tourism_submission_consent check (consent_version = 'tourism-intake-v1' and char_length(btrim(consent_text)) between 20 and 1000)
);
create index tourism_destinations_published_idx on public.tourism_destinations (published_at desc);
create index tourism_destinations_published_by_idx on public.tourism_destinations (published_by);
create index tourism_submissions_queue_idx on public.tourism_submissions (status, submitted_at);
create index tourism_submissions_contributor_idx on public.tourism_submissions (contributor_id);
create index tourism_submissions_reviewed_by_idx on public.tourism_submissions (reviewed_by);
alter table public.tourism_destinations enable row level security;
alter table public.tourism_submissions enable row level security;
revoke all on public.tourism_destinations, public.tourism_submissions from public, anon, authenticated;
grant select (id,slug,name,description,visitor_context,visit_details,location_label,directions_query,latitude,longitude,opening_hours,price_details,access_details,source_citation,source_url,media_url,published_at) on public.tourism_destinations to anon, authenticated;
grant insert (contributor_id,name,description,visitor_context,visit_details,location_label,directions_query,opening_hours,price_details,access_details,source_citation,source_url,media_url,media_rights,consent_version,consent_text) on public.tourism_submissions to authenticated;
grant select on public.tourism_submissions to authenticated;
create policy tourism_public_published on public.tourism_destinations for select to anon, authenticated using (true);
create policy tourism_member_submit on public.tourism_submissions for insert to authenticated with check (
 contributor_id = (select auth.uid()) and public.is_member_active() and not public.is_member_banned()
 and status = 'pending' and reviewed_at is null and reviewed_by is null
);
create policy tourism_staff_queue on public.tourism_submissions for select to authenticated using (public.has_capability('tourism.review'));

create or replace function public.tourism_submission_decide(
 p_submission_id uuid, p_decision text, p_provenance_verified boolean, p_rights_verified boolean,
 p_slug text, p_location_label text default null, p_directions_query text default null,
 p_latitude numeric default null, p_longitude numeric default null,
 p_opening_hours text default null, p_price_details text default null, p_access_details text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_submission public.tourism_submissions%rowtype; v_destination uuid;
begin
 if v_actor is null then raise exception using errcode='42501', message='authentication_required'; end if;
 if not exists (select 1 from auth.users u join public.staff_profiles p on p.user_id=u.id where u.id=v_actor and u.email_confirmed_at is not null and p.is_active)
 then raise exception using errcode='42501', message='active_verified_staff_required'; end if;
 if not public.has_capability('tourism.review') then raise exception using errcode='42501', message='tourism_review_required'; end if;
 if p_decision is null or p_decision not in ('needs_revision','rejected','published') then raise exception using errcode='22023', message='invalid_tourism_decision'; end if;
 if p_decision='published' and (p_provenance_verified is distinct from true or p_rights_verified is distinct from true) then raise exception using errcode='22023', message='verification_required'; end if;
 select * into v_submission from public.tourism_submissions where id=p_submission_id for update;
 if not found then raise exception using errcode='P0002', message='tourism_submission_not_found'; end if;
 if v_submission.status <> 'pending' or v_submission.reviewed_at is not null then raise exception using errcode='40001', message='tourism_submission_already_reviewed'; end if;
 if p_decision='published' then
   if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception using errcode='22023', message='invalid_tourism_slug'; end if;
   insert into public.tourism_destinations(slug,name,description,visitor_context,visit_details,location_label,directions_query,latitude,longitude,opening_hours,price_details,access_details,source_citation,source_url,media_url,media_rights,published_by)
   values (p_slug,v_submission.name,v_submission.description,v_submission.visitor_context,v_submission.visit_details,p_location_label,p_directions_query,p_latitude,p_longitude,p_opening_hours,p_price_details,p_access_details,v_submission.source_citation,v_submission.source_url,v_submission.media_url,v_submission.media_rights,v_actor) returning id into v_destination;
 end if;
 update public.tourism_submissions set status=p_decision, reviewed_at=pg_catalog.now(), reviewed_by=v_actor where id=p_submission_id;
 perform public.audit_event('staff','tourism.submission_decide','tourism_submission',p_submission_id,'success',jsonb_build_object('decision',p_decision,'destination_id',v_destination,'provenance_verified',coalesce(p_provenance_verified,false),'rights_verified',coalesce(p_rights_verified,false)));
 return v_destination;
end; $$;
revoke all on function public.tourism_submission_decide(uuid,text,boolean,boolean,text,text,text,numeric,numeric,text,text,text) from public, anon;
grant execute on function public.tourism_submission_decide(uuid,text,boolean,boolean,text,text,text,numeric,numeric,text,text,text) to authenticated;
