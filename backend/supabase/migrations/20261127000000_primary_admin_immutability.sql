-- Primary administrator immutability
--
-- Prevents any staff member (including other admins) from:
-- 1. Assigning or removing roles from primary administrators
-- 2. Deactivating primary administrator accounts
-- 3. Revoking capabilities from primary administrators
--
-- Primary administrators: info.epelawa@gmail.com, admin.epelawa@gmail.com
-- These accounts have full, immutable access to all capabilities.

-- Helper function to check if a user is a primary administrator
create or replace function public.is_primary_administrator(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from auth.users u
    where u.id = p_user_id
      and u.email_confirmed_at is not null
      and lower(u.email) in ('info.epelawa@gmail.com', 'admin.epelawa@gmail.com')
  );
$$;

grant execute on function public.is_primary_administrator(uuid) to authenticated;

-- Update staff_role_assign to prevent role changes for primary administrators
create or replace function public.staff_role_assign(p_user_id uuid, p_role_id uuid, p_assigned boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.staff_roles_authorized() then
    raise exception using errcode = '42501', message = 'role_management_forbidden';
  end if;
  
  -- Prevent self-assignment
  if p_user_id = auth.uid() then
    raise exception 'self_assignment_forbidden';
  end if;
  
  -- Prevent role changes for primary administrators
  if public.is_primary_administrator(p_user_id) then
    raise exception using errcode = '42501', message = 'primary_admin_immutable';
  end if;
  
  if not exists(select 1 from public.staff_profiles where user_id = p_user_id) then
    raise exception 'staff_profile_required';
  end if;
  
  if p_assigned then
    insert into public.staff_role_assignments(user_id, role_id, assigned_by)
    values(p_user_id, p_role_id, auth.uid())
    on conflict do nothing;
  else
    delete from public.staff_role_assignments
    where user_id = p_user_id and role_id = p_role_id;
  end if;
  
  perform public.audit_event(
    'staff',
    'staff.role_assignment',
    'staff_role',
    p_role_id,
    'success',
    jsonb_build_object('target_user_id', p_user_id, 'before', not p_assigned, 'after', p_assigned)
  );
end;
$$;

-- Update staff_user_set_active to prevent deactivating primary administrators
create or replace function public.staff_user_set_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.staff_roles_authorized() then
    raise exception using errcode = '42501', message = 'role_management_forbidden';
  end if;
  
  -- Prevent self-activation change
  if p_user_id = auth.uid() then
    raise exception 'self_activation_change_forbidden';
  end if;
  
  -- Prevent deactivating primary administrators
  if public.is_primary_administrator(p_user_id) and not p_active then
    raise exception using errcode = '42501', message = 'primary_admin_immutable';
  end if;
  
  update public.staff_profiles set is_active = p_active where user_id = p_user_id;
  
  if not found then
    raise exception 'staff_profile_required';
  end if;
  
  perform public.audit_event(
    'staff',
    'staff.activation_change',
    'staff_profile',
    p_user_id,
    'success',
    jsonb_build_object('active', p_active)
  );
end;
$$;

-- Update staff_capability_grants to prevent revoking from primary administrators
-- We need to create a function for managing capability grants
create or replace function public.staff_capability_grant(
  p_user_id uuid,
  p_capability text,
  p_granted boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.staff_roles_authorized() then
    raise exception using errcode = '42501', message = 'capability_management_forbidden';
  end if;
  
  -- Prevent changes for primary administrators
  if public.is_primary_administrator(p_user_id) then
    raise exception using errcode = '42501', message = 'primary_admin_immutable';
  end if;
  
  if not exists(select 1 from public.staff_profiles where user_id = p_user_id) then
    raise exception 'staff_profile_required';
  end if;
  
  if not exists(select 1 from public.capabilities where key = p_capability) then
    raise exception 'invalid_capability';
  end if;
  
  if p_granted then
    insert into public.staff_capability_grants(user_id, capability, granted_by)
    values(p_user_id, p_capability, auth.uid())
    on conflict do nothing;
  else
    update public.staff_capability_grants
    set revoked_at = now()
    where user_id = p_user_id and capability = p_capability and revoked_at is null;
  end if;
  
  perform public.audit_event(
    'staff',
    'staff.capability_grant',
    'staff_capability',
    p_user_id,
    'success',
    jsonb_build_object('capability', p_capability, 'granted', p_granted)
  );
end;
$$;

revoke all on function public.staff_capability_grant(uuid, text, boolean) from public, anon;
grant execute on function public.staff_capability_grant(uuid, text, boolean) to authenticated;

-- Update staff_role_save to prevent creating roles that grant staff.roles.manage
-- (already enforced by the check constraint in staff_role_capabilities)

-- Create a view to show which users are primary administrators
create or replace view public.primary_administrators as
select u.id, u.email, u.email_confirmed_at, p.is_active, p.created_at
from auth.users u
join public.staff_profiles p on p.user_id = u.id
where lower(u.email) in ('info.epelawa@gmail.com', 'admin.epelawa@gmail.com')
and u.email_confirmed_at is not null;

revoke all on public.primary_administrators from public, anon, authenticated;
grant select on public.primary_administrators to authenticated;

-- Reconciled with Production (2026-11-26): Postgres cannot attach a row-level policy to a view, so the
-- former `create policy primary_administrators_read on public.primary_administrators` statement could
-- never apply and is absent from the Production catalog. Access is governed by the grants above.

-- Audit: Log any attempt to modify primary administrators
create or replace function public.log_primary_admin_violation(
  p_action text,
  p_target_user_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_primary_administrator(p_target_user_id) then
    perform public.audit_event(
      'security',
      'primary_admin_violation',
      'primary_administrator',
      p_target_user_id,
      'warning',
      jsonb_build_object(
        'action', p_action,
        'actor_id', p_actor_id,
        'message', 'Attempt to modify primary administrator'
      )
    );
  end if;
end;
$$;

grant execute on function public.log_primary_admin_violation(text, uuid, uuid) to authenticated;

-- Add comment to document the immutability
comment on function public.is_primary_administrator(uuid) is
  'Checks if a user is a primary administrator (info.epelawa@gmail.com or admin.epelawa@gmail.com). Primary administrators have immutable access.';

comment on function public.staff_role_assign(uuid, uuid, boolean) is
  'Assigns or removes a role from a user. Primary administrators cannot have their roles modified.';

comment on function public.staff_user_set_active(uuid, boolean) is
  'Activates or deactivates a staff profile. Primary administrators cannot be deactivated.';
