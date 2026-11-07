-- EPE LAWA — M5: append-only audit ledger.
--
-- Every consequential transition writes here through public.audit_event(). Application roles
-- have SELECT (behind audit.read) and nothing else: a moderator cannot alter or erase the trail
-- that records their own decision.
--
-- What must never land in metadata: tokens, passwords, member emails in plain text, message
-- bodies, payment card data. The caller passes ids and small facts.

create table if not exists public.audit_events (
  id            bigint generated always as identity primary key,
  actor_id      uuid references auth.users(id) on delete set null,
  actor_kind    text not null,
  action        text not null,
  resource_type text not null,
  resource_id   uuid,
  outcome       text not null,
  -- Never null: an audit row with no metadata is still required to be an object, so a consumer
  -- can always read keys safely.
  metadata      jsonb not null default '{}'::jsonb,
  request_id    text,
  created_at    timestamptz not null default now(),
  constraint audit_events_actor_kind check (actor_kind in ('staff', 'member', 'system', 'provider')),
  constraint audit_events_outcome check (outcome in ('success', 'denied', 'error')),
  constraint audit_events_action_format check (action ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  constraint audit_events_resource_type_length check (char_length(resource_type) between 2 and 60),
  constraint audit_events_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint audit_events_request_id_length check (request_id is null or char_length(request_id) <= 128)
);

create index if not exists audit_events_actor_idx
  on public.audit_events (actor_id, created_at desc);
create index if not exists audit_events_resource_idx
  on public.audit_events (resource_type, resource_id, created_at desc);
create index if not exists audit_events_created_idx
  on public.audit_events (created_at desc);

------------------------------------------------------------------------------
-- Write path
------------------------------------------------------------------------------

-- SECURITY DEFINER so that a transition function running as the definer can always append,
-- while the application roles cannot append directly. The caller is taken from the session
-- (auth.uid()), never from a parameter — an actor argument would let any caller write a row
-- blaming somebody else.
--
-- EXECUTE is revoked from PUBLIC, anon and authenticated. Only the other SECURITY DEFINER
-- functions in this schema call it.
create or replace function public.audit_event(
  p_actor_kind    text,
  p_action        text,
  p_resource_type text,
  p_resource_id   uuid,
  p_outcome       text,
  p_metadata      jsonb default '{}'::jsonb,
  p_request_id    text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  -- A 'staff' or 'member' event with no session is a system action pretending to be a person.
  if p_actor_kind in ('staff', 'member') and v_actor is null then
    raise exception using
      errcode = '42501',
      message = 'audit_actor_required',
      detail = format('actor_kind %s requires an authenticated session.', p_actor_kind);
  end if;

  insert into public.audit_events (
    actor_id, actor_kind, action, resource_type, resource_id, outcome, metadata, request_id
  ) values (
    v_actor, p_actor_kind, p_action, p_resource_type, p_resource_id, p_outcome,
    coalesce(p_metadata, '{}'::jsonb), p_request_id
  );
end;
$$;

revoke all on function public.audit_event(text, text, text, uuid, text, jsonb, text) from public;

------------------------------------------------------------------------------
-- RLS
------------------------------------------------------------------------------

alter table public.audit_events enable row level security;

revoke all on table public.audit_events from public, anon, authenticated;
grant select on table public.audit_events to authenticated;

drop policy if exists audit_events_read on public.audit_events;
create policy audit_events_read on public.audit_events
  for select to authenticated
  using (public.has_capability('audit.read'));

-- No INSERT, UPDATE or DELETE policy for anon or authenticated, and no grant. The table is
-- append-only from the application's point of view. Retention (24 months per
-- docs/07-database-schema.md §10) is a scheduled job with the service role, and the rows it
-- removes are recorded in the job log.
