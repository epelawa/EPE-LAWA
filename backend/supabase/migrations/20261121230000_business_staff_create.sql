-- Staff can add a business listing directly from the private workspace. This follows the
-- no-draft rule the owner set for the newsroom: what staff save is published immediately.
-- The path is guarded (business.review capability), audited, and cannot be reached by
-- clients: there is still no INSERT grant on businesses, and this RPC is granted to
-- authenticated staff only.
--
-- Verification stays what it is everywhere else: a row in business_verifications with a
-- recorded note drives the public "Verified" badge. Staff choose whether to verify at
-- creation time and must record the evidence note when they do.

begin;

create or replace function public.business_staff_create(
  p_name        text,
  p_category_id uuid,
  p_description text,
  p_area        text,
  p_address     text,
  p_landmark    text,
  p_phone       text,
  p_whatsapp    text,
  p_email       text,
  p_website     text,
  p_hours       jsonb,
  p_verify      boolean,
  p_evidence    text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id    uuid := gen_random_uuid();
  v_base  text;
  v_slug  text;
  v_n     integer := 1;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  perform public.require_capability('business.review');

  if p_name is null or char_length(btrim(p_name)) not between 2 and 160 then
    raise exception using errcode = '22023', message = 'business_name_invalid';
  end if;

  if not exists (select 1 from public.business_categories c where c.id = p_category_id and c.is_active) then
    raise exception using errcode = '23503', message = 'business_category_unavailable';
  end if;

  if p_hours is not null and jsonb_typeof(p_hours) <> 'object' then
    raise exception using errcode = '22023', message = 'business_hours_invalid';
  end if;

  if p_verify and (p_evidence is null or char_length(btrim(p_evidence)) not between 10 and 2000) then
    raise exception using errcode = '22023', message = 'verification_evidence_required';
  end if;

  v_base := coalesce(public.slugify(btrim(p_name)), 'business');
  v_slug := v_base;
  loop
    exit when not exists (select 1 from public.businesses b where b.slug = v_slug);
    v_n := v_n + 1;
    if v_n > 50 then
      v_slug := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
      exit;
    end if;
    v_slug := v_base || '-' || v_n::text;
  end loop;

  insert into public.businesses (
    slug, owner_user_id, name, category_id, description, area, address, landmark,
    phone, whatsapp, email, website, hours, status, published_at
  ) values (
    v_slug, null, btrim(p_name), p_category_id,
    nullif(btrim(coalesce(p_description, '')), ''),
    nullif(btrim(coalesce(p_area, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    nullif(btrim(coalesce(p_landmark, '')), ''),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_whatsapp, '')), ''),
    nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(p_website, '')), ''),
    p_hours,
    'published',
    now()
  ) returning id into v_id;

  if p_verify then
    insert into public.business_verifications (business_id, verified_by, note)
    values (v_id, v_actor, btrim(p_evidence));
  end if;

  perform public.audit_event('staff', 'business.staff_create', 'business', v_id, 'success',
    jsonb_build_object('name', btrim(p_name), 'category_id', p_category_id, 'verified', coalesce(p_verify, false)));

  return v_id;
end;
$$;

revoke all on function public.business_staff_create(text, uuid, text, text, text, text, text, text, text, text, jsonb, boolean, text) from public, anon;
grant execute on function public.business_staff_create(text, uuid, text, text, text, text, text, text, text, text, jsonb, boolean, text) to authenticated;

commit;
