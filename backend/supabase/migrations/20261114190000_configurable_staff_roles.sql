-- Applied to production as remote migration 20261118081756 after owner approval.
-- No roles/accounts/assignments are seeded. Only verified active info.epelawa@gmail.com
-- can manage; roles cannot grant role-management authority.
begin;
create table if not exists public.staff_roles (id uuid primary key default gen_random_uuid(), name text not null unique check(char_length(trim(name)) between 1 and 80), description text not null default '' check(char_length(description)<=500), created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.staff_role_capabilities (role_id uuid not null references public.staff_roles(id) on delete cascade, capability text not null references public.capabilities(key) on delete restrict, created_at timestamptz not null default now(), primary key(role_id,capability), check(capability <> 'staff.roles.manage'));
create table if not exists public.staff_role_assignments (user_id uuid not null references public.staff_profiles(user_id) on delete cascade, role_id uuid not null references public.staff_roles(id) on delete cascade, assigned_by uuid references auth.users(id) on delete set null, assigned_at timestamptz not null default now(), primary key(user_id,role_id));
create index if not exists staff_role_assignments_role_idx on public.staff_role_assignments(role_id);
create index if not exists staff_role_assignments_assigned_by_idx on public.staff_role_assignments(assigned_by);
create index if not exists staff_role_capabilities_capability_idx on public.staff_role_capabilities(capability);
create index if not exists staff_roles_created_by_idx on public.staff_roles(created_by);
drop trigger if exists staff_roles_updated_at on public.staff_roles;
create trigger staff_roles_updated_at before update on public.staff_roles for each row execute function public.set_updated_at();
alter table public.staff_roles enable row level security; alter table public.staff_role_capabilities enable row level security; alter table public.staff_role_assignments enable row level security;
revoke all on public.staff_roles,public.staff_role_capabilities,public.staff_role_assignments from public,anon,authenticated;
grant select on public.staff_roles,public.staff_role_capabilities,public.staff_role_assignments to authenticated;
-- Define authorization before policies and RPCs refer to it.
create or replace function public.staff_roles_authorized() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from auth.users u join public.staff_profiles p on p.user_id=u.id where u.id=auth.uid() and lower(u.email)='info.epelawa@gmail.com' and u.email_confirmed_at is not null and p.is_active); $$;
revoke all on function public.staff_roles_authorized() from public,anon; grant execute on function public.staff_roles_authorized() to authenticated;
-- Retain original verified+active checks for direct grants; role grants are additive.
create or replace function public.has_capability(p_capability text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_capability_grants g join public.staff_profiles p on p.user_id=g.user_id join auth.users u on u.id=g.user_id where g.user_id=auth.uid() and g.capability=p_capability and g.revoked_at is null and p.is_active and u.email_confirmed_at is not null and (p_capability <> 'staff.roles.manage' or lower(u.email)='info.epelawa@gmail.com'))
 or (p_capability <> 'staff.roles.manage' and exists(select 1 from public.staff_role_assignments a join public.staff_profiles p on p.user_id=a.user_id join auth.users u on u.id=p.user_id join public.staff_role_capabilities rc on rc.role_id=a.role_id where a.user_id=auth.uid() and rc.capability=p_capability and p.is_active and u.email_confirmed_at is not null)); $$;
revoke all on function public.has_capability(text) from public; grant execute on function public.has_capability(text) to anon,authenticated;
drop policy if exists staff_roles_read on public.staff_roles;
create policy staff_roles_read on public.staff_roles for select to authenticated using(public.staff_roles_authorized());
drop policy if exists staff_role_capabilities_read on public.staff_role_capabilities;
create policy staff_role_capabilities_read on public.staff_role_capabilities for select to authenticated using(public.staff_roles_authorized());
drop policy if exists staff_role_assignments_read_manager on public.staff_role_assignments;
create policy staff_role_assignments_read_manager on public.staff_role_assignments for select to authenticated using(public.staff_roles_authorized());
create or replace function public.staff_role_staff_directory(p_search text default '',p_limit integer default 50) returns table(user_id uuid,email text,email_verified boolean,is_active boolean,role_ids uuid[]) language plpgsql stable security definer set search_path='' as $$ begin
 if auth.uid() is null or not public.staff_roles_authorized() then raise exception using errcode='42501',message='role_management_forbidden'; end if;
 return query select p.user_id,u.email,u.email_confirmed_at is not null,p.is_active,coalesce(array_agg(a.role_id) filter(where a.role_id is not null),'{}'::uuid[]) from public.staff_profiles p join auth.users u on u.id=p.user_id left join public.staff_role_assignments a on a.user_id=p.user_id where coalesce(p_search,'')='' or u.email ilike '%'||left(trim(p_search),100)||'%' group by p.user_id,u.email,u.email_confirmed_at,p.is_active order by lower(u.email) limit least(greatest(coalesce(p_limit,50),1),100);
