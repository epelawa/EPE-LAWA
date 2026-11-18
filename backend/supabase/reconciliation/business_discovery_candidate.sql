-- Candidate for a production-like rehearsal only. Do not automatically replay.
-- This phase provides discovery and review, not paid placements or marketplace orders.
-- Stop if any target relation already exists: reconciliation of existing data is separate.
do $$ begin
 if to_regclass('public.businesses') is not null or to_regclass('public.business_categories') is not null or to_regclass('public.business_verifications') is not null or to_regclass('public.published_businesses') is not null then
  raise exception 'business_schema_already_exists';
 end if;
end $$;
create table public.business_categories(id uuid primary key default gen_random_uuid(),slug text not null unique,label text not null,sort_order int not null default 0,is_active boolean not null default true);
insert into public.business_categories(slug,label,sort_order) values ('hotels','Hotels',10),('food-drink','Food & Drink',20),('fashion','Fashion',30),('markets','Markets',40),('services','Services',50),('trades','Trades',60),('health','Health',70),('education','Education',80),('transport','Transport',90);
create table public.businesses(
 id uuid primary key default gen_random_uuid(),slug text not null unique,owner_user_id uuid references public.profiles(user_id) on delete set null,
 name text not null check(char_length(btrim(name)) between 2 and 160),category_id uuid not null references public.business_categories(id),
 description text check(char_length(description)<=4000),area text check(char_length(area)<=160),address text check(char_length(address)<=300),landmark text check(char_length(landmark)<=200),
 phone text check(phone is null or phone ~ '^\+?[0-9][0-9 ()-]{6,19}$'),whatsapp text check(whatsapp is null or whatsapp ~ '^\+?[0-9][0-9 ()-]{6,19}$'),
 email text check(email is null or (length(email)<=254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),website text check(website is null or (length(website)<=2048 and website ~ '^https://')),
 hours jsonb check(hours is null or jsonb_typeof(hours)='object'),status text not null default 'submitted' check(status in ('submitted','reviewing','published','rejected','delisted')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),published_at timestamptz,deleted_at timestamptz,
 check(status <> 'published' or (published_at is not null and deleted_at is null))
);
create index businesses_queue_idx on public.businesses(status,created_at) where status in ('submitted','reviewing');
create index businesses_owner_idx on public.businesses(owner_user_id,created_at desc);
create table public.business_verifications(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id),verified_by uuid not null references auth.users(id),verified_at timestamptz not null default now(),note text not null check(length(btrim(note)) between 10 and 2000),superseded_at timestamptz);
create unique index business_verifications_current_key on public.business_verifications(business_id) where superseded_at is null;
alter table public.business_categories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_verifications enable row level security;
revoke all on public.business_categories,public.businesses,public.business_verifications from public,anon,authenticated;
grant select on public.business_categories to anon,authenticated;
grant select (id,slug,name,category_id,description,area,address,landmark,phone,whatsapp,email,website,hours,status,created_at,updated_at,published_at,deleted_at) on public.businesses to anon,authenticated;
grant select (business_id,verified_at,superseded_at) on public.business_verifications to anon,authenticated;
create function public.business_review_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select public.has_capability('business.review') and exists(select 1 from public.staff_profiles sp where sp.user_id=auth.uid() and sp.is_active and not sp.must_change_password);
$$;
revoke all on function public.business_review_allowed() from public,anon,authenticated;
grant execute on function public.business_review_allowed() to authenticated;
create policy categories_active on public.business_categories for select to anon,authenticated using(is_active);
create policy businesses_public on public.businesses for select to anon,authenticated using(status='published' and deleted_at is null);
create policy businesses_staff on public.businesses for select to authenticated using(public.business_review_allowed());
create policy verification_public on public.business_verifications for select to anon,authenticated using(superseded_at is null and exists(select 1 from public.businesses b where b.id=business_id and b.status='published' and b.deleted_at is null));
create view public.published_businesses with (security_invoker=true) as
 select b.id,b.slug,b.name,b.category_id,c.slug category_slug,c.label category_label,b.description,b.area,b.address,b.landmark,b.phone,b.whatsapp,b.email,b.website,b.hours,b.published_at,(v.verified_at is not null) is_verified,v.verified_at
 from public.businesses b join public.business_categories c on c.id=b.category_id left join public.business_verifications v on v.business_id=b.id and v.superseded_at is null where b.status='published' and b.deleted_at is null;
