-- Itan Ilu Mi: source/consent-aware history archive. No records are seeded.
insert into public.capabilities (key, description) values
  ('history.review', 'Review source-backed community history contributions and publish verified records')
on conflict (key) do nothing;

create table public.history_records (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  account text not null,
  published_at timestamptz not null default now(),
  published_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint history_records_title_length check (char_length(btrim(title)) between 3 and 180),
  constraint history_records_account_length check (char_length(btrim(account)) between 1 and 20000)
);

create table public.history_record_sources (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.history_records(id) on delete cascade,
  citation text not null,
  source_url text,
  created_at timestamptz not null default now(),
  constraint history_record_sources_citation_length check (char_length(btrim(citation)) between 3 and 1000),
  constraint history_record_sources_url check (source_url is null or source_url ~ '^https://')
);

-- Contributor identity, consent evidence, and unreviewed source/content stay private here.
create table public.history_contributions (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.profiles(user_id) on delete restrict,
  title text not null,
  account text not null,
  source_description text not null,
  source_url text,
  consent_version text not null,
  consent_text text not null,
  consented_at timestamptz not null default now(),
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint history_contributions_title_length check (char_length(btrim(title)) between 3 and 180),
  constraint history_contributions_account_length check (char_length(btrim(account)) between 20 and 20000),
  constraint history_contributions_source_length check (char_length(btrim(source_description)) between 5 and 2000),
  constraint history_contributions_source_url check (source_url is null or source_url ~ '^https://'),
  constraint history_contributions_consent check (consent_version = 'history-intake-v1' and char_length(btrim(consent_text)) between 20 and 1000),
  constraint history_contributions_status check (status in ('pending', 'needs_revision', 'rejected', 'published'))
);

create index history_records_published_idx on public.history_records (published_at desc);
create index history_sources_record_idx on public.history_record_sources (record_id);
create index history_contributions_queue_idx on public.history_contributions (status, submitted_at);
create index history_contributions_member_idx on public.history_contributions (contributor_id, submitted_at desc);
create index history_records_published_by_idx on public.history_records (published_by);
create index history_contributions_reviewed_by_idx on public.history_contributions (reviewed_by);

alter table public.history_records enable row level security;
alter table public.history_record_sources enable row level security;
alter table public.history_contributions enable row level security;

revoke all on public.history_records, public.history_record_sources, public.history_contributions from public, anon, authenticated;
grant select (id, title, account, published_at) on public.history_records to anon, authenticated;
grant select (id, record_id, citation, source_url) on public.history_record_sources to anon, authenticated;
grant insert (contributor_id, title, account, source_description, source_url, consent_version, consent_text) on public.history_contributions to authenticated;
grant select, update on public.history_contributions to authenticated;

create policy history_records_public_published on public.history_records
  for select to anon, authenticated using (true);
create policy history_sources_public on public.history_record_sources
  for select to anon, authenticated using (exists (
    select 1 from public.history_records r where r.id = record_id
  ));
create policy history_contributions_insert_member on public.history_contributions
  for insert to authenticated with check (
    contributor_id = (select auth.uid())
    and public.is_member_active()
    and not public.is_member_banned()
    and status = 'pending'
    and reviewed_at is null and reviewed_by is null
  );
create policy history_contributions_read_staff on public.history_contributions
  for select to authenticated using (public.has_capability('history.review'));
create policy history_contributions_update_staff on public.history_contributions
  for update to authenticated using (public.has_capability('history.review'))
  with check (public.has_capability('history.review'));

-- There is deliberately no client write privilege/policy for public records or public source
-- citations; the reviewed staff publication workflow must be added separately.
