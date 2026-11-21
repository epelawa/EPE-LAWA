-- Reconciliation: in-app member messaging and permanent member deletion RPCs.
--
-- The live schema kept admin_member_list from the later safe redefinition
-- (20261119100000_member_directory_safe.sql), so that function is deliberately NOT restated
-- here. Only the constraint update and the two missing RPCs from
-- 20261119020000_member_admin_messages.sql are applied, copied verbatim.

alter table public.notifications drop constraint if exists notifications_kind;
alter table public.notifications add constraint notifications_kind check (kind in ('comment_reply','forum_reply','news_published','radio_live','order_status','moderation','admin_message'));

create or replace function public.admin_member_message(p_user_id uuid,p_title text,p_body text)
returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if not public.staff_roles_authorized() or not exists(select 1 from public.staff_profiles sp where sp.user_id=auth.uid() and sp.is_active and not sp.must_change_password) then raise exception using errcode='42501',message='forbidden'; end if;
 if length(trim(coalesce(p_title,''))) not between 1 and 140 or length(trim(coalesce(p_body,''))) not between 1 and 1000 then raise exception 'invalid_message'; end if;
 if p_user_id is null then
   if (select count(*) from public.profiles p join auth.users u on u.id=p.user_id where p.deleted_at is null and u.email_confirmed_at is not null and not exists(select 1 from public.staff_profiles s where s.user_id=p.user_id)) > 10000 then raise exception 'broadcast_limit_exceeded'; end if;
 end if;
 insert into public.notifications(user_id,kind,title,body)
 select p.user_id,'admin_message',trim(p_title),trim(p_body) from public.profiles p join auth.users u on u.id=p.user_id
 where p.deleted_at is null and u.email_confirmed_at is not null and (p_user_id is null or p.user_id=p_user_id)
 and not exists(select 1 from public.staff_profiles s where s.user_id=p.user_id);
 get diagnostics n = row_count;
 if p_user_id is not null and n=0 then raise exception 'member_not_found'; end if;
 perform public.audit_event('staff',case when p_user_id is null then 'member.broadcast' else 'member.message' end,'member',p_user_id,'success',jsonb_build_object('recipient_count',n));
 return n;
end; $$;

create or replace function public.admin_member_delete(p_user_id uuid,p_confirm_email text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.staff_roles_authorized() or not exists(select 1 from public.staff_profiles sp where sp.user_id=auth.uid() and sp.is_active and not sp.must_change_password) then raise exception using errcode='42501',message='forbidden'; end if;
 if p_user_id is null or p_user_id=auth.uid() or not exists(select 1 from public.profiles p join auth.users u on u.id=p.user_id where p.user_id=p_user_id and p.deleted_at is null and lower(u.email)=lower(trim(coalesce(p_confirm_email,''))) and not exists(select 1 from public.staff_profiles s where s.user_id=p.user_id)) then raise exception 'member_delete_forbidden'; end if;
 perform public.audit_event('staff','member.delete','member',p_user_id,'success','{}'::jsonb);
 delete from auth.users where id=p_user_id;
 if not found then raise exception 'member_not_found'; end if;
end; $$;
revoke all on function public.admin_member_list(text,integer),public.admin_member_message(uuid,text,text),public.admin_member_delete(uuid,text) from public,anon;
grant execute on function public.admin_member_list(text,integer),public.admin_member_message(uuid,text,text),public.admin_member_delete(uuid,text) to authenticated;
