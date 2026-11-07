-- EPE LAWA — M2: editorial core.
-- authors, categories, tags, articles, article_versions, article_version_tags, published view.
--
-- Immutability model (docs/01-product-requirements.md §2.2, docs/00-master-plan.md §2.1):
--   * A version is a snapshot. Once approved it cannot be edited; a correction is a NEW version.
--   * "Published" is a pointer (articles.published_version_id), not a state on the version.
--     That is what makes unpublish a pointer change instead of a data edit.
--   * Version states only move forward: draft -> review -> approved | rejected.

create extension if not exists citext;

------------------------------------------------------------------------------
-- Slug helpers
------------------------------------------------------------------------------

-- Diacritic folding matters here. Epe place and personal names carry tone marks and the Yoruba
-- dotted letters (ẹ ọ ṣ). A naive "strip everything that is not a-z" turns "Àjà" into "-j-",
-- which is not a slug, it is a bug. translate() is used instead of the unaccent extension so the
-- migration has no extension dependency and deterministic behaviour across environments.
create or replace function public.slugify(p_input text)
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(
    trim(both '-' from
      regexp_replace(
        translate(
          lower(coalesce(p_input, '')),
          'àáâãäåāăąçćčèéêëēĕėęěìíîïĩīĭįñńņǹòóôõöøōŏőùúûüũūŭůűųšśşžźżẹọṣ',
          'aaaaaaaaaccc' || 'eeeeeeeee' || 'iiiiiiii' || 'nnnn' || 'ooooooooo'
            || 'uuuuuuuuuu' || 'sss' || 'zzz' || 'eos'
        ),
        '[^a-z0-9]+', '-', 'g'
      )
    ),
    ''
  );
$$;

-- The two translate() strings map one character to one character. They are written as
-- concatenated groups so each group can be counted against its source group during review:
-- 9+3+9+8+4+8+10+3+3+3 = 60 on both sides. A length mismatch silently deletes characters,
-- which is why the groups are explicit rather than one long literal.

create or replace function public.article_slug(p_title text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_base      text;
  v_candidate text;
  v_n         integer := 1;
begin
  v_base := coalesce(public.slugify(p_title), 'article');
  v_candidate := v_base;

  loop
    exit when not exists (
      select 1 from public.articles a where a.slug = v_candidate
    );
    v_n := v_n + 1;
    if v_n > 50 then
      -- Give up on the readable sequence and fall back to entropy. The unique constraint is
      -- still the final authority; a collision here raises rather than silently reusing a slug.
      v_candidate := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
      exit;
    end if;
    v_candidate := v_base || '-' || v_n::text;
  end loop;

  return v_candidate;
end;
$$;

------------------------------------------------------------------------------
-- Reference tables
------------------------------------------------------------------------------

create table if not exists public.authors (
  id            uuid primary key default gen_random_uuid(),
  staff_user_id uuid references auth.users(id) on delete set null,
  display_name  text not null,
  slug          citext not null unique,
  bio           text,
  photo_key     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint authors_display_name_length check (char_length(btrim(display_name)) between 1 and 120),
  constraint authors_slug_format check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint authors_bio_length check (bio is null or char_length(bio) <= 2000)
);

-- A byline does not require a login (an author may be a historical or external contributor),
-- so this index exists for the case where it does.
create index if not exists authors_staff_user_idx on public.authors (staff_user_id);

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        citext not null unique,
  label       text not null,
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint categories_slug_format check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint categories_label_length check (char_length(btrim(label)) between 1 and 60),
  constraint categories_description_length check (description is null or char_length(description) <= 500)
);

create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  slug       citext not null unique,
  label      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_slug_format check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint tags_label_length check (char_length(btrim(label)) between 1 and 60)
);

