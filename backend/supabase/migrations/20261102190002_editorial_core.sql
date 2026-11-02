-- M2 — editorial core.
-- The citext extension must exist before any column uses it, so it is created here
-- and not deferred to a later migration.
create extension if not exists citext schema public;

-- Authors, categories, tags, articles and version snapshots, plus the published view.
-- A draft is invisible to the public: the view only exposes rows where
-- articles.published_version_id points at an approved version.
--
-- Tags live on the version, not the article, so a tag change after publication does not
-- retroactively alter the published snapshot.

create table public.authors (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  slug citext unique not null,
  bio text,
  photo_key text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug citext unique not null,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug citext unique not null,
  label text not null
);





create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug citext unique not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.article_versions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null,
  version_number integer not null,
  title text not null,
  summary text,
  body jsonb not null,
  author_id uuid not null references public.authors(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  seo_title text,
  seo_description text,
  og_image_key text,
  state text not null check (state in ('draft', 'review', 'approved', 'rejected')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (article_id, version_number)
);

-- articles and article_versions reference each other (a version belongs to an article,
-- an article points at its current and published versions), so the cross-references are
-- added after both tables exist. This is not a workaround: the constraint is real, it is
-- just deferred until the target row type exists.
alter table public.articles
  add column if not exists current_version_id uuid references public.article_versions(id) on delete set null,
  add column if not exists published_version_id uuid references public.article_versions(id) on delete set null,
  add column if not exists published_at timestamptz,
  add column if not exists revision bigint not null default 1,
  add column if not exists is_breaking boolean not null default false,
  add column if not exists breaking_until timestamptz;

-- article_id already exists on the table; the FK is added on that column rather than
-- a new one, so the column set is the same as the schema design in docs/07.
alter table public.article_versions
  add constraint article_versions_article_id_fkey
  foreign key (article_id) references public.articles(id) on delete restrict;

create table public.article_version_tags (
  version_id uuid not null references public.article_versions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (version_id, tag_id)
);

-- The public read model. security_invoker = true so the caller's identity and RLS apply.
create view public.published_articles
  with (security_invoker = true)
as
select
  a.id,
  a.slug,
  a.published_at,
  a.is_breaking,
  a.breaking_until,
  v.title,
  v.summary,
  v.body,
  v.seo_title,
  v.seo_description,
  v.og_image_key,
  au.display_name as author_name,
  au.slug as author_slug,
  c.slug as category_slug,
  c.label as category_label
from public.articles a
join public.article_versions v on v.id = a.published_version_id and v.state = 'approved'
join public.authors au on au.id = v.author_id
join public.categories c on c.id = v.category_id
where a.published_version_id is not null;

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

-- Reference data is readable by anyone. Published content is readable by anyone.
grant select on table public.authors to anon, authenticated;
grant select on table public.categories to anon, authenticated;
grant select on table public.tags to anon, authenticated;

create policy authors_read on public.authors
  for select to anon, authenticated using (true);

create policy categories_read on public.categories
  for select to anon, authenticated using (is_active);

create policy tags_read on public.tags
  for select to anon, authenticated using (true);

-- Articles and versions: no direct write grant for anon or authenticated. Every transition
-- goes through a security definer function added in a later migration. The published view
-- is readable by anyone; RLS on the underlying tables is what keeps drafts out.
grant select on table public.articles to anon, authenticated;
grant select on table public.article_versions to anon, authenticated;

create policy articles_read_published on public.articles
  for select to anon, authenticated
  using (published_version_id is not null);

create policy article_versions_read_published on public.article_versions
  for select to anon, authenticated
  using (state = 'approved');

-- No insert/update/delete policy on articles, article_versions or article_version_tags.
-- Those are enforced by the transition function and by the absence of any grant.