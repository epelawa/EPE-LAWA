-- Owner authority restore (settings button).
-- The primary administrators listed by staff_roles_authorized() can pull an
-- "Owner" role onto their own account from the settings desk. The role carries
-- the full canonical capability set, so a drifted or deleted assignment can
-- never block the owner's day-to-day work. Idempotent by design.
create or replace function public.staff_owner_authority_restore()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_capabilities text[] := array[
    'admin.access','advertising.manage','article.create','article.publish',
    'article.review','article.unpublish','audit.read','backup.create',
    'backup.read','business.review','moderation.review','order.manage',
    'people.manage','radio.manage','staff.manage'
  ];
  v_role uuid;
  v_added integer := 0;
begin
  if auth.uid() is null or not public.staff_roles_authorized() then
    raise exception using errcode = '42501', message = 'owner_restore_forbidden';
  end if;

  select id into v_role from public.staff_roles where name = 'Owner' limit 1;
  if v_role is null then
    insert into public.staff_roles(name, description, created_by)
    values ('Owner', 'Full authority; self-restored from settings.', auth.uid())
    returning id into v_role;
  end if;

  insert into public.staff_role_capabilities(role_id, capability)
  select v_role, c from unnest(v_capabilities) as c
  on conflict (role_id, capability) do nothing;
  get diagnostics v_added = row_count;

  if not exists (
    select 1 from public.staff_role_assignments a
    where a.user_id = auth.uid() and a.role_id = v_role
  ) then
    insert into public.staff_role_assignments(user_id, role_id, assigned_by)
    values (auth.uid(), v_role, auth.uid());
  end if;

  perform public.audit_event('staff','owner.authority.restore','staff_role',v_role,'success',
    jsonb_build_object('capabilities_added', v_added));

  return v_added;
end;
$function$;

revoke all on function public.staff_owner_authority_restore() from public, anon;
grant execute on function public.staff_owner_authority_restore() to authenticated;
