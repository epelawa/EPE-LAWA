-- Business logos (file upload or link) and the sitewide business-ads carousel.
-- 1) businesses.logo_key: an R2 object key ("media/business/2026/ab12-logo.jpg")
--    or a full public HTTPS URL. Rendering resolves both.
-- 2) business_submit / business_staff_create gain an optional trailing
--    p_logo_key parameter (default null), so existing callers keep working.
-- 3) business_ad_slots + capability-gated RPCs power the staff "Ads" section;
--    business_ad_carousel is the public, read-only view the site renders.

alter table public.businesses add column if not exists logo_key text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'businesses_logo_key_format' and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses add constraint businesses_logo_key_format check (
      logo_key is null or logo_key ~ '^(https://\S{3,600}|[a-z0-9][a-z0-9/._-]{2,400})$'
    );
  end if;
end $$;

-- Logo support for member submissions. The previous 11-argument signature is dropped
-- and replaced by one signature carrying p_logo_key (defaulted) so no overloads remain:
-- two live overloads would make plain positional calls ambiguous.
drop function if exists public.business_submit(text, uuid, text, text, text, text, text, text, text, text, jsonb);
create function public.business_submit(
  p_name text, p_category_id uuid, p_description text, p_area text, p_address text,
  p_landmark text, p_phone text, p_whatsapp text, p_email text, p_website text,
  p_hours jsonb, p_logo_key text default null
)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=gen_random_uuid();
begin
  if auth.uid() is null or not public.is_member_active() or public.is_member_banned() then
    raise exception using errcode='42501',message='member_profile_required';
  end if;
  if p_logo_key is not null and p_logo_key !~ '^(https://\S{3,600}|[a-z0-9][a-z0-9/._-]{2,400})$' then
    raise exception using errcode='22023',message='business_logo_invalid';
  end if;
  insert into public.businesses(id,slug,owner_user_id,name,category_id,description,area,address,landmark,phone,whatsapp,email,website,hours,logo_key,status)
  values(v_id,public.slugify(p_name)||'-'||substr(replace(v_id::text,'-',''),1,6),auth.uid(),btrim(p_name),p_category_id,p_description,p_area,p_address,p_landmark,p_phone,p_whatsapp,p_email,p_website,p_hours,nullif(btrim(coalesce(p_logo_key,'')),''),'submitted');
  perform public.audit_event('member','business.submit','business',v_id,'success',jsonb_build_object('name',btrim(p_name),'category_id',p_category_id));
  return v_id;
end;
$$;

drop function if exists public.business_staff_create(text, uuid, text, text, text, text, text, text, text, text, jsonb, boolean, text);
create function public.business_staff_create(
  p_name text, p_category_id uuid, p_description text, p_area text, p_address text,
  p_landmark text, p_phone text, p_whatsapp text, p_email text, p_website text,
  p_hours jsonb, p_verify boolean, p_evidence text, p_logo_key text default null
)
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

  if p_logo_key is not null and p_logo_key !~ '^(https://\S{3,600}|[a-z0-9][a-z0-9/._-]{2,400})$' then
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

create table if not exists public.business_ad_slots (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  position    integer not null default 0,
  is_active   boolean not null default true,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists business_ad_slots_order
  on public.business_ad_slots (is_active, position, created_at);

create index if not exists business_ad_slots_created_by_idx
  on public.business_ad_slots (created_by);

drop trigger if exists business_ad_slots_set_updated_at on public.business_ad_slots;
create trigger business_ad_slots_set_updated_at
  before update on public.business_ad_slots
  for each row execute function public.set_updated_at();

alter table public.business_ad_slots enable row level security;
revoke all on table public.business_ad_slots from public, anon, authenticated;
grant select on table public.business_ad_slots to authenticated;

drop policy if exists business_ad_slots_staff on public.business_ad_slots;
create policy business_ad_slots_staff on public.business_ad_slots
  for select to authenticated
  using (public.has_capability('advertising.manage'));

create or replace function public.business_ad_assign(p_business_id uuid, p_position integer default 0, p_active boolean default true)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_slot uuid;
begin
  if v_actor is null then raise exception using errcode='42501',message='not_authenticated'; end if;
  perform public.require_capability('advertising.manage');
  if not exists (select 1 from public.businesses b where b.id = p_business_id and b.status='published' and b.deleted_at is null) then
    raise exception using errcode='22023',message='business_not_published';
  end if;
  if p_position is null or p_position < 0 or p_position > 999 then
    raise exception using errcode='22023',message='ad_position_invalid';
  end if;
  insert into public.business_ad_slots (business_id, position, is_active, created_by)
  values (p_business_id, p_position, coalesce(p_active, true), v_actor)
  on conflict (business_id) do update set position = excluded.position, is_active = excluded.is_active, updated_at = now()
  returning id into v_slot;
  perform public.audit_event('staff','ads.assign','business',p_business_id,'success',
    jsonb_build_object('slot',v_slot,'position',p_position,'active',coalesce(p_active,true)));
  return v_slot;
end;
$$;

create or replace function public.business_ad_remove(p_slot_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception using errcode='42501',message='not_authenticated'; end if;
  perform public.require_capability('advertising.manage');
  if p_slot_id is null then raise exception using errcode='22023',message='ad_slot_invalid'; end if;
  delete from public.business_ad_slots where id = p_slot_id;
  if not found then raise exception using errcode='22023',message='ad_slot_missing'; end if;
  perform public.audit_event('staff','ads.remove','ad_slot',p_slot_id,'success','{}'::jsonb);
end;
$$;

revoke all on function public.business_ad_assign(uuid, integer, boolean) from public, anon;
revoke all on function public.business_ad_remove(uuid) from public, anon;
grant execute on function public.business_ad_assign(uuid, integer, boolean) to authenticated;
grant execute on function public.business_ad_remove(uuid) to authenticated;

revoke all on function public.business_submit(text, uuid, text, text, text, text, text, text, text, text, jsonb, text) from public, anon;
revoke all on function public.business_staff_create(text, uuid, text, text, text, text, text, text, text, text, jsonb, boolean, text, text) from public, anon;
grant execute on function public.business_submit(text, uuid, text, text, text, text, text, text, text, text, jsonb, text) to authenticated;
grant execute on function public.business_staff_create(text, uuid, text, text, text, text, text, text, text, text, jsonb, boolean, text, text) to authenticated;

create or replace view public.business_ad_carousel as
  select s.id as slot_id, s.position, b.id as business_id, b.slug, b.name,
         left(coalesce(b.description, ''), 220) as description, b.area,
         b.logo_key, c.label as category_label
  from public.business_ad_slots s
  join public.businesses b on b.id = s.business_id
  join public.business_categories c on c.id = b.category_id
  where s.is_active and b.status = 'published' and b.deleted_at is null
  order by s.position, s.created_at;

revoke all on public.business_ad_carousel from public, anon, authenticated;
grant select on public.business_ad_carousel to anon, authenticated;

-- Rebuild the public read model with the new logo column. The column list mirrors the
-- canonical definition in 20261102200011 (slug cast to text because businesses.slug is citext).
-- create-or-replace only (no drop): business_discovery_search returns setof this view,
-- so the view must not be dropped. Column names/types/order are unchanged; logo_key is appended.
create or replace view public.published_businesses
  with (security_invoker = true)
as
select
  b.id,
  b.slug::text as slug,
  b.name,
  b.category_id,
  c.slug::text as category_slug,
  c.label      as category_label,
  b.description,
  b.area,
  b.address,
  b.landmark,
  b.phone,
  b.whatsapp,
  b.email,
  b.website,
  b.hours,
  b.published_at,
  (v.verified_at is not null) as is_verified,
  v.verified_at,
  b.logo_key
from public.businesses b
join public.business_categories c on c.id = b.category_id
left join public.business_verifications v
  on v.business_id = b.id and v.superseded_at is null
where b.status = 'published'
  and b.deleted_at is null;

grant select on public.published_businesses to anon, authenticated;

-- The rebuilt view reads b.logo_key; the reader column grant must include it or the
-- security-invoker view denies the whole read (the base grant lists only the original columns).
grant select (logo_key) on table public.businesses to anon, authenticated;
