-- Private enquiry access is through audited RPCs only. No direct table grant.
-- This project does not have staff_roles_authorized() in production. Keep this
-- narrower check independent of the unfinished role-management migrations.
create or replace function public.staff_enquiry_authorized() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users u join public.staff_profiles p on p.user_id=u.id
    where u.id=auth.uid() and lower(u.email)='info.epelawa@gmail.com'
      and u.email_confirmed_at is not null and p.is_active and not p.must_change_password);
$$;
revoke all on function public.staff_enquiry_authorized() from public, anon, authenticated;

alter table public.private_enquiries add column if not exists status text not null default 'open' check (status in ('open', 'resolved'));
alter table public.private_enquiries add column if not exists revision bigint not null default 1;
create or replace function public.staff_enquiry_list()
returns table(id uuid, kind text, sender_name text, sender_email text, message text, created_at timestamptz, status text, revision bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(public.staff_enquiry_authorized(), false) then raise exception using errcode='42501', message='enquiry_forbidden'; end if;
  perform public.audit_event('staff','enquiry.list','private_enquiry',null,'success','{}'::jsonb);
  return query select p.id,p.kind,p.sender_name,p.sender_email,p.message,p.created_at,p.status,p.revision from public.private_enquiries p where p.status = 'open' order by p.created_at asc limit 100;
end; $$;
create or replace function public.staff_enquiry_resolve(p_id uuid, p_expected_revision bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare updated uuid;
begin
  if not coalesce(public.staff_enquiry_authorized(), false) then raise exception using errcode='42501', message='enquiry_forbidden'; end if;
  update public.private_enquiries set status='resolved', revision=revision+1 where id=p_id and revision=p_expected_revision and status='open' returning id into updated;
  if updated is null then raise exception using errcode='40001', message='enquiry_conflict'; end if;
  perform public.audit_event('staff','enquiry.resolve','private_enquiry',updated,'success','{}'::jsonb);
end; $$;
revoke all on function public.staff_enquiry_list() from public, anon, authenticated;
revoke all on function public.staff_enquiry_resolve(uuid,bigint) from public, anon, authenticated;
grant execute on function public.staff_enquiry_list() to authenticated;
grant execute on function public.staff_enquiry_resolve(uuid,bigint) to authenticated;
