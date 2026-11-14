-- Admin user management RPCs. Actor identity is always derived from auth.uid().
-- Remove the earlier authenticated no-argument overload before installing the service-only form.
drop function if exists public.staff_user_clear_password_change();
create or replace function public.staff_user_set_grants(p_user_id uuid, p_capabilities text[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_email text; v_target_email text; v_cap text; v_caps text[] := coalesce(p_capabilities, '{}'::text[]);
begin
  select lower(u.email) into v_email from auth.users u where u.id=v_actor and u.email_confirmed_at is not null;
  if v_email is distinct from 'info.epelawa@gmail.com' or not public.current_staff_is_active() or not public.has_capability('staff.manage') then raise exception using errcode='42501', message='staff_management_forbidden'; end if;
  select lower(u.email) into v_target_email from auth.users u where u.id=p_user_id;
  if v_target_email is null then raise exception using errcode='P0002', message='user_not_found'; end if;
  if exists(select 1 from unnest(v_caps) c where not exists(select 1 from public.capabilities k where k.key=c)) then raise exception using errcode='22023', message='unknown_capability'; end if;
  if v_target_email='info.epelawa@gmail.com' and (not ('admin.access'=any(v_caps)) or not ('staff.manage'=any(v_caps))) then raise exception using errcode='42501', message='primary_admin_protected'; end if;
  if v_target_email<>'info.epelawa@gmail.com' and ('admin.access'=any(v_caps) or 'staff.manage'=any(v_caps)) then raise exception using errcode='42501', message='privileged_grant_forbidden'; end if;
  if v_target_email='legateakanjimusab@gmail.com' and (cardinality(v_caps)<>1 or v_caps[1]<>'article.create') then raise exception using errcode='42501', message='restricted_user'; end if;
  update public.staff_capability_grants set revoked_at=now() where user_id=p_user_id and revoked_at is null and not (capability=any(v_caps));
  foreach v_cap in array v_caps loop
    insert into public.staff_capability_grants(user_id,capability,granted_at,granted_by,revoked_at) values(p_user_id,v_cap,now(),v_actor,null)
    on conflict(user_id,capability) do update set granted_at=excluded.granted_at, granted_by=excluded.granted_by, revoked_at=null;
  end loop;
  perform public.audit_event('staff','staff.grants_change','staff_user',p_user_id,'success',jsonb_build_object('capabilities',to_jsonb(v_caps)));
end; $$;
create or replace function public.staff_user_set_active(p_user_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_email text; v_target_email text;
begin
  select lower(u.email) into v_email from auth.users u where u.id=v_actor and u.email_confirmed_at is not null;
  if v_email is distinct from 'info.epelawa@gmail.com' or not public.current_staff_is_active() or not public.has_capability('staff.manage') then raise exception using errcode='42501', message='staff_management_forbidden'; end if;
  select lower(u.email) into v_target_email from auth.users u where u.id=p_user_id;
  if v_target_email is null then raise exception using errcode='P0002', message='user_not_found'; end if;
  if v_target_email='info.epelawa@gmail.com' and not p_active then raise exception using errcode='42501', message='primary_admin_protected'; end if;
  if not exists(select 1 from public.staff_profiles where user_id=p_user_id) then raise exception using errcode='22023', message='staff_profile_required'; end if;
  update public.staff_profiles set is_active=p_active where user_id=p_user_id;
  perform public.audit_event('staff',case when p_active then 'staff.user_restore' else 'staff.user_deactivate' end,'staff_user',p_user_id,'success','{}'::jsonb);
end; $$;
create or replace function public.staff_user_clear_password_change(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception using errcode='42501', message='service_role_required'; end if;
  update public.staff_profiles set must_change_password=false where user_id=p_user_id and is_active;
  if not found then raise exception using errcode='42501', message='active_staff_required'; end if;
end; $$;
revoke all on function public.staff_user_set_grants(uuid,text[]) from public,anon;
revoke all on function public.staff_user_set_active(uuid,boolean) from public,anon;
revoke all on function public.staff_user_clear_password_change(uuid) from public,anon,authenticated;
grant execute on function public.staff_user_set_grants(uuid,text[]) to authenticated;
grant execute on function public.staff_user_set_active(uuid,boolean) to authenticated;
grant execute on function public.staff_user_clear_password_change(uuid) to service_role;