end; $$;
revoke all on function public.staff_role_staff_directory(text,integer) from public,anon; grant execute on function public.staff_role_staff_directory(text,integer) to authenticated;
create or replace function public.staff_role_save(p_role_id uuid,p_name text,p_description text,p_capabilities text[]) returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid; v_actor uuid:=auth.uid(); v_name text:=trim(coalesce(p_name,'')); v_caps text[]; v_before jsonb; begin
 if v_actor is null or not public.staff_roles_authorized() then raise exception using errcode='42501',message='role_management_forbidden'; end if;
 if char_length(v_name) not between 1 and 80 or char_length(coalesce(p_description,''))>500 then raise exception 'invalid_role'; end if;
 if exists(select 1 from unnest(coalesce(p_capabilities,'{}')) c where c = 'staff.roles.manage') then raise exception 'privileged_capability_forbidden'; end if;
 select coalesce(array_agg(distinct c),'{}') into v_caps from unnest(coalesce(p_capabilities,'{}')) c join public.capabilities x on x.key=c;
 if cardinality(v_caps)<>cardinality(coalesce(p_capabilities,'{}')) then raise exception 'invalid_capability'; end if;
 if p_role_id is null then insert into public.staff_roles(name,description,created_by) values(v_name,coalesce(p_description,''),v_actor) returning id into v_id; else select jsonb_build_object('name',r.name,'capabilities',coalesce((select jsonb_agg(rc.capability order by rc.capability) from public.staff_role_capabilities rc where rc.role_id=r.id),'[]'::jsonb)) into v_before from public.staff_roles r where r.id=p_role_id; update public.staff_roles set name=v_name,description=coalesce(p_description,''),updated_at=now() where id=p_role_id returning id into v_id; if v_id is null then raise exception 'role_not_found'; end if; end if;
 delete from public.staff_role_capabilities where role_id=v_id; insert into public.staff_role_capabilities(role_id,capability) select v_id,unnest(v_caps); perform public.audit_event('staff','staff.role_save','staff_role',v_id,'success',jsonb_build_object('before',coalesce(v_before,'null'::jsonb),'after',jsonb_build_object('name',v_name,'capabilities',to_jsonb(v_caps)))); return v_id; end; $$;
create or replace function public.staff_role_delete(p_role_id uuid) returns void language plpgsql security definer set search_path='' as $$ begin if auth.uid() is null or not public.staff_roles_authorized() then raise exception using errcode='42501',message='role_management_forbidden'; end if; delete from public.staff_roles where id=p_role_id; if not found then raise exception 'role_not_found'; end if; perform public.audit_event('staff','staff.role_delete','staff_role',p_role_id,'success','{}'::jsonb); end; $$;
create or replace function public.staff_user_set_active(p_user_id uuid,p_active boolean) returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null or not public.staff_roles_authorized() then raise exception using errcode='42501',message='role_management_forbidden'; end if;
 if p_user_id=auth.uid() then raise exception 'self_activation_change_forbidden'; end if;
 update public.staff_profiles set is_active=p_active where user_id=p_user_id;
 if not found then raise exception 'staff_profile_required'; end if;
 perform public.audit_event('staff','staff.activation_change','staff_profile',p_user_id,'success',jsonb_build_object('active',p_active));
end; $$;
revoke all on function public.staff_user_set_active(uuid,boolean) from public,anon; grant execute on function public.staff_user_set_active(uuid,boolean) to authenticated;
create or replace function public.staff_role_assign(p_user_id uuid,p_role_id uuid,p_assigned boolean) returns void language plpgsql security definer set search_path='' as $$ begin if auth.uid() is null or not public.staff_roles_authorized() then raise exception using errcode='42501',message='role_management_forbidden'; end if; if p_user_id=auth.uid() then raise exception 'self_assignment_forbidden'; end if; if not exists(select 1 from public.staff_profiles where user_id=p_user_id) then raise exception 'staff_profile_required'; end if; if p_assigned then insert into public.staff_role_assignments(user_id,role_id,assigned_by) values(p_user_id,p_role_id,auth.uid()) on conflict do nothing; else delete from public.staff_role_assignments where user_id=p_user_id and role_id=p_role_id; end if; perform public.audit_event('staff','staff.role_assignment','staff_role',p_role_id,'success',jsonb_build_object('target_user_id',p_user_id,'before',not p_assigned,'after',p_assigned)); end; $$;
revoke all on function public.staff_role_save(uuid,text,text,text[]) from public,anon; revoke all on function public.staff_role_delete(uuid) from public,anon; revoke all on function public.staff_role_assign(uuid,uuid,boolean) from public,anon;
grant execute on function public.staff_role_save(uuid,text,text,text[]) to authenticated; grant execute on function public.staff_role_delete(uuid) to authenticated; grant execute on function public.staff_role_assign(uuid,uuid,boolean) to authenticated;
commit;
