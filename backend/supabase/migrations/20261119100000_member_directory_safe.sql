-- Read-only member directory, separated from the unreviewed message/deletion candidate.
create or replace function public.admin_member_list(p_search text default '', p_offset integer default 0)
returns table(user_id uuid, email text, handle text, display_name text, created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.staff_roles_authorized() or not exists(select 1 from public.staff_profiles sp where sp.user_id=auth.uid() and sp.is_active and not sp.must_change_password) then raise exception using errcode='42501',message='forbidden'; end if;
 return query select p.user_id,u.email::text,p.handle::text,p.display_name,p.created_at
 from public.profiles p join auth.users u on u.id=p.user_id
 where p.deleted_at is null and not exists(select 1 from public.staff_profiles s where s.user_id=p.user_id)
 and (coalesce(trim(p_search),'')='' or p.handle::text ilike '%'||left(trim(p_search),100)||'%' or u.email ilike '%'||left(trim(p_search),100)||'%')
 order by p.created_at desc,p.user_id limit 50 offset least(greatest(coalesce(p_offset,0),0),100000);
end; $$;
revoke all on function public.admin_member_list(text,integer) from public,anon,authenticated;
grant execute on function public.admin_member_list(text,integer) to authenticated;
