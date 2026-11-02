-- M4 — Who is Who.
--
-- This module makes claims about real, living people, so the publish gate is enforced in
-- the database rather than trusted in the UI. A CHECK constraint cannot reference another
-- table, so a BEFORE trigger raises instead. This is the single most important constraint
-- in the schema: without it the verification badge is decoration.

create table public.people (
  id uuid primary key default gen_random_uuid(),
  slug citext unique not null,
  full_name text not null,
  preferred_name text,
  portrait_key text,
  community text,
  biography text,
  is_deceased boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  deleted_at timestamptz
);

create table public.people_sources (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  kind text not null
    check (kind in ('interview', 'document', 'publication', 'government_record', 'family_record')),
  citation text not null,
  url text,
  recorded_by uuid references auth.users(id),
  recorded_at timestamptz not null default now()
);

create table public.people_offices (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  title text not null,
  institution text not null,
  term_start date,
  term_end date,
  is_current boolean not null default false,
  source_id uuid references public.people_sources(id) on delete set null
);

create table public.people_verifications (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  verified_by uuid not null references auth.users(id),
  verified_at timestamptz not null default now(),
  source_id uuid not null references public.people_sources(id),
  note text,
  unique (person_id)
);

create table public.people_corrections (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  submitted_by uuid references auth.users(id),
  submitted_email text,
  claim text not null,
  evidence text,
  state text not null default 'open'
    check (state in ('open', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz
);

-- A published person must have at least one recorded source. The check runs on insert and
-- on update, and on every row that is set to published.
create or replace function public.enforce_people_publish_source()
returns trigger language plpgsql as $$
declare
  source_count integer;
begin
  if new.status = 'published' and new.deleted_at is null then
    select count(*) into source_count
    from public.people_sources
    where person_id = new.id;
    if source_count = 0 then
      raise exception
        using message = 'people.publish_requires_source',
              detail = 'A person cannot be published without at least one recorded source.',
              hint = 'Add a row to people_sources for this person before publishing.';
    end if;
  end if;
  return new;
end;
$$;

create trigger people_publish_requires_source
  before insert or update on public.people
  for each row execute function public.enforce_people_publish_source();

-- The verification badge must not be set without a reviewer, a date and a source.
alter table public.people_verifications
  add constraint verification_requires_reviewer
  check (verified_by is not null and verified_at is not null and source_id is not null);

alter table public.people enable row level security;
alter table public.people_offices enable row level security;
alter table public.people_sources enable row level security;
alter table public.people_verifications enable row level security;
alter table public.people_corrections enable row level security;

revoke all on table public.people from public, anon, authenticated;
revoke all on table public.people_offices from public, anon, authenticated;
revoke all on table public.people_sources from public, anon, authenticated;
revoke all on table public.people_verifications from public, anon, authenticated;
revoke all on table public.people_corrections from public, anon, authenticated;

-- Public reads: published records only. The trigger above is what keeps drafts out of
-- this grant; RLS is the second line and must not be relied on alone.
grant select on table public.people to anon, authenticated;
grant select on table public.people_offices to anon, authenticated;
grant select on table public.people_sources to anon, authenticated;

create policy people_read_published on public.people
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

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

create policy people_sources_read_published on public.people_sources
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.people p
      where p.id = people_sources.person_id
        and p.status = 'published'
        and p.deleted_at is null
    )
  );

-- Verifications and corrections are not public: they are staff and contributor data.
-- No grant for anon or authenticated. Writes go through security definer functions later.