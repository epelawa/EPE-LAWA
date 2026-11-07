-- EPE LAWA — M11: business directory (the discovery half of §3.5).
--
-- Two decisions that differ from docs/07-database-schema.md §6, both deliberate:
--
-- 1. There is no `is_verified` boolean on `businesses`. A stored flag can drift from the record
--    that justified it — the moment somebody flips it by hand, the badge is a lie and nothing
--    catches it. Verification lives in `business_verifications` and the badge is a join
--    (published_businesses.is_verified). Withdrawing a verification is one UPDATE, and the
--    badge disappears on the next read.
--
-- 2. `business_featured` is not in this file. It references `payments`, which does not exist
--    yet, so it ships with the marketplace migration. A nullable payment_id with no foreign key
--    would be a silent hole in the money path.

create table if not exists public.business_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       citext not null unique,
  label      text not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_categories_slug_format check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint business_categories_label_length check (char_length(btrim(label)) between 2 and 60)
);

-- Approved taxonomy, cited: docs/01-product-requirements.md §7.1 B2
-- "Categories: Hotels, Food & Drink, Fashion, Markets, Services, Trades, Health, Education,
-- Transport". Reference data the client specified; idempotent; deletable if it changes.
insert into public.business_categories (slug, label, sort_order) values
  ('hotels',       'Hotels',        10),
  ('food-drink',   'Food & Drink',  20),
  ('fashion',      'Fashion',       30),
  ('markets',      'Markets',       40),
  ('services',     'Services',      50),
  ('trades',       'Trades',        60),
  ('health',       'Health',        70),
  ('education',    'Education',     80),
  ('transport',    'Transport',     90)
on conflict (slug) do nothing;

