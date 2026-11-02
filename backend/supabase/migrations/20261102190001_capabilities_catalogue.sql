-- M1 — capabilities catalogue.
--
-- Replaces the single-value check (capability = 'admin.access') with a real catalogue so
-- permissions can be granted and revoked by name. Reference data, not seed/demo data:
-- these rows are the vocabulary the application understands, and they are required for any
-- staff operation to work.
--
-- Existing grants are preserved; the old constraint is dropped after migrating them.

create table public.capabilities (
  key text primary key,
  description text not null
);

alter table public.staff_capability_grants
  add column if not exists granted_by uuid references auth.users(id),
  add column if not exists revoked_at timestamptz;

-- Reference data. Order is cosmetic; the key is the contract.
insert into public.capabilities (key, description) values
  ('admin.access',        'Full administrative access to the admin host and all staff operations'),
  ('article.create',      'Create and edit draft articles'),
  ('article.review',      'Request revision, approve, and reject articles'),
  ('article.publish',     'Publish approved articles'),
  ('article.unpublish',   'Unpublish published articles'),
  ('people.manage',       'Create, edit and verify Who is Who records'),
  ('radio.manage',        'Configure the radio stream, schedule and episodes'),
  ('moderation.review',   'Hide, restore, dismiss and ban in the moderation queue'),
  ('business.review',     'Review and verify business submissions'),
  ('order.manage',        'Advance order status'),
  ('staff.manage',        'Create and revoke staff capability grants'),
  ('audit.read',          'Read the audit log')
on conflict do nothing;

-- Migrate existing grants onto the catalogue, then drop the old single-value constraint.
update public.staff_capability_grants set granted_by = null
where capability = 'admin.access' and granted_by is null;

alter table public.staff_capability_grants
  drop constraint if exists staff_capability_grants_capability_check;

alter table public.staff_capability_grants
  add constraint staff_capability_grants_capability_fkey
  foreign key (capability) references public.capabilities(key)
  on delete restrict;

alter table public.staff_capability_grants
  alter column capability set not null;

alter table public.capabilities enable row level security;
alter table public.staff_capability_grants enable row level security;

revoke all on table public.capabilities from public, anon, authenticated;
revoke all on table public.staff_capability_grants from public, anon, authenticated;
grant select on table public.capabilities to authenticated;
grant select on table public.staff_capability_grants to authenticated;

-- Capabilities are reference data: anyone who can read staff grants can read the catalogue.
create policy capabilities_read on public.capabilities
  for select to authenticated
  using (true);


-- No insert/update/delete grant for anon or authenticated. Staff management goes through
-- a security definer function, added in a later migration.