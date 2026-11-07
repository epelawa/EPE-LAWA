-- EPE LAWA — M4: Who is Who.
--
-- This module makes claims about real, living people (docs/01-product-requirements.md §3.2), so
-- two things are enforced in the database rather than trusted to the UI:
--   1. A profile cannot be published without at least one recorded source.
--   2. A verification badge is not a boolean. It is a row with a reviewer, a timestamp, a source
--      and a note saying what was checked. Remove the row and the badge disappears.
--
-- The publish gate cannot be a CHECK constraint because CHECK cannot reference another table,
-- so it is a BEFORE trigger that raises. That is deliberate and is the most important
-- constraint in this file.

create table if not exists public.people (
  id         uuid primary key default gen_random_uuid(),
  slug       citext not null unique,
  full_name  text not null,
  preferred_name text,
  portrait_key  text,
  portrait_alt  text,
  portrait_credit text,
  -- Recorded community as stated by the source. Eko Epe and Ijebu Epe are distinct and must not
  -- be flattened (docs/01 §3.2), so "other" exists rather than forcing a wrong answer.
  community      text,
  community_note text,
  biography      text,
  is_deceased    boolean not null default false,
  status         text not null default 'draft',
  revision       bigint not null default 1,
  published_at   timestamptz,
  deleted_at     timestamptz,
  -- W7: the person or family who supplied biographical detail, with consent. Never public.
  contributor_name                 text,
  contributor_consent_recorded_at  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_slug_format check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint people_full_name_length check (char_length(btrim(full_name)) between 2 and 160),
  constraint people_biography_length check (biography is null or char_length(biography) <= 20000),
  constraint people_status check (status in ('draft', 'review', 'published', 'withdrawn')),
  constraint people_revision_positive check (revision > 0),
  constraint people_community check (
    community is null or community in ('eko_epe', 'ijebu_epe', 'other')
  ),
  -- A contributor name without recorded consent is a privacy defect, not a note.
  constraint people_contributor_consent check (
    contributor_name is null or contributor_consent_recorded_at is not null
  ),
  -- A published portrait needs alt text and a rights note (docs/01 §3.2: no scraped images).
  constraint people_portrait_rights check (
    portrait_key is null
    or (portrait_alt is not null and portrait_credit is not null)
  )
);

create table if not exists public.people_sources (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references public.people(id) on delete restrict,
  kind        text not null,
  citation    text not null,
  url         text,
  -- Some evidence is held privately (a family record, a scanned document). It supports the
  -- record without being published.
  visibility  text not null default 'public',
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  constraint people_sources_kind check (
    kind in ('interview', 'document', 'publication', 'government_record', 'family_record')
  ),
  constraint people_sources_citation_length check (char_length(btrim(citation)) between 3 and 2000),
  constraint people_sources_url_https check (url is null or url ~ '^https://'),
  constraint people_sources_visibility check (visibility in ('public', 'staff'))
);

