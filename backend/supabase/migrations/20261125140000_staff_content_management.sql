-- Staff content management for the business directory, the community forum and
-- article comments. Everything here runs through the staff client: capability-gated
-- (business.review / moderation.review), audited, and unreachable without an
-- authenticated staff session.
--
-- Forum and comment removal stays soft, matching the convention both tables were
-- built on: a tombstone keeps replies readable, and a staff delete blanks the body
-- so "deleted" means the words are gone. Business delete is a genuine purge because
-- listings carry no conversation history; every dependent row is removed first.

begin;

------------------------------------------------------------------------------
-- Business: staff update
------------------------------------------------------------------------------

create or replace function public.business_staff_update(
  p_business_id uuid,
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
  p_logo_key    text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
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

  update public.businesses b set
    name        = btrim(p_name),
    category_id = p_category_id,
    description = nullif(btrim(coalesce(p_description, '')), ''),
    area        = nullif(btrim(coalesce(p_area, '')), ''),
    address     = nullif(btrim(coalesce(p_address, '')), ''),
    landmark    = nullif(btrim(coalesce(p_landmark, '')), ''),
    phone       = nullif(btrim(coalesce(p_phone, '')), ''),
    whatsapp    = nullif(btrim(coalesce(p_whatsapp, '')), ''),
    email       = nullif(btrim(coalesce(p_email, '')), ''),
    website     = nullif(btrim(coalesce(p_website, '')), ''),
    hours       = p_hours,
    logo_key    = coalesce(p_logo_key, b.logo_key),
    updated_at  = now()
  where b.id = p_business_id and b.deleted_at is null;

  if not found then
    raise exception using errcode = 'P0002', message = 'business_not_found';
  end if;

  perform public.audit_event('staff', 'business.staff_update', 'business', p_business_id, 'success',
    jsonb_build_object('name', btrim(p_name), 'category_id', p_category_id));
end;
$$;

revoke all on function public.business_staff_update(uuid, text, uuid, text, text, text, text, text, text, text, text, jsonb, text) from public, anon;
grant execute on function public.business_staff_update(uuid, text, uuid, text, text, text, text, text, text, text, text, jsonb, text) to authenticated;

------------------------------------------------------------------------------
-- Business: staff hard delete (purges dependents first)
------------------------------------------------------------------------------

create or replace function public.business_staff_delete(
  p_business_id uuid,
  p_reason      text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_name  text;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  perform public.require_capability('business.review');

  if p_reason is null or char_length(btrim(p_reason)) < 5 or char_length(btrim(p_reason)) > 1000 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;

  select b.name into v_name from public.businesses b where b.id = p_business_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'business_not_found';
  end if;

  delete from public.order_items oi using public.products p
    where oi.product_id = p.id and p.business_id = p_business_id;
  delete from public.products p where p.business_id = p_business_id;
  delete from public.business_contact_clicks c where c.business_id = p_business_id;
  delete from public.business_claims c where c.business_id = p_business_id;
  delete from public.business_ad_slots s where s.business_id = p_business_id;
  delete from public.business_featured f where f.business_id = p_business_id;
  delete from public.business_reviews r where r.business_id = p_business_id;
  delete from public.business_verifications v where v.business_id = p_business_id;
  delete from public.business_photos ph where ph.business_id = p_business_id;
  delete from public.businesses b where b.id = p_business_id;

  perform public.audit_event('staff', 'business.staff_delete', 'business', p_business_id, 'success',
    jsonb_build_object('name', v_name, 'reason', btrim(p_reason)));
end;
$$;

revoke all on function public.business_staff_delete(uuid, text) from public, anon;
grant execute on function public.business_staff_delete(uuid, text) to authenticated;

------------------------------------------------------------------------------
-- Forum: staff delete a post (soft tombstone, body blanked)
------------------------------------------------------------------------------

create or replace function public.forum_staff_post_delete(
  p_post_id uuid,
  p_reason  text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  perform public.require_capability('moderation.review');

  if p_reason is null or char_length(btrim(p_reason)) < 5 or char_length(btrim(p_reason)) > 1000 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;

  update public.forum_posts p set
    body = '',
    state = 'deleted',
    hidden_reason = btrim(p_reason),
    hidden_by = v_actor,
    hidden_at = now(),
    deleted_at = now(),
    updated_at = now()
  where p.id = p_post_id and p.state <> 'deleted';

  if not found then
    raise exception using errcode = 'P0002', message = 'post_not_found';
  end if;

  update public.forum_reports r set
    state = 'actioned', resolved_by = v_actor, resolved_at = now()
  where r.post_id = p_post_id and r.state = 'open';

  perform public.audit_event('staff', 'forum.staff_post_delete', 'forum_post', p_post_id, 'success',
    jsonb_build_object('reason', btrim(p_reason)));
end;
$$;

revoke all on function public.forum_staff_post_delete(uuid, text) from public, anon;
grant execute on function public.forum_staff_post_delete(uuid, text) to authenticated;

------------------------------------------------------------------------------
-- Forum: staff restore a deleted post
------------------------------------------------------------------------------

create or replace function public.forum_staff_post_restore(
  p_post_id uuid,
  p_reason  text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_body  text;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  perform public.require_capability('moderation.review');

  if p_reason is null or char_length(btrim(p_reason)) < 5 or char_length(btrim(p_reason)) > 1000 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;

  select p.body into v_body from public.forum_posts p where p.id = p_post_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'post_not_found';
  end if;
  if char_length(coalesce(btrim(v_body), '')) = 0 then
    raise exception using errcode = '22023', message = 'body_unrecoverable';
  end if;

  update public.forum_posts p set
    state = 'visible',
    hidden_reason = null,
    hidden_by = null,
    hidden_at = null,
    deleted_at = null,
    updated_at = now()
  where p.id = p_post_id and p.state <> 'visible';

  perform public.audit_event('staff', 'forum.staff_post_restore', 'forum_post', p_post_id, 'success',
    jsonb_build_object('reason', btrim(p_reason)));
end;
$$;

revoke all on function public.forum_staff_post_restore(uuid, text) from public, anon;
grant execute on function public.forum_staff_post_restore(uuid, text) to authenticated;

------------------------------------------------------------------------------
-- Forum: staff delete a whole thread (tombstone + all posts)
------------------------------------------------------------------------------

create or replace function public.forum_staff_thread_delete(
  p_thread_id uuid,
  p_reason    text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  perform public.require_capability('moderation.review');

  if p_reason is null or char_length(btrim(p_reason)) < 5 or char_length(btrim(p_reason)) > 1000 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;

  update public.forum_posts p set
    body = '',
    state = 'deleted',
    hidden_reason = btrim(p_reason),
    hidden_by = v_actor,
    hidden_at = now(),
    deleted_at = now(),
    updated_at = now()
  where p.thread_id = p_thread_id and p.state <> 'deleted';

  update public.forum_threads t set
    state = 'deleted',
    deleted_at = now(),
    updated_at = now()
  where t.id = p_thread_id and t.state <> 'deleted';

  if not found then
    raise exception using errcode = 'P0002', message = 'thread_not_found';
  end if;

  update public.forum_reports r set
    state = 'actioned', resolved_by = v_actor, resolved_at = now()
  where r.state = 'open'
    and r.post_id in (select p.id from public.forum_posts p where p.thread_id = p_thread_id);

  perform public.audit_event('staff', 'forum.staff_thread_delete', 'forum_thread', p_thread_id, 'success',
    jsonb_build_object('reason', btrim(p_reason)));
end;
$$;

revoke all on function public.forum_staff_thread_delete(uuid, text) from public, anon;
grant execute on function public.forum_staff_thread_delete(uuid, text) to authenticated;

------------------------------------------------------------------------------
-- Comments: staff edit
------------------------------------------------------------------------------

create or replace function public.comment_staff_update(
  p_comment_id uuid,
  p_body       text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  perform public.require_capability('moderation.review');

  if p_body is null or char_length(btrim(p_body)) not between 1 and 4000 then
    raise exception using errcode = '22023', message = 'comment_body_invalid';
  end if;

  update public.comments c set
    body = btrim(p_body),
    updated_at = now()
  where c.id = p_comment_id and c.state <> 'deleted';

  if not found then
    raise exception using errcode = 'P0002', message = 'comment_not_found';
  end if;

  perform public.audit_event('staff', 'comment.staff_edit', 'comment', p_comment_id, 'success', '{}');
end;
$$;

revoke all on function public.comment_staff_update(uuid, text) from public, anon;
grant execute on function public.comment_staff_update(uuid, text) to authenticated;

------------------------------------------------------------------------------
-- Comments: staff delete (tombstone, body blanked)
------------------------------------------------------------------------------

create or replace function public.comment_staff_delete(
  p_comment_id uuid,
  p_reason     text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  perform public.require_capability('moderation.review');

  if p_reason is null or char_length(btrim(p_reason)) < 5 or char_length(btrim(p_reason)) > 1000 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;

  update public.comments c set
    body = '',
    state = 'deleted',
    hidden_reason = btrim(p_reason),
    hidden_by = v_actor,
    hidden_at = now(),
    deleted_at = now(),
    updated_at = now()
  where c.id = p_comment_id and c.state <> 'deleted';

  if not found then
    raise exception using errcode = 'P0002', message = 'comment_not_found';
  end if;

  update public.comment_reports r set
    state = 'actioned', resolved_by = v_actor, resolved_at = now()
  where r.comment_id = p_comment_id and r.state = 'open';

  perform public.audit_event('staff', 'comment.staff_delete', 'comment', p_comment_id, 'success',
    jsonb_build_object('reason', btrim(p_reason)));
end;
$$;

revoke all on function public.comment_staff_delete(uuid, text) from public, anon;
grant execute on function public.comment_staff_delete(uuid, text) to authenticated;

commit;
