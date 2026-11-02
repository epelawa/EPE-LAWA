-- Local, unapplied foundation. Contains no accounts, grants or seeded data.
-- Administrative writes must use a separately reviewed, auditable provisioning process.

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.staff_capability_grants (
  user_id uuid not null references public.staff_profiles(user_id) on delete cascade,
  capability text not null check (capability = 'admin.access'),
  granted_at timestamptz not null default now(),
  primary key (user_id, capability)
);

alter table public.staff_profiles enable row level security;
alter table public.staff_capability_grants enable row level security;

-- Explicit grants and policies ensure an authenticated account is not automatically staff.
revoke all on table public.staff_profiles from public, anon, authenticated;
revoke all on table public.staff_capability_grants from public, anon, authenticated;
grant select on table public.staff_profiles to authenticated;
grant select on table public.staff_capability_grants to authenticated;

create policy staff_read_own_profile on public.staff_profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy staff_read_own_active_capability on public.staff_capability_grants
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.staff_profiles as profile
      where profile.user_id = staff_capability_grants.user_id
        and profile.is_active = true
    )
  );

-- No insert/update/delete policy or privilege is granted to anon/authenticated.
-- admin.access grants only entry; future resource permissions require separate review.