create table if not exists public.people_offices (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references public.people(id) on delete restrict,
  title       text not null,
  institution text not null,
  term_start  date,
  term_end    date,
  is_current  boolean not null default false,
  source_id   uuid references public.people_sources(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint people_offices_title_length check (char_length(btrim(title)) between 2 and 160),
  constraint people_offices_institution_length check (char_length(btrim(institution)) between 2 and 160),
  constraint people_offices_term_order check (
    term_end is null or term_start is null or term_end >= term_start
  ),
  -- "Current" with an end date is a contradiction.
  constraint people_offices_current_has_no_end check (not is_current or term_end is null)
);

create table if not exists public.people_verifications (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references public.people(id) on delete restrict,
  verified_by  uuid not null references auth.users(id) on delete restrict,
  verified_at  timestamptz not null default now(),
  source_id    uuid not null references public.people_sources(id) on delete restrict,
  note         text not null,
  -- Re-verification supersedes rather than overwrites, so the history survives. Exactly one
  -- current row per person is enforced by the partial unique index below.
  superseded_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint people_verifications_note_length check (char_length(btrim(note)) between 10 and 2000)
);

-- docs/07-database-schema.md models this as UNIQUE(person_id). A unique row cannot record a
-- second review, which means the badge can never be re-confirmed or withdrawn with a trace.
-- A partial unique index gives the same guarantee ("one current verification") with history.
create unique index if not exists people_verifications_current_key
  on public.people_verifications (person_id)
  where superseded_at is null;

create index if not exists people_verifications_source_idx
  on public.people_verifications (source_id);
create index if not exists people_verifications_verifier_idx
  on public.people_verifications (verified_by, verified_at desc);

create table if not exists public.people_corrections (
  id              uuid primary key default gen_random_uuid(),
  person_id       uuid not null references public.people(id) on delete restrict,
  submitted_by    uuid references auth.users(id) on delete set null,
  submitted_email text,
  claim           text not null,
  evidence        text,
  state           text not null default 'open',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  resolved_by     uuid references auth.users(id) on delete set null,
  resolved_at     timestamptz,
  constraint people_corrections_state check (state in ('open', 'accepted', 'rejected')),
  constraint people_corrections_claim_length check (char_length(btrim(claim)) between 10 and 4000),
  constraint people_corrections_contact check (
    submitted_by is not null or submitted_email is not null
  ),
  constraint people_corrections_resolution check (
    state = 'open' or resolved_at is not null
  ),
  constraint people_corrections_email_format check (
    submitted_email is null or submitted_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  )
);

create index if not exists people_sources_person_idx   on public.people_sources (person_id, recorded_at desc);
create index if not exists people_offices_person_idx    on public.people_offices (person_id);
create index if not exists people_offices_source_idx    on public.people_offices (source_id);
create index if not exists people_offices_current_idx   on public.people_offices (is_current) where is_current;
create index if not exists people_offices_search_idx    on public.people_offices (lower(institution));
create index if not exists people_corrections_queue_idx on public.people_corrections (state, created_at);
create index if not exists people_corrections_person_idx on public.people_corrections (person_id, created_at desc);
create index if not exists people_status_idx            on public.people (status, updated_at desc);
create index if not exists people_name_search_idx       on public.people (lower(full_name));

-- FK coverage: "everything this staff member recorded or resolved" is the correction-queue and
-- source-provenance lookup.
create index if not exists people_sources_recorded_by_idx
  on public.people_sources (recorded_by);
create index if not exists people_corrections_submitter_idx
  on public.people_corrections (submitted_by, created_at desc);
create index if not exists people_corrections_resolver_idx
  on public.people_corrections (resolved_by);

------------------------------------------------------------------------------
-- Publish gate
------------------------------------------------------------------------------

create or replace function public.enforce_person_publishable()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_sources integer;
begin
  if new.status = 'published' then
    if new.deleted_at is not null then
      raise exception using
        errcode = '23514',
        message = 'person_publish_deleted',
        detail = 'A deleted person cannot be published.';
    end if;

    select count(*) into v_sources
    from public.people_sources s
    where s.person_id = new.id;

    if v_sources = 0 then
      raise exception using
        errcode = '23514',
        message = 'person_publish_requires_source',
        detail = 'A person cannot be published without at least one recorded source.',
        hint = 'Insert a people_sources row for this person, then publish.';
    end if;

    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists people_publish_requires_source on public.people;
create trigger people_publish_requires_source
  before insert or update on public.people
  for each row execute function public.enforce_person_publishable();

-- The gate has to hold in the other direction too: deleting the last source of a published
-- person would leave a published claim with no evidence.
create or replace function public.guard_person_source_removal()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
  v_remaining integer;
begin
  select p.status into v_status from public.people p where p.id = old.person_id;

  if v_status = 'published' then
    select count(*) into v_remaining
    from public.people_sources s
    where s.person_id = old.person_id and s.id <> old.id;

    if v_remaining = 0 then
      raise exception using
        errcode = '23514',
        message = 'person_source_required',
        detail = 'A published person must keep at least one source.',
        hint = 'Withdraw the profile first, or add a replacement source.';
    end if;
  end if;

  return old;
end;
$$;

drop trigger if exists people_sources_keep_one on public.people_sources;
create trigger people_sources_keep_one
  before delete on public.people_sources
  for each row execute function public.guard_person_source_removal();

------------------------------------------------------------------------------
-- updated_at
------------------------------------------------------------------------------

drop trigger if exists people_set_updated_at on public.people;
create trigger people_set_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

drop trigger if exists people_offices_set_updated_at on public.people_offices;
create trigger people_offices_set_updated_at
  before update on public.people_offices
  for each row execute function public.set_updated_at();

drop trigger if exists people_corrections_set_updated_at on public.people_corrections;
create trigger people_corrections_set_updated_at
  before update on public.people_corrections
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- Public read model
------------------------------------------------------------------------------

-- security_invoker so RLS still applies. The join to people_verifications only touches columns
-- that are granted to anon and filtered by the verification policy, so a member sees the badge
-- and its date — never the reviewer's identity or the review note.
drop view if exists public.published_people;
create view public.published_people
  with (security_invoker = true)
as
select
  p.id,
  p.slug::text        as slug,
  p.full_name,
  p.preferred_name,
  p.portrait_key,
  p.portrait_alt,
  p.portrait_credit,
  p.community,
  p.community_note,
  p.biography,
  p.is_deceased,
  p.published_at,
  -- verified_at is NOT NULL on the table, so "a current verification row exists" and
  -- "verified_at is not null" are the same test. Using verified_at keeps the view buildable from
  -- the columns that are actually granted to anon; selecting v.id would fail the whole view,
  -- because security_invoker checks column privileges and id is deliberately not granted.
  (v.verified_at is not null)  as is_verified,
  v.verified_at
from public.people p
left join public.people_verifications v
  on v.person_id = p.id and v.superseded_at is null
where p.status = 'published'
  and p.deleted_at is null;

------------------------------------------------------------------------------
-- RLS
------------------------------------------------------------------------------

alter table public.people enable row level security;
alter table public.people_sources enable row level security;
alter table public.people_offices enable row level security;
alter table public.people_verifications enable row level security;
alter table public.people_corrections enable row level security;

revoke all on table public.people from public, anon, authenticated;
revoke all on table public.people_sources from public, anon, authenticated;
revoke all on table public.people_offices from public, anon, authenticated;
revoke all on table public.people_verifications from public, anon, authenticated;
revoke all on table public.people_corrections from public, anon, authenticated;

-- Column-level read: the contributor's name and consent record are personal data about a third
-- party and are never public. revision is an implementation detail.
grant select (id, slug, full_name, preferred_name, portrait_key, portrait_alt, portrait_credit,
              community, community_note, biography, is_deceased, status, published_at,
              deleted_at, created_at, updated_at)
  on table public.people to anon, authenticated;

grant select (id, person_id, kind, citation, url, visibility, recorded_at, created_at)
  on table public.people_sources to anon, authenticated;
grant select on table public.people_offices to anon, authenticated;
grant select (person_id, verified_at, superseded_at) on table public.people_verifications to anon, authenticated;
grant select on table public.published_people to anon, authenticated;

drop policy if exists people_read_published on public.people;
create policy people_read_published on public.people
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists people_read_staff on public.people;
create policy people_read_staff on public.people
  for select to authenticated
  using (public.has_capability('people.manage') or public.has_capability('article.review'));

drop policy if exists people_sources_read_published on public.people_sources;
create policy people_sources_read_published on public.people_sources
  for select to anon, authenticated
  using (
    visibility = 'public'
    and exists (
      select 1 from public.people p
      where p.id = people_sources.person_id
        and p.status = 'published'
        and p.deleted_at is null
    )
  );

drop policy if exists people_sources_read_staff on public.people_sources;
create policy people_sources_read_staff on public.people_sources
  for select to authenticated
  using (public.has_capability('people.manage'));

drop policy if exists people_offices_read_published on public.people_offices;
create policy people_offices_read_published on public.people_offices
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.people p
      where p.id = people_offices.person_id
        and p.status = 'published'
        and p.deleted_at is null
    )
  );

