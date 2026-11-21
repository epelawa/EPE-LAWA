-- EPE LAWA — business discovery + review RPC reconcile (forward-only).
--
-- Production drift: the businesses tables were created from the reconciliation
-- candidate, but three of its functions never reached production —
-- business_review_allowed, business_review_decide (the staff publish/reject
-- action) and business_discovery_search (the public directory search). This
-- migration recreates them with exactly the reviewed definitions and ACLs.

create function public.business_review_allowed() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_capability('business.review') and exists(
    select 1 from public.staff_profiles sp
    where sp.user_id = auth.uid() and sp.is_active and not sp.must_change_password
  );
$$;
revoke all on function public.business_review_allowed() from public, anon, authenticated;
grant execute on function public.business_review_allowed() to authenticated;

create function public.business_review_decide(p_business_id uuid, p_status text, p_note text, p_evidence text)
returns void language plpgsql security definer set search_path = '' as $$
declare previous text;
begin
  perform public.require_capability('business.review');
  if not exists(select 1 from public.staff_profiles sp where sp.user_id = auth.uid() and sp.is_active and not sp.must_change_password)
  then raise exception using errcode = '42501', message = 'staff_password_change_required'; end if;
  if p_status not in ('reviewing','published','rejected') or p_status is null
     or length(btrim(coalesce(p_note,''))) not between 5 and 1000
     or (p_status = 'published' and length(btrim(coalesce(p_evidence,''))) not between 10 and 2000)
  then raise exception using errcode = '22023', message = 'invalid_decision'; end if;
  select status into previous from public.businesses where id = p_business_id and deleted_at is null for update;
  if previous is null or previous not in ('submitted','reviewing')
  then raise exception using errcode = '40001', message = 'business_review_conflict'; end if;
  if p_status = 'published' then
    insert into public.business_verifications(business_id, verified_by, note)
    values (p_business_id, auth.uid(), btrim(coalesce(p_evidence,'')));
  end if;
  update public.businesses
    set status = p_status, updated_at = now(),
        published_at = case when p_status = 'published' then now() else published_at end
    where id = p_business_id;
  perform public.audit_event('staff', 'business.review', 'business', p_business_id, 'success',
    jsonb_build_object('from', previous, 'to', p_status, 'note', btrim(coalesce(p_note,''))));
end $$;
revoke all on function public.business_review_decide(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.business_review_decide(uuid, text, text, text) to authenticated;

create function public.business_discovery_search(p_query text, p_area text, p_category text, p_offset integer)
returns setof public.published_businesses
language sql stable security invoker set search_path = '' as $$
  select p.* from public.published_businesses p
  where length(coalesce(p_query,'')) <= 100 and length(coalesce(p_area,'')) <= 100 and length(coalesce(p_category,'')) <= 100
    and (coalesce(p_query,'') = ''
      or strpos(lower(p.name), lower(btrim(p_query))) > 0
      or strpos(lower(coalesce(p.description,'')), lower(btrim(p_query))) > 0
      or strpos(lower(p.category_label), lower(btrim(p_query))) > 0)
    and (coalesce(p_area,'') = '' or strpos(lower(coalesce(p.area,'')), lower(btrim(p_area))) > 0)
    and (coalesce(p_category,'') = '' or p.category_slug = p_category)
  order by p.name, p.id
  limit 13 offset least(greatest(coalesce(p_offset, 0), 0), 11988);
$$;
revoke all on function public.business_discovery_search(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.business_discovery_search(text, text, text, integer) to anon, authenticated;
