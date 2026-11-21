-- Primary administrator accounts: full, future-proof access.
--
-- info.epelawa@gmail.com is the platform owner account. admin.epelawa@gmail.com
-- was created later at the owner's request. Both are treated as primary
-- administrators: they hold every current capability and any capability added
-- in the future, without needing a new grant per capability.
-- staff.roles.manage stays reserved to the primary administrator emails.

create or replace function public.has_capability(p_capability text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists(
    select 1 from public.staff_profiles p join auth.users u on u.id = p.user_id
    where u.id = auth.uid()
      and p.is_active
      and u.email_confirmed_at is not null
      and lower(u.email) in ('info.epelawa@gmail.com', 'admin.epelawa@gmail.com')
  )
  or exists(
    select 1 from public.staff_capability_grants g
    join public.staff_profiles p on p.user_id = g.user_id
    join auth.users u on u.id = g.user_id
    where g.user_id = auth.uid()
      and g.capability = p_capability
      and g.revoked_at is null
      and p.is_active
      and u.email_confirmed_at is not null
      and (p_capability <> 'staff.roles.manage' or lower(u.email) = 'info.epelawa@gmail.com')
  )
  or (
    p_capability <> 'staff.roles.manage'
    and exists(
      select 1 from public.staff_role_assignments a
      join public.staff_profiles p on p.user_id = a.user_id
      join auth.users u on u.id = p.user_id
      join public.staff_role_capabilities rc on rc.role_id = a.role_id
      where a.user_id = auth.uid()
        and rc.capability = p_capability
        and p.is_active
        and u.email_confirmed_at is not null
    )
  );
$$;

create or replace function public.staff_roles_authorized()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists(
    select 1 from auth.users u join public.staff_profiles p on p.user_id = u.id
    where u.id = auth.uid()
      and lower(u.email) in ('info.epelawa@gmail.com', 'admin.epelawa@gmail.com')
      and u.email_confirmed_at is not null
      and p.is_active
  );
$$;

revoke all on function public.has_capability(text) from public;
grant execute on function public.has_capability(text) to anon, authenticated;
revoke all on function public.staff_roles_authorized() from public, anon;
grant execute on function public.staff_roles_authorized() to authenticated;
