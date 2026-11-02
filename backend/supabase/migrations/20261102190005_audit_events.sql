-- M5 — audit events.
--
-- Append-only for application roles. No update or delete grant for anon or authenticated,
-- so a moderator or staff member cannot alter or erase their own trail. Retention and
-- pruning are a scheduled job, not a manual operation.

create table public.audit_events (
  id bigserial primary key,
  actor_id uuid references auth.users(id),
  actor_kind text not null check (actor_kind in ('staff', 'member', 'system')),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  outcome text not null check (outcome in ('success', 'denied', 'error')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.audit_events enable row level security;

revoke all on table public.audit_events from public, anon, authenticated;
grant select on table public.audit_events to authenticated;

create policy audit_read on public.audit_events
  for select to authenticated
  using (
    exists (
      select 1 from public.staff_capability_grants g
      where g.user_id = (select auth.uid())
        and g.capability = 'audit.read'
        and g.revoked_at is null
    )
  );

-- No insert/update/delete policy. Writes go through a security definer function that
-- validates actor_kind and strips anything that should not be logged.