drop policy if exists people_offices_read_staff on public.people_offices;
create policy people_offices_read_staff on public.people_offices
  for select to authenticated
  using (public.has_capability('people.manage'));

-- The badge is public; the reviewer and the note are not. Column grants above make that true
-- even if a policy is later widened.
drop policy if exists people_verifications_read_current on public.people_verifications;
create policy people_verifications_read_current on public.people_verifications
  for select to anon, authenticated
  using (
    superseded_at is null
    and exists (
      select 1 from public.people p
      where p.id = people_verifications.person_id
        and p.status = 'published'
        and p.deleted_at is null
    )
  );

drop policy if exists people_verifications_read_staff on public.people_verifications;
create policy people_verifications_read_staff on public.people_verifications
  for select to authenticated
  using (public.has_capability('people.manage'));

-- Corrections are submitted through a rate-limited server route using the service role, not by
-- an anonymous INSERT. The public has no write grant here at all. A signed-in submitter can see
-- their own submissions and nothing else.
drop policy if exists people_corrections_read_own on public.people_corrections;
create policy people_corrections_read_own on public.people_corrections
  for select to authenticated
  using (submitted_by = (select auth.uid()));

drop policy if exists people_corrections_read_staff on public.people_corrections;
create policy people_corrections_read_staff on public.people_corrections
  for select to authenticated
  using (public.has_capability('people.manage'));

-- No INSERT/UPDATE/DELETE grant or policy on people, people_sources, people_offices or
-- people_verifications for anon or authenticated. Publishing and verifying go through the
-- SECURITY DEFINER functions in 20261102200006_editorial_transitions.sql.