-- Approved taxonomy, cited: docs/01-product-requirements.md §2.1 N3
-- "Categories (Politics, Sports, Culture, Education, Events, Business, Community) and free tags".
-- This is reference data the client specified, not content and not a demo. It is idempotent and
-- the developer may delete this block if the taxonomy is not confirmed.
insert into public.categories (slug, label, sort_order) values
  ('politics',  'Politics',  10),
  ('sports',    'Sports',    20),
  ('culture',   'Culture',   30),
  ('education', 'Education', 40),
  ('events',    'Events',    50),
  ('business',  'Business',  60),
  ('community', 'Community', 70)
on conflict (slug) do nothing;

------------------------------------------------------------------------------
-- Articles
------------------------------------------------------------------------------

create table if not exists public.articles (
  id                   uuid primary key default gen_random_uuid(),
  slug                 citext not null unique,
  owner_id             uuid not null references auth.users(id) on delete restrict,
  current_version_id   uuid,
  published_version_id uuid,
  published_at         timestamptz,
  revision             bigint not null default 1,
  is_breaking          boolean not null default false,
  breaking_until       timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint articles_slug_format check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint articles_revision_positive check (revision > 0),
  -- A breaking banner without an expiry is a permanent banner. Never allowed.
  constraint articles_breaking_requires_expiry check (
    is_breaking = false
    or (published_version_id is not null and breaking_until is not null)
  )
);

create table if not exists public.article_versions (
  id              uuid primary key default gen_random_uuid(),
  article_id      uuid not null references public.articles(id) on delete restrict,
  version_number  integer not null,
  title           text not null,
  summary         text,
  body            jsonb not null,
  author_id       uuid not null references public.authors(id) on delete restrict,
  category_id     uuid not null references public.categories(id) on delete restrict,
  seo_title       text,
  seo_description text,
  og_image_key    text,
  state           text not null default 'draft',
  created_by      uuid not null references auth.users(id) on delete restrict,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint article_versions_number_positive check (version_number > 0),
  constraint article_versions_state check (state in ('draft', 'review', 'approved', 'rejected')),
  constraint article_versions_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint article_versions_summary_length check (summary is null or char_length(summary) <= 1000),
  constraint article_versions_seo_title_length check (seo_title is null or char_length(seo_title) <= 70),
  constraint article_versions_seo_description_length check (seo_description is null or char_length(seo_description) <= 200),
  constraint article_versions_article_number_key unique (article_id, version_number),
  -- Needed as the target of the composite foreign key below: a version is addressable only as
  -- (id, article_id), which is what stops an article pointing at another article's version.
  constraint article_versions_id_article_key unique (id, article_id)
);

-- Both sides exist now, so the cross-references can be true constraints rather than a convention.
-- ON DELETE RESTRICT: an article that is referenced by versions is deleted deliberately or not at
-- all. MATCH SIMPLE means a NULL pointer is simply "no version yet".
alter table public.articles drop constraint if exists articles_current_version_fkey;
alter table public.articles
  add constraint articles_current_version_fkey
  foreign key (current_version_id, id) references public.article_versions (id, article_id)
  on delete restrict;

alter table public.articles drop constraint if exists articles_published_version_fkey;
alter table public.articles
  add constraint articles_published_version_fkey
  foreign key (published_version_id, id) references public.article_versions (id, article_id)
  on delete restrict;

create table if not exists public.article_version_tags (
  version_id uuid not null references public.article_versions(id) on delete cascade,
  tag_id     uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (version_id, tag_id)
);

------------------------------------------------------------------------------
-- Indexes the application actually needs
------------------------------------------------------------------------------

-- News home feed: newest published first, id as the tiebreaker for stable cursor pagination.
create index if not exists articles_published_feed_idx
  on public.articles (published_at desc, id desc)
  where published_version_id is not null;

-- Resolving "is this version the published one" on every public read.
create index if not exists articles_published_version_idx
  on public.articles (published_version_id)
  where published_version_id is not null;

-- Staff newsroom list: my drafts.
create index if not exists articles_owner_idx
  on public.articles (owner_id, updated_at desc);

