-- EPE LAWA — M7: public member identity, bans and the moderation record.
--
-- Two identity axes (docs/08-permissions-security.md §1): staff capability and member account are
-- separate. This file introduces the member axis and nothing here confers staff authority.
--
-- What "public profile" means: there is deliberately NO email, phone or address column. Email
-- lives in auth.users and is never joined into a public read. A handle is the public identity.
-- That is why the profiles table can be world-readable without a projection view.

create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  handle       citext not null unique,
  display_name text not null,
  avatar_key   text,
  bio          text,
  is_verified  boolean not null default false,
  verified_at  timestamptz,
  verified_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  -- 'deleted-<hash>' is written by the account-deletion routine, so the pattern allows it.
  constraint profiles_handle_format check (
    handle::text ~ '^[a-z0-9_]{3,24}$' or handle::text ~ '^deleted-[a-f0-9]{8,16}$'
  ),
  constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 60),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 500),
  -- A verified badge is a record, never a self-declared flag (docs/00-master-plan.md §2).
  constraint profiles_verification_recorded check (
    is_verified = false or (verified_at is not null and verified_by is not null)
  )
);

-- Reserved handles prevent impersonation of the publication itself. Exact match only, so
-- "epe_food" is still available.
create or replace function public.handle_is_reserved(p_handle text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(p_handle) = any (array[
    'admin', 'administrator', 'epelawa', 'epe', 'support', 'moderator', 'mod',
    'news', 'radio', 'api', 'staff', 'system', 'help', 'info', 'contact',
    'official', 'root', 'security', 'editor', 'publisher', 'deleted'
  ]);
$$;

alter table public.profiles drop constraint if exists profiles_handle_not_reserved;
alter table public.profiles
  add constraint profiles_handle_not_reserved check (not public.handle_is_reserved(handle::text));

------------------------------------------------------------------------------
-- Bans
------------------------------------------------------------------------------

-- A ban is a database fact, not a UI flag (docs/08 §8). RLS checks it on every write.
create table if not exists public.member_bans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  reason     text not null,
  issued_by  uuid not null references auth.users(id) on delete restrict,
  issued_at  timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  constraint member_bans_reason_length check (char_length(btrim(reason)) between 5 and 1000),
  constraint member_bans_expiry_after_issue check (expires_at is null or expires_at > issued_at)
);

-- One live ban row per member. A permanent ban is expires_at = null. Issuing a new ban must
-- first revoke the old row; the function path does that in one transaction.
create unique index if not exists member_bans_active_key
  on public.member_bans (user_id)
  where revoked_at is null;

create index if not exists member_bans_user_idx on public.member_bans (user_id, issued_at desc);

------------------------------------------------------------------------------
-- Moderation record
------------------------------------------------------------------------------

-- Every hide, restore, lock, ban and dismissal lands here with a mandatory reason. Target is
-- polymorphic because one queue handles comments, forum posts, threads and businesses; a
-- polymorphic foreign key is impossible in Postgres, so target_type is constrained and the
-- audit trail is the integrity guarantee. Stated openly rather than hidden.
create table if not exists public.moderation_actions (
  id           uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references auth.users(id) on delete restrict,
  target_type  text not null,
  target_id    uuid not null,
  action       text not null,
  reason       text not null,
  created_at   timestamptz not null default now(),
  constraint moderation_actions_target_type check (
    target_type in ('comment', 'forum_post', 'forum_thread', 'business', 'business_review', 'profile')
  ),
  constraint moderation_actions_action check (
    action in ('hide', 'restore', 'lock', 'unlock', 'ban', 'unban', 'dismiss', 'delist', 'verify')
  ),
  constraint moderation_actions_reason_length check (char_length(btrim(reason)) between 5 and 1000)
);

create index if not exists moderation_actions_target_idx
  on public.moderation_actions (target_type, target_id, created_at desc);
create index if not exists moderation_actions_moderator_idx
  on public.moderation_actions (moderator_id, created_at desc);

-- FK coverage: who issued, revoked or verified whom is the first question in a moderation review.
create index if not exists member_bans_issuer_idx on public.member_bans (issued_by);
create index if not exists member_bans_revoker_idx on public.member_bans (revoked_by);
create index if not exists profiles_verifier_idx  on public.profiles (verified_by);
create index if not exists staff_capability_grants_granter_idx
  on public.staff_capability_grants (granted_by);

------------------------------------------------------------------------------
-- Membership evaluation helpers
------------------------------------------------------------------------------

-- SECURITY DEFINER for the same reason as the staff helpers: a policy on comments cannot read
-- profiles or member_bans under the caller's identity. search_path pinned, read-only.
create or replace function public.is_member_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.deleted_at is null
  );
$$;

create or replace function public.is_member_banned()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.member_bans b
    where b.user_id = auth.uid()
      and b.revoked_at is null
      and (b.expires_at is null or b.expires_at > now())
  );
$$;

revoke all on function public.handle_is_reserved(text) from public;
revoke all on function public.is_member_active() from public;
revoke all on function public.is_member_banned() from public;

grant execute on function public.handle_is_reserved(text) to anon, authenticated;
grant execute on function public.is_member_active() to anon, authenticated;
grant execute on function public.is_member_banned() to anon, authenticated;

------------------------------------------------------------------------------
-- updated_at
------------------------------------------------------------------------------

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- RLS
------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.member_bans enable row level security;
alter table public.moderation_actions enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.member_bans from public, anon, authenticated;
revoke all on table public.moderation_actions from public, anon, authenticated;

-- Public identity columns only. is_verified / verified_at are safe to expose: they are a record,
-- and the check constraint above guarantees they cannot be set without a reviewer.
grant select (user_id, handle, display_name, avatar_key, bio, is_verified, verified_at, created_at, deleted_at)
  on table public.profiles to anon, authenticated;

-- A member may create their own profile and edit four fields. They cannot insert or update
-- is_verified, verified_by, deleted_at or created_at: the column grant is the boundary even if
-- a policy is later widened by mistake.
grant insert (user_id, handle, display_name, avatar_key, bio) on table public.profiles to authenticated;
grant update (handle, display_name, avatar_key, bio) on table public.profiles to authenticated;

drop policy if exists profiles_read_public on public.profiles;
create policy profiles_read_public on public.profiles
  for select to anon, authenticated
  using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()) and deleted_at is null);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()) and deleted_at is null)
  with check (user_id = (select auth.uid()) and deleted_at is null);

-- No DELETE policy or grant for anyone. Account deletion is a server-side routine that
-- anonymises the profile and destroys the auth user (docs/07-database-schema.md §13); a raw
-- cascade would take other people's replies with it.

-- A banned member can read their own ban so the UI can explain the block. Staff read all.
drop policy if exists member_bans_read_own on public.member_bans;
create policy member_bans_read_own on public.member_bans
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists member_bans_read_staff on public.member_bans;
create policy member_bans_read_staff on public.member_bans
  for select to authenticated
  using (public.has_capability('moderation.review'));

grant select on table public.member_bans to authenticated;

drop policy if exists moderation_actions_read_staff on public.moderation_actions;
create policy moderation_actions_read_staff on public.moderation_actions
  for select to authenticated
  using (public.has_capability('moderation.review'));

grant select on table public.moderation_actions to authenticated;

-- No INSERT/UPDATE/DELETE policy on moderation_actions for anon or authenticated, and no grant.
-- The moderation functions in the forum and comments migrations insert here as the definer.
