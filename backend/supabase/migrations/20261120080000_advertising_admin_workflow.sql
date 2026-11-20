-- EPE LAWA — advertising operations: capability-gated, payment-linked placement management.
-- No payment is created or marked successful here. A verified provider payment must already exist.

insert into public.capabilities (key, description)
values ('advertising.manage', 'Create and manage payment-verified business sponsorship windows')
on conflict (key) do nothing;

drop function if exists public.business_featured_save(uuid, uuid, timestamptz, timestamptz);
create or replace function public.business_featured_save(
  p_business_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_payment_id uuid;
  v_amount bigint;
begin
  perform public.require_capability('advertising.manage');
  if p_business_id is null or p_starts_at is null or p_ends_at is null then
    raise exception using errcode = '22023', message = 'advertising_fields_required';
  end if;
  if p_ends_at <= p_starts_at or p_ends_at > p_starts_at + interval '366 days' then
    raise exception using errcode = '22023', message = 'invalid_advertising_window';
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.status = 'published' and b.deleted_at is null
  ) then
    raise exception using errcode = 'P0002', message = 'published_business_required';
  end if;
  select p.id, p.amount_kobo into v_payment_id, v_amount
  from public.payments p
  join public.order_items oi on oi.order_id = p.order_id and oi.business_id = p_business_id
  where p.status = 'succeeded' and p.verified_at is not null
  order by p.verified_at desc
  limit 1;
  if v_payment_id is null then
    raise exception using errcode = '42501', message = 'verified_business_payment_required';
  end if;
  insert into public.business_featured (business_id, starts_at, ends_at, payment_id)
  values (p_business_id, p_starts_at, p_ends_at, v_payment_id)
  returning id into v_id;
  perform public.audit_event('staff', 'advertising.placement_create', 'business_featured', v_id, 'success', jsonb_build_object('business_id', p_business_id, 'amount_kobo', v_amount, 'starts_at', p_starts_at, 'ends_at', p_ends_at));
  return v_id;
exception
  when exclusion_violation then
    raise exception using errcode = '23P01', message = 'business_already_has_overlapping_placement';
end;
$$;

create or replace function public.business_featured_end(p_placement_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business uuid;
  v_previous timestamptz;
begin
  perform public.require_capability('advertising.manage');
  select business_id, ends_at into v_business, v_previous from public.business_featured where id = p_placement_id for update;
  if v_business is null then raise exception using errcode = 'P0002', message = 'placement_not_found'; end if;
  if v_previous <= now() then raise exception using errcode = '22023', message = 'placement_already_ended'; end if;
  update public.business_featured set ends_at = now() where id = p_placement_id;
  perform public.audit_event('staff', 'advertising.placement_end', 'business_featured', p_placement_id, 'success', jsonb_build_object('business_id', v_business, 'previous_ends_at', v_previous));
end;
$$;

revoke all on function public.business_featured_save(uuid, timestamptz, timestamptz) from public;
revoke all on function public.business_featured_end(uuid) from public;
grant execute on function public.business_featured_save(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.business_featured_end(uuid) to authenticated;