-- Live breaking banner lookup.
create index if not exists articles_breaking_idx
  on public.articles (breaking_until desc)
  where is_breaking;

-- Version history for one article is served by article_versions_article_number_key.
create index if not exists article_version_tags_tag_idx
  on public.article_version_tags (tag_id);

-- Postgres full-text first (docs/07-database-schema.md §11), no search service.
create index if not exists article_versions_search_idx
  on public.article_versions
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '')));

create index if not exists article_versions_state_idx
  on public.article_versions (state)
  where state in ('review', 'approved');

-- FK coverage. "Which articles did this author write" and "what is in this category" are both
-- real dashboard screens, and Postgres does not index a foreign key for you.
create index if not exists article_versions_author_idx
  on public.article_versions (author_id, created_at desc);
create index if not exists article_versions_category_idx
  on public.article_versions (category_id, created_at desc);
create index if not exists article_versions_created_by_idx
  on public.article_versions (created_by);
create index if not exists articles_current_version_idx
  on public.articles (current_version_id);

------------------------------------------------------------------------------
-- updated_at + immutability guards
------------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists authors_set_updated_at on public.authors;
create trigger authors_set_updated_at
  before update on public.authors
  for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists tags_set_updated_at on public.tags;
create trigger tags_set_updated_at
  before update on public.tags
  for each row execute function public.set_updated_at();

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

drop trigger if exists article_versions_set_updated_at on public.article_versions;
create trigger article_versions_set_updated_at
  before update on public.article_versions
  for each row execute function public.set_updated_at();

-- A published article must never change silently (docs/01 §2.2). An approved snapshot is frozen;
-- a correction is version_number + 1 with its own review. Without this trigger the rule is a
-- comment in a document, not a guarantee.
create or replace function public.guard_article_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '42501',
      message = 'article_version_immutable',
      detail = 'Article versions are a permanent record. Unpublish the article instead of deleting history.';
  end if;

  if new.article_id <> old.article_id
     or new.version_number <> old.version_number
     or new.created_by <> old.created_by
     or new.created_at <> old.created_at then
    raise exception using
      errcode = '42501',
      message = 'article_version_immutable',
      detail = 'A version cannot be moved to another article, renumbered, or reattributed.';
  end if;

  if old.state = 'approved' and (
       new.title is distinct from old.title
    or new.summary is distinct from old.summary
    or new.body is distinct from old.body
    or new.author_id is distinct from old.author_id
    or new.category_id is distinct from old.category_id
    or new.seo_title is distinct from old.seo_title
    or new.seo_description is distinct from old.seo_description
    or new.og_image_key is distinct from old.og_image_key
  ) then
    raise exception using
      errcode = '42501',
      message = 'approved_version_immutable',
      detail = 'Create a new version for a correction. Editing an approved snapshot is how a published article changes silently.';
  end if;

  if old.state <> new.state and not (
    (old.state = 'draft'  and new.state = 'review')
    or (old.state = 'review' and new.state in ('approved', 'rejected'))
  ) then
    raise exception using
      errcode = '42501',
      message = 'invalid_version_transition',
      detail = format('Cannot move an article version from %s to %s.', old.state, new.state);
  end if;

  return new;
end;
$$;

drop trigger if exists article_versions_guard on public.article_versions;
create trigger article_versions_guard
  before update or delete on public.article_versions
  for each row execute function public.guard_article_version();

------------------------------------------------------------------------------
-- Public read model
------------------------------------------------------------------------------

-- security_invoker: the caller's identity and RLS apply, so the view can never widen access.
drop view if exists public.published_articles;
create view public.published_articles
  with (security_invoker = true)
