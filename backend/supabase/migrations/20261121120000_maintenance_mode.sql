-- Forward-only candidate. Rehearse against the live schema before applying.
begin;
create table public.site_maintenance (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
insert into public.site_maintenance(singleton) values (true);
alter table public.site_maintenance enable row level security;
revoke all on public.site_maintenance from public, anon, authenticated;

-- Public gate exposes only a boolean and has no client-controlled bypass.
create function public.maintenance_status() returns boolean
language sql stable security definer set search_path = '' as $$
  select enabled from public.site_maintenance where singleton = true;
$$;
revoke all on function public.maintenance_status() from public, anon, authenticated;
grant execute on function public.maintenance_status() to anon, authenticated;

create function public.maintenance_admin_status() returns table(enabled boolean, revision bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
 if auth.uid() is null or not public.staff_roles_authorized() or not exists (
   select 1 from public.staff_profiles where user_id=auth.uid() and not must_change_password
 ) then raise exception using errcode='42501', message='maintenance_forbidden'; end if;
 return query select s.enabled, s.revision from public.site_maintenance s where s.singleton = true;
end; $$;
revoke all on function public.maintenance_admin_status() from public, anon, authenticated;
grant execute on function public.maintenance_admin_status() to authenticated;

create function public.maintenance_set(p_enabled boolean, p_revision bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_before boolean;
begin
 if auth.uid() is null or not public.staff_roles_authorized() or not exists (
   select 1 from public.staff_profiles where user_id=auth.uid() and not must_change_password
 ) then raise exception using errcode='42501', message='maintenance_forbidden'; end if;
 if p_enabled is null or p_revision is null then raise exception using errcode='22023', message='invalid_maintenance_state'; end if;
 select enabled into v_before from public.site_maintenance where singleton=true and revision=p_revision for update;
 if not found then raise exception using errcode='40001', message='stale_maintenance_state'; end if;
 update public.site_maintenance set enabled=p_enabled, revision=revision+1, updated_at=now() where singleton=true;
 perform public.audit_event('staff','site.maintenance_change','site_maintenance',null,'success',jsonb_build_object('before',v_before,'after',p_enabled));
end; $$;
revoke all on function public.maintenance_set(boolean,bigint) from public, anon, authenticated;
grant execute on function public.maintenance_set(boolean,bigint) to authenticated;
commit;
