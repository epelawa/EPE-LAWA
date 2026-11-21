-- Forward-only fix for the security defect recorded in
-- docs/reconciliation/2026-11-20-migration-reconciliation.md ("DO NOT APPLY as written"):
-- the original admin_member_delete wrote its 'success' audit event BEFORE deleting the
-- auth.users row, so a failed deletion was permanently logged as successful. The delete now
-- happens first and the audit event is only written after it actually removed the row.
-- Applied verbatim-except-the-reordering; authorised by the owner ("apply everything, nothing
-- left out") on 2026-11-21.

create or replace function public.admin_member_delete(p_user_id uuid,p_confirm_email text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.staff_roles_authorized() or not exists(select 1 from public.staff_profiles sp where sp.user_id=auth.uid() and sp.is_active and not sp.must_change_password) then raise exception using errcode='42501',message='forbidden'; end if;
 if p_user_id is null or p_user_id=auth.uid() or not exists(select 1 from public.profiles p join auth.users u on u.id=p.user_id where p.user_id=p_user_id and p.deleted_at is null and lower(u.email)=lower(trim(coalesce(p_confirm_email,''))) and not exists(select 1 from public.staff_profiles s where s.user_id=p.user_id)) then raise exception 'member_delete_forbidden'; end if;
 delete from auth.users where id=p_user_id;
 if not found then raise exception 'member_not_found'; end if;
 perform public.audit_event('staff','member.delete','member',p_user_id,'success','{}'::jsonb);
end; $$;

revoke all on function public.admin_member_delete(uuid,text) from public,anon;
grant execute on function public.admin_member_delete(uuid,text) to authenticated;
