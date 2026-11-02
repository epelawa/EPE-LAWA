-- EXPERIMENT ONLY. Not a migration; never deploy this proposal as-is.
-- No accounts, permissions or application data are seeded.
create table public.editorial_articles (
  id uuid primary key,
  owner_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  revision bigint not null check (revision between 1 and 9007199254740991),
  current_version_id uuid not null,
  published_version_id uuid,
  created_at timestamptz not null default now()
);
create table public.editorial_versions (
  id uuid primary key,
  article_id uuid not null references public.editorial_articles(id) on delete restrict,
  author_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  title text not null check (char_length(title) <= 200 and char_length(btrim(title)) >= 1),
  summary text not null check (char_length(summary) <= 1000),
  body text not null check (char_length(body) <= 100000 and char_length(btrim(body)) >= 1),
  state text not null check (state in ('draft', 'review', 'approved')),
  created_at timestamptz not null default now(),
  unique (article_id, id)
);
create table public.editorial_approvals (
  article_id uuid not null,
  version_id uuid not null,
  approved_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  approved_at timestamptz not null default now(),
  primary key (article_id, version_id),
  foreign key (article_id, version_id) references public.editorial_versions(article_id, id) on delete restrict
);
-- Pointers must belong to the article; publication requires an approval row.
-- Approval authorisation is enforced by the experimental functions, not the FK.
alter table public.editorial_articles
  add constraint editorial_current_version_fk foreign key (id, current_version_id)
    references public.editorial_versions(article_id, id) deferrable initially deferred,
  add constraint editorial_published_approval_fk foreign key (id, published_version_id)
    references public.editorial_approvals(article_id, version_id) deferrable initially deferred;
create table public.editorial_audit_events (
  article_id uuid not null,
  revision bigint not null check (revision between 1 and 9007199254740991),
  version_id uuid not null,
  actor_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  action text not null check (action in ('create', 'edit', 'submit', 'request_revision', 'approve', 'publish', 'unpublish')),
  occurred_at timestamptz not null default now(),
  primary key (article_id, revision),
  foreign key (article_id, version_id) references public.editorial_versions(article_id, id) on delete restrict
);
-- A provisional capability design; there is no provisioning interface.
create table public.editorial_capabilities (
  user_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  capability text not null check (capability in ('draft.create', 'draft.edit.own', 'draft.edit.any', 'draft.submit', 'article.review', 'article.approve', 'article.publish', 'article.unpublish')),
  primary key (user_id, capability)
);
alter table public.editorial_articles enable row level security;
alter table public.editorial_versions enable row level security;
alter table public.editorial_approvals enable row level security;
alter table public.editorial_audit_events enable row level security;
alter table public.editorial_capabilities enable row level security;
revoke all on public.editorial_articles, public.editorial_versions, public.editorial_approvals, public.editorial_audit_events, public.editorial_capabilities from public, anon, authenticated, service_role;
-- No table policies or application-role grants.
