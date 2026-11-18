-- Private enquiry access is through audited RPCs only. No direct table grant.
alter table public.private_enquiries add column if not exists status text not null default 'open' check (status in ('open', 'resolved'));
alter table public.private_enquiries add column if not exists revision bigint not null default 1;
create or replace function public.staff_enquiry_list()
returns table(id uuid, kind text, sender_name text, sender_email text, message text, created_at timestamptz, status text, revision bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(public.staff_roles_authorized(), false) then raise exception using errcode='42501', message='enquiry_forbidden'; end if;
  perform public.audit_event('staff','enquiry.list','private_enquiry',null,'success','{}'::jsonb);
  return query select p.id,p.kind,p.sender_name,p.sender_email,p.message,p.created_at,p.status,p.revision from public.private_enquiries p where p.status = 'open' order by p.created_at asc limit 100;
end; $$;
create or replace function public.staff_enquiry_resolve(p_id uuid, p_expected_revision bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare updated uuid;
begin
  if not coalesce(public.staff_roles_authorized(), false) then raise exception using errcode='42501', message='enquiry_forbidden'; end if;
  update public.private_enquiries set status='resolved', revision=revision+1 where id=p_id and revision=p_expected_revision and status='open' returning id into updated;
  if updated is null then raise exception using errcode='40001', message='enquiry_conflict'; end if;
  perform public.audit_event('staff','enquiry.resolve','private_enquiry',updated,'success','{}'::jsonb);
end; $$;
revoke all on function public.staff_enquiry_list() from public, anon, authenticated;
revoke all on function public.staff_enquiry_resolve(uuid,bigint) from public, anon, authenticated;
grant execute on function public.staff_enquiry_list() to authenticated;
grant execute on function public.staff_enquiry_resolve(uuid,bigint) to authenticated;