as
select
  a.id,
  a.slug::text                 as slug,
  a.published_at,
  a.is_breaking,
  a.breaking_until,
  v.title,
  v.summary,
  v.seo_title,
  v.seo_description,
  v.og_image_key,
  au.display_name              as author_name,
  au.slug::text                as author_slug,
  c.slug::text                 as category_slug,
  c.label                      as category_label,
  coalesce(
    (
      select jsonb_agg(jsonb_build_object('slug', t.slug::text, 'label', t.label) order by t.label)
      from public.article_version_tags vt
      join public.tags t on t.id = vt.tag_id
      where vt.version_id = v.id
    ),
    '[]'::jsonb
  )                            as tags
from public.articles a
join public.article_versions v on v.id = a.published_version_id
join public.authors au on au.id = v.author_id
join public.categories c on c.id = v.category_id
where a.published_version_id is not null;

------------------------------------------------------------------------------
-- RLS
------------------------------------------------------------------------------

alter table public.authors enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.articles enable row level security;
alter table public.article_versions enable row level security;
alter table public.article_version_tags enable row level security;

revoke all on table public.authors from public, anon, authenticated;
revoke all on table public.categories from public, anon, authenticated;
revoke all on table public.tags from public, anon, authenticated;
revoke all on table public.articles from public, anon, authenticated;
revoke all on table public.article_versions from public, anon, authenticated;
revoke all on table public.article_version_tags from public, anon, authenticated;

grant select on table public.authors to anon, authenticated;
grant select on table public.categories to anon, authenticated;
grant select on table public.tags to anon, authenticated;
grant select on table public.articles to anon, authenticated;
grant select on table public.article_versions to anon, authenticated;
grant select on table public.article_version_tags to anon, authenticated;
grant select on public.published_articles to anon, authenticated;

-- Reference data. A byline and a tag label are public by design.
drop policy if exists authors_read on public.authors;
create policy authors_read on public.authors
  for select to anon, authenticated
  using (true);

drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
  for select to anon, authenticated
  using (is_active);

drop policy if exists tags_read on public.tags;
create policy tags_read on public.tags
  for select to anon, authenticated
  using (true);

-- PUBLISHED ARTICLES: readable by anyone. Drafts are readable only by their owner or by a
-- reviewer/publisher. This is the IDOR boundary for the newsroom: a journalist cannot read
-- another journalist's draft, because owner_id <> auth.uid() and they hold neither capability.
drop policy if exists articles_read_public on public.articles;
create policy articles_read_public on public.articles
  for select to anon, authenticated
  using (published_version_id is not null);

drop policy if exists articles_read_staff on public.articles;
create policy articles_read_staff on public.articles
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or public.has_capability('article.review')
    or public.has_capability('article.publish')
  );

-- VERSIONS: a version is public only when it is THE published version of a published article.
-- This is stricter than "state = approved" on purpose: an approved version of an unpublished
-- article is still a draft in every sense that matters to a reader.
drop policy if exists article_versions_read_public on public.article_versions;
create policy article_versions_read_public on public.article_versions
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.articles a
      where a.published_version_id = article_versions.id
    )
  );

drop policy if exists article_versions_read_staff on public.article_versions;
create policy article_versions_read_staff on public.article_versions
  for select to authenticated
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_versions.article_id
        and a.owner_id = (select auth.uid())
    )
    or public.has_capability('article.review')
    or public.has_capability('article.publish')
  );

drop policy if exists article_version_tags_read on public.article_version_tags;
create policy article_version_tags_read on public.article_version_tags
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.articles a
      where a.published_version_id = article_version_tags.version_id
    )
    or exists (
      select 1
      from public.article_versions v
      join public.articles a on a.id = v.article_id
      where v.id = article_version_tags.version_id
        and a.owner_id = (select auth.uid())
    )
    or public.has_capability('article.review')
    or public.has_capability('article.publish')
  );

-- No INSERT/UPDATE/DELETE policy and no grant on articles, article_versions, article_version_tags
-- for anon or authenticated. Every write goes through the SECURITY DEFINER transitions in
-- 20261102200006_editorial_transitions.sql, which check the capability and the revision first.
