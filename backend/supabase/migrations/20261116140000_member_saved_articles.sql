-- Member saved stories.
--
-- The member dashboard exposes a "Saved" tab. It previously reported that the
-- feature did not exist because no storage had been authored. This migration
-- adds that storage with owner-only row level security: a member can only read
-- or write their own rows, and rows disappear automatically when either the
-- account or the article is deleted.
--
-- Additive only: no existing table, policy or grant is modified.

create table if not exists public.saved_articles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_articles_unique_member_article unique (user_id, article_id)
);

create index if not exists saved_articles_member_created_idx
  on public.saved_articles (user_id, created_at desc);

-- The unique constraint covers (user_id, article_id); article_id also needs its
-- own index so cascade deletes and story lookups never scan the table.
create index if not exists saved_articles_article_idx
  on public.saved_articles (article_id);

alter table public.saved_articles enable row level security;

revoke all on table public.saved_articles from public, anon;
grant select, insert, delete on table public.saved_articles to authenticated;

drop policy if exists saved_articles_owner_read on public.saved_articles;
create policy saved_articles_owner_read
  on public.saved_articles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists saved_articles_owner_insert on public.saved_articles;
create policy saved_articles_owner_insert
  on public.saved_articles
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists saved_articles_owner_delete on public.saved_articles;
create policy saved_articles_owner_delete
  on public.saved_articles
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

comment on table public.saved_articles is
  'Member-owned saved-story list. Reads and writes are restricted to the owning member by row level security.';