create table if not exists public.businesses (
  id            uuid primary key default gen_random_uuid(),
  slug          citext not null unique,
  owner_user_id uuid references public.profiles(user_id) on delete set null,
  name          text not null,
  category_id   uuid not null references public.business_categories(id) on delete restrict,
  description   text,
  -- Free text on purpose. There is no approved list of Epe areas in any project document, and
  -- inventing one would be fabrication. Staff enter the area as it is actually described.
  area          text,
  address       text,
  landmark      text,
  phone         text,
  whatsapp      text,
  email         text,
  website       text,
  hours         jsonb,
  status        text not null default 'submitted',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  deleted_at    timestamptz,
  constraint businesses_slug_format check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint businesses_name_length check (char_length(btrim(name)) between 2 and 160),
  constraint businesses_description_length check (description is null or char_length(description) <= 4000),
  constraint businesses_status check (
    status in ('submitted', 'reviewing', 'published', 'rejected', 'delisted')
  ),
  constraint businesses_phone_format check (
    phone is null or phone ~ '^\+?[0-9][0-9 ()-]{6,19}$'
  ),
  constraint businesses_whatsapp_format check (
    whatsapp is null or whatsapp ~ '^\+?[0-9][0-9 ()-]{6,19}$'
  ),
  constraint businesses_email_format check (
    email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint businesses_website_https check (website is null or website ~ '^https://'),
  constraint businesses_hours_object check (hours is null or jsonb_typeof(hours) = 'object'),
  constraint businesses_published_has_date check (
    status <> 'published' or published_at is not null
  ),
  constraint businesses_not_published_when_deleted check (
    deleted_at is null or status <> 'published'
  )
);

create table if not exists public.business_photos (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  sort_order     integer not null default 0,
  alt_text       text not null,
  created_at     timestamptz not null default now(),
  constraint business_photos_alt_length check (char_length(btrim(alt_text)) between 1 and 300),
  constraint business_photos_unique unique (business_id, media_asset_id)
);

create table if not exists public.business_reviews (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  author_id   uuid references public.profiles(user_id) on delete set null,
  rating      smallint not null,
  body        text,
  state       text not null default 'visible',
  hidden_reason text,
  hidden_by   uuid references auth.users(id) on delete set null,
  hidden_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint business_reviews_rating check (rating between 1 and 5),
  constraint business_reviews_body_length check (body is null or char_length(body) between 1 and 4000),
  constraint business_reviews_state check (state in ('visible', 'hidden')),
  constraint business_reviews_hidden_requires_reason check (
    state <> 'hidden'
    or (hidden_reason is not null and hidden_by is not null and hidden_at is not null)
  )
);

-- One live review per member per business (docs/09-api-contracts.md §6). A partial index rather
-- than a table constraint so a deleted review can be re-created.
create unique index if not exists business_reviews_one_live_key
  on public.business_reviews (business_id, author_id)
  where deleted_at is null;

create table if not exists public.business_verifications (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete restrict,
  verified_by  uuid not null references auth.users(id) on delete restrict,
  verified_at  timestamptz not null default now(),
  note         text not null,
  superseded_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint business_verifications_note_length check (char_length(btrim(note)) between 10 and 2000)
);

create unique index if not exists business_verifications_current_key
  on public.business_verifications (business_id)
  where superseded_at is null;

------------------------------------------------------------------------------
-- Indexes
------------------------------------------------------------------------------

create index if not exists businesses_directory_idx
  on public.businesses (category_id, area)
  where status = 'published';
create index if not exists businesses_queue_idx
  on public.businesses (status, created_at)
  where status in ('submitted', 'reviewing');
create index if not exists businesses_owner_idx
  on public.businesses (owner_user_id, updated_at desc);
create index if not exists businesses_name_search_idx
  on public.businesses (lower(name));
create index if not exists business_photos_business_idx
  on public.business_photos (business_id, sort_order);
create index if not exists business_photos_media_idx
  on public.business_photos (media_asset_id);
create index if not exists business_reviews_business_idx
  on public.business_reviews (business_id, created_at desc)
  where deleted_at is null;
create index if not exists business_reviews_author_idx
  on public.business_reviews (author_id, created_at desc);
create index if not exists business_verifications_business_idx
  on public.business_verifications (business_id, verified_at desc);

-- FK coverage.
create index if not exists business_verifications_verifier_idx
  on public.business_verifications (verified_by, verified_at desc);
create index if not exists business_reviews_hidden_by_idx
  on public.business_reviews (hidden_by);

------------------------------------------------------------------------------
-- updated_at
------------------------------------------------------------------------------

-- Without these, updated_at would stay at its insert value forever and the column would lie.
drop trigger if exists business_categories_set_updated_at on public.business_categories;
create trigger business_categories_set_updated_at
  before update on public.business_categories
  for each row execute function public.set_updated_at();

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

drop trigger if exists business_reviews_set_updated_at on public.business_reviews;
create trigger business_reviews_set_updated_at
  before update on public.business_reviews
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- Ownership helper
------------------------------------------------------------------------------

-- Used inside RLS policies so the policy does not need the caller to hold SELECT on
-- owner_user_id. Read-only and definer, like the capability helpers.
create or replace function public.owns_business(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and b.owner_user_id = auth.uid()
  );
$$;

revoke all on function public.owns_business(uuid) from public;
grant execute on function public.owns_business(uuid) to authenticated;

------------------------------------------------------------------------------
-- Write paths
------------------------------------------------------------------------------

create or replace function public.business_submit(
  p_name        text,
  p_category_id uuid,
  p_description text,
  p_area        text,
  p_address     text,
  p_landmark    text,
  p_phone       text,
  p_whatsapp    text,
  p_email       text,
  p_website     text,
  p_hours       jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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

  if not public.is_member_active() then
    raise exception using errcode = '42501', message = 'member_profile_required';
  end if;

  if public.is_member_banned() then
    raise exception using errcode = '42501', message = 'member_banned';
  end if;

  if not exists (
    select 1 from public.business_categories c where c.id = p_category_id and c.is_active
  ) then
    raise exception using errcode = '23503', message = 'business_category_unavailable';
  end if;

  v_base := coalesce(public.slugify(p_name), 'business');
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

  -- status is forced. A submitter cannot self-publish, and there is no column grant that would
  -- let them try.
  insert into public.businesses (
    id, slug, owner_user_id, name, category_id, description, area, address, landmark,
    phone, whatsapp, email, website, hours, status
  ) values (
    v_id, v_slug, v_actor, btrim(p_name), p_category_id, p_description, p_area, p_address,
    p_landmark, p_phone, p_whatsapp, p_email, p_website, p_hours, 'submitted'
  );

  perform public.audit_event('member', 'business.submit', 'business', v_id, 'success',
    jsonb_build_object('name', btrim(p_name), 'category_id', p_category_id));

  return v_id;
end;
$$;

create or replace function public.business_set_status(
  p_business_id uuid,
  p_status      text,
  p_note        text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_from  text;
begin
  perform public.require_capability('business.review');

  if p_status not in ('submitted', 'reviewing', 'published', 'rejected', 'delisted') then
    raise exception using errcode = '22023', message = 'invalid_status';
  end if;

  if p_status in ('published', 'rejected') and coalesce(char_length(btrim(p_note)), 0) < 5 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;

  select b.status into v_from from public.businesses b where b.id = p_business_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'business_not_found';
  end if;

  update public.businesses
  set status = p_status,
      published_at = case when p_status = 'published' then coalesce(published_at, now())
                          else published_at end
  where id = p_business_id;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (
    v_actor, 'business', p_business_id,
    case when p_status = 'delisted' then 'delist' else 'verify' end,
    coalesce(nullif(btrim(p_note), ''), 'status change')
  );

  perform public.audit_event('staff', 'business.set_status', 'business', p_business_id, 'success',
    jsonb_build_object('from', v_from, 'to', p_status, 'note', p_note));
end;
$$;

create or replace function public.business_verify(
  p_business_id uuid,
  p_note        text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id    uuid := gen_random_uuid();
begin
  perform public.require_capability('business.review');

  if not exists (select 1 from public.businesses b where b.id = p_business_id) then
    raise exception using errcode = 'P0002', message = 'business_not_found';
  end if;

  update public.business_verifications
  set superseded_at = now()
  where business_id = p_business_id and superseded_at is null;

  insert into public.business_verifications (id, business_id, verified_by, note)
  values (v_id, p_business_id, v_actor, btrim(p_note));

  perform public.audit_event('staff', 'business.verify', 'business', p_business_id, 'success',
    jsonb_build_object('verification_id', v_id));

  return v_id;
end;
$$;

create or replace function public.business_unverify(p_business_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  perform public.require_capability('business.review');

  if coalesce(char_length(btrim(p_reason)), 0) < 5 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;

  update public.business_verifications
  set superseded_at = now()
  where business_id = p_business_id and superseded_at is null;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception using errcode = 'P0002', message = 'no_current_verification';
  end if;

  perform public.audit_event('staff', 'business.unverify', 'business', p_business_id, 'success',
    jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.business_review_delete(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_author uuid;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  select r.author_id into v_author
  from public.business_reviews r
  where r.id = p_review_id and r.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'review_not_found';
  end if;

  if v_author is distinct from v_actor then
    raise exception using errcode = '42501', message = 'not_review_author';
  end if;

  update public.business_reviews
  set deleted_at = now(), body = null
  where id = p_review_id;

  perform public.audit_event('member', 'business.review.delete', 'business_review', p_review_id, 'success');
end;
$$;

revoke all on function public.business_submit(text, uuid, text, text, text, text, text, text, text, text, jsonb) from public;
revoke all on function public.business_set_status(uuid, text, text) from public;
revoke all on function public.business_verify(uuid, text) from public;
revoke all on function public.business_unverify(uuid, text) from public;
revoke all on function public.business_review_delete(uuid) from public;

grant execute on function public.business_submit(text, uuid, text, text, text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.business_set_status(uuid, text, text) to authenticated;
grant execute on function public.business_verify(uuid, text) to authenticated;
grant execute on function public.business_unverify(uuid, text) to authenticated;
grant execute on function public.business_review_delete(uuid) to authenticated;

------------------------------------------------------------------------------
-- Public read model
------------------------------------------------------------------------------

drop view if exists public.published_businesses;
create view public.published_businesses
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
  -- Same reasoning as published_people: verified_at is NOT NULL, so this is an equivalent test
  -- that only reads columns granted to anon. Selecting v.id would deny the whole view.
  (v.verified_at is not null) as is_verified,
  v.verified_at
from public.businesses b
join public.business_categories c on c.id = b.category_id
left join public.business_verifications v
  on v.business_id = b.id and v.superseded_at is null
where b.status = 'published'
  and b.deleted_at is null;

------------------------------------------------------------------------------
-- RLS
------------------------------------------------------------------------------

alter table public.business_categories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_photos enable row level security;
alter table public.business_reviews enable row level security;
alter table public.business_verifications enable row level security;

revoke all on table public.business_categories from public, anon, authenticated;
revoke all on table public.businesses from public, anon, authenticated;
revoke all on table public.business_photos from public, anon, authenticated;
revoke all on table public.business_reviews from public, anon, authenticated;
revoke all on table public.business_verifications from public, anon, authenticated;

grant select on table public.business_categories to anon, authenticated;

-- Public read excludes owner_user_id: who owns a listing is not directory content.
grant select (id, slug, name, category_id, description, area, address, landmark, phone,
              whatsapp, email, website, hours, status, created_at, updated_at, published_at,
              deleted_at)
  on table public.businesses to anon, authenticated;

-- An owner may edit contact and description fields. Status, published_at, deleted_at and
-- owner_user_id are not in the grant, so a listing cannot be self-published or transferred.
grant update (name, category_id, description, area, address, landmark, phone, whatsapp, email,
              website, hours)
  on table public.businesses to authenticated;

grant select on table public.business_photos to anon, authenticated;
grant select on table public.business_reviews to anon, authenticated;
grant insert (business_id, author_id, rating, body) on table public.business_reviews to authenticated;
grant update (rating, body) on table public.business_reviews to authenticated;
grant select (business_id, verified_at, superseded_at)
  on table public.business_verifications to anon, authenticated;
grant select on public.published_businesses to anon, authenticated;

drop policy if exists business_categories_read on public.business_categories;
create policy business_categories_read on public.business_categories
  for select to anon, authenticated
  using (is_active);

drop policy if exists businesses_read_published on public.businesses;
create policy businesses_read_published on public.businesses
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists businesses_read_owner on public.businesses;
create policy businesses_read_owner on public.businesses
  for select to authenticated
  using (public.owns_business(id));

drop policy if exists businesses_read_staff on public.businesses;
create policy businesses_read_staff on public.businesses
  for select to authenticated
  using (public.has_capability('business.review'));

drop policy if exists businesses_update_owner on public.businesses;
create policy businesses_update_owner on public.businesses
  for update to authenticated
  using (public.owns_business(id) and deleted_at is null and not public.is_member_banned())
  with check (public.owns_business(id) and deleted_at is null);

-- Photos are written by staff tooling after the media row exists; owner uploads go through a
-- server route that creates the media_asset first. Reading is public, writing is not.
drop policy if exists business_photos_read on public.business_photos;
create policy business_photos_read on public.business_photos
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_photos.business_id
        and b.status = 'published'
        and b.deleted_at is null
    )
    or public.owns_business(business_id)
    or public.has_capability('business.review')
  );

drop policy if exists business_reviews_read on public.business_reviews;
create policy business_reviews_read on public.business_reviews
  for select to anon, authenticated
  using (
    state = 'visible'
    and deleted_at is null
    and exists (
      select 1 from public.businesses b
      where b.id = business_reviews.business_id
        and b.status = 'published'
        and b.deleted_at is null
    )
  );

drop policy if exists business_reviews_read_own on public.business_reviews;
create policy business_reviews_read_own on public.business_reviews
  for select to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists business_reviews_read_staff on public.business_reviews;
create policy business_reviews_read_staff on public.business_reviews
  for select to authenticated
  using (public.has_capability('business.review'));

-- A review requires a real authenticated author on a published business. The partial unique
-- index turns a second live review into a 23505, which the API maps to 409.
drop policy if exists business_reviews_insert_own on public.business_reviews;
create policy business_reviews_insert_own on public.business_reviews
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.is_member_active()
    and not public.is_member_banned()
    and state = 'visible'
    and deleted_at is null
    and exists (
      select 1 from public.businesses b
      where b.id = business_reviews.business_id
        and b.status = 'published'
        and b.deleted_at is null
    )
  );

drop policy if exists business_reviews_update_own on public.business_reviews;
create policy business_reviews_update_own on public.business_reviews
  for update to authenticated
  using (author_id = (select auth.uid()) and deleted_at is null and state = 'visible')
  with check (author_id = (select auth.uid()) and deleted_at is null);

drop policy if exists business_verifications_read_current on public.business_verifications;
create policy business_verifications_read_current on public.business_verifications
  for select to anon, authenticated
  using (
    superseded_at is null
    and exists (
      select 1 from public.businesses b
      where b.id = business_verifications.business_id
        and b.status = 'published'
        and b.deleted_at is null
    )
  );

drop policy if exists business_verifications_read_staff on public.business_verifications;
create policy business_verifications_read_staff on public.business_verifications
  for select to authenticated
  using (public.has_capability('business.review'));

-- No INSERT grant on businesses: business_submit() is the only creation path, and it forces
-- status = 'submitted'. No DELETE grant anywhere: delisting is a status change so the review
-- history survives.
