-- EPE LAWA — M1: staff capability catalogue + capability evaluation helpers.
--
-- Builds on 20261102133703_staff_access_foundation (the only migration applied to production).
-- Creates no account, no grant and no content row.
--
-- Why the helpers live in this file: every RLS policy in every later migration calls
-- public.has_capability(). A helper cannot be introduced after the policies that depend on it,
-- so it ships with the vocabulary it evaluates.
--
-- Why capabilities and not roles: the client's role names (editor-in-chief, journalist, radio
-- manager) keep changing. Capabilities are stable; a role is a UI grouping over capabilities.

create table if not exists public.capabilities (
  key         text primary key,
  description text not null,
  created_at  timestamptz not null default now(),
  constraint capabilities_key_format check (key ~ '^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$')
);

alter table public.staff_capability_grants
  add column if not exists granted_by uuid references auth.users(id) on delete set null,
  add column if not exists revoked_at timestamptz;

-- Reference data, not demo data: this is the vocabulary the application understands, and no
-- staff operation works without it. Reviewed in docs/07-database-schema.md §2.3.
insert into public.capabilities (key, description) values
  ('admin.access',      'Full administrative access to the admin host and all staff operations'),
  ('article.create',    'Create and edit draft articles'),
  ('article.review',    'Request revision, approve and reject articles'),
  ('article.publish',   'Publish approved articles and flag breaking news'),
  ('article.unpublish', 'Unpublish published articles'),
  ('people.manage',     'Create, edit and verify Who is Who records'),
  ('radio.manage',      'Configure the radio stream, schedule and episodes'),
  ('moderation.review', 'Hide, restore, dismiss and ban in the moderation queue'),
  ('business.review',   'Review and verify business submissions'),
  ('order.manage',      'Advance order status'),
  ('staff.manage',      'Create and revoke staff capability grants'),
  ('audit.read',        'Read the audit log')
on conflict (key) do nothing;

-- Move the legacy single-value constraint onto the catalogue, then drop it. The old constraint
-- permitted only 'admin.access'; every row it allowed is a key in the catalogue above.
alter table public.staff_capability_grants
  drop constraint if exists staff_capability_grants_capability_check;
alter table public.staff_capability_grants
  drop constraint if exists staff_capability_grants_capability_fkey;
alter table public.staff_capability_grants
  add constraint staff_capability_grants_capability_fkey
  foreign key (capability) references public.capabilities(key) on delete restrict;

-- "Who holds this capability" is an administrative query; the primary key (user_id, capability)
-- already serves the per-user lookup that every policy performs.
create index if not exists staff_capability_grants_capability_idx
  on public.staff_capability_grants (capability);

alter table public.capabilities enable row level security;

revoke all on table public.capabilities from public, anon, authenticated;
grant select on table public.capabilities to authenticated;

-- Capability names are not a secret. Only authenticated staff-adjacent sessions can read them;
-- anon has no reason to.
drop policy if exists capabilities_read on public.capabilities;
create policy capabilities_read on public.capabilities
  for select to authenticated
  using (true);

-- No insert/update/delete policy and no grant for anon or authenticated.
-- Provisioning runs through a reviewed, auditable server process with the service role.

------------------------------------------------------------------------------
-- Capability evaluation
------------------------------------------------------------------------------

-- Why SECURITY DEFINER: staff_profiles and staff_capability_grants are readable only by their
-- own row. A policy on another table cannot see them under the caller's identity, so the check
-- must run with the definer's rights. search_path is pinned so no caller can shadow a lookup.
-- All three are read-only; none of them writes or returns another user's data.

create or replace function public.current_staff_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles p
    where p.user_id = auth.uid()
      and p.is_active
  );
$$;

create or replace function public.has_capability(p_capability text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_capability_grants g
    join public.staff_profiles p on p.user_id = g.user_id
    where g.user_id = auth.uid()
      and g.capability = p_capability
      and g.revoked_at is null
      and p.is_active
  );
$$;

create or replace function public.require_capability(p_capability text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'not_authenticated';
  end if;

  if not public.has_capability(p_capability) then
    raise exception using
      errcode = '42501',
      message = 'capability_required',
      detail = format('Missing capability: %s', p_capability),
      hint = 'Ask an administrator to grant this capability.';
  end if;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default. Revoke first, then grant narrowly.
revoke all on function public.current_staff_is_active() from public;
revoke all on function public.has_capability(text) from public;
revoke all on function public.require_capability(text) from public;

-- anon needs these because public read policies contain staff branches that must evaluate to
-- false for an anonymous caller. auth.uid() is null there, so the answer is always false.
grant execute on function public.current_staff_is_active() to anon, authenticated;
grant execute on function public.has_capability(text) to anon, authenticated;
grant execute on function public.require_capability(text) to authenticated;