grant select on public.published_businesses to anon,authenticated;
create function public.business_submit(p_name text,p_category_id uuid,p_description text,p_area text,p_address text,p_landmark text,p_phone text,p_whatsapp text,p_email text,p_website text,p_hours jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result uuid:=gen_random_uuid();
begin
 if actor is null or not exists(select 1 from auth.users u where u.id=actor and u.email_confirmed_at is not null) or not public.is_member_active() or public.is_member_banned() then raise exception using errcode='42501',message='member_profile_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,5721));
 if (select count(*) from public.businesses b where b.owner_user_id=actor and b.created_at > now()-interval '1 day')>=5 then raise exception using errcode='54000',message='submission_rate_limited'; end if;
 if not exists(select 1 from public.business_categories c where c.id=p_category_id and c.is_active) then raise exception using errcode='22023',message='business_category_unavailable'; end if;
 insert into public.businesses(id,slug,owner_user_id,name,category_id,description,area,address,landmark,phone,whatsapp,email,website,hours) values(result,'business-'||replace(result::text,'-',''),actor,btrim(p_name),p_category_id,p_description,p_area,p_address,p_landmark,p_phone,p_whatsapp,p_email,p_website,p_hours);
 perform public.audit_event('member','business.submit','business',result,'success','{}'::jsonb);return result;
end $$;
revoke all on function public.business_submit(text,uuid,text,text,text,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.business_submit(text,uuid,text,text,text,text,text,text,text,text,jsonb) to authenticated;
create function public.business_review_decide(p_business_id uuid,p_status text,p_note text,p_evidence text)
returns void language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 perform public.require_capability('business.review');
 if not exists(select 1 from public.staff_profiles sp where sp.user_id=auth.uid() and sp.is_active and not sp.must_change_password) then raise exception using errcode='42501',message='staff_password_change_required'; end if;
 if p_status not in ('reviewing','published','rejected') or p_status is null or length(btrim(coalesce(p_note,''))) not between 5 and 1000 or (p_status='published' and length(btrim(coalesce(p_evidence,''))) not between 10 and 2000) then raise exception using errcode='22023',message='invalid_decision'; end if;
 select status into previous from public.businesses where id=p_business_id and deleted_at is null for update;
 if previous is null or previous not in ('submitted','reviewing') then raise exception using errcode='40001',message='business_review_conflict'; end if;
 if p_status='published' then insert into public.business_verifications(business_id,verified_by,note) values(p_business_id,auth.uid(),btrim(p_evidence)); end if;
 update public.businesses set status=p_status,updated_at=now(),published_at=case when p_status='published' then now() else published_at end where id=p_business_id;
 perform public.audit_event('staff','business.review','business',p_business_id,'success',jsonb_build_object('from',previous,'to',p_status,'note',btrim(p_note)));
end $$;
revoke all on function public.business_review_decide(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.business_review_decide(uuid,text,text,text) to authenticated;
create function public.business_discovery_search(p_query text,p_area text,p_category text,p_offset integer)
returns setof public.published_businesses language sql stable security invoker set search_path='' as $$
 select p.* from public.published_businesses p
 where length(coalesce(p_query,''))<=100 and length(coalesce(p_area,''))<=100 and length(coalesce(p_category,''))<=100
 and (coalesce(p_query,'')='' or strpos(lower(p.name),lower(btrim(p_query)))>0 or strpos(lower(coalesce(p.description,'')),lower(btrim(p_query)))>0 or strpos(lower(p.category_label),lower(btrim(p_query)))>0)
 and (coalesce(p_area,'')='' or strpos(lower(coalesce(p.area,'')),lower(btrim(p_area)))>0)
 and (coalesce(p_category,'')='' or p.category_slug=p_category)
 order by p.name,p.id limit 13 offset least(greatest(coalesce(p_offset,0),0),11988);
$$;
revoke all on function public.business_discovery_search(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.business_discovery_search(text,text,text,integer) to anon,authenticated;
