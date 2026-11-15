-- Additive newsroom reference-data administration. Uses only columns verified in
-- the live schema; notably categories have no timestamp columns in Production.
-- Reference rows are never deleted so article history and foreign keys survive.
create or replace function public.newsroom_category_save(
  p_id uuid,
  p_slug text,
  p_label text,
  p_description text,
  p_sort_order integer,
  p_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_slug text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_slug, '')));
  v_label text := pg_catalog.btrim(coalesce(p_label, ''));
  v_description text := nullif(pg_catalog.btrim(coalesce(p_description, '')), '');
begin
  perform public.require_capability('article.publish');
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or pg_catalog.char_length(v_label) not between 1 and 60
     or pg_catalog.char_length(coalesce(v_description, '')) > 500
     or p_sort_order is null
     or p_is_active is null then
    raise exception using errcode = '22023', message = 'invalid_category';
  end if;
  if p_id is null then
    insert into public.categories (id, slug, label, description, sort_order, is_active)
    values (v_id, v_slug, v_label, v_description, p_sort_order, p_is_active);
  else
    update public.categories
       set slug = v_slug, label = v_label, description = v_description,
           sort_order = p_sort_order, is_active = p_is_active
     where id = p_id;
    if not found then
      raise exception using errcode = 'P0002', message = 'category_not_found';
    end if;
  end if;
  perform public.audit_event(
    'staff', case when p_id is null then 'newsroom.category_create' else 'newsroom.category_update' end,
    'category', v_id, 'success',
    jsonb_build_object('is_active', p_is_active)
  );
  return v_id;
exception when unique_violation then
  raise exception using errcode = '23505', message = 'reference_slug_conflict';
end;
$$;

create or replace function public.newsroom_byline_save(
  p_id uuid,
  p_slug text,
  p_display_name text,
  p_bio text,
  p_photo_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_slug text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_slug, '')));
  v_display_name text := pg_catalog.btrim(coalesce(p_display_name, ''));
  v_bio text := nullif(pg_catalog.btrim(coalesce(p_bio, '')), '');
  v_photo_key text := nullif(pg_catalog.btrim(coalesce(p_photo_key, '')), '');
begin
  perform public.require_capability('article.publish');
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or pg_catalog.char_length(v_display_name) not between 1 and 120
     or pg_catalog.char_length(coalesce(v_bio, '')) > 2000
     or pg_catalog.char_length(coalesce(v_photo_key, '')) > 500 then
    raise exception using errcode = '22023', message = 'invalid_byline';
  end if;
  if p_id is null then
    insert into public.authors (id, display_name, slug, bio, photo_key)
    values (v_id, v_display_name, v_slug, v_bio, v_photo_key);
  else
    update public.authors
       set display_name = v_display_name, slug = v_slug, bio = v_bio, photo_key = v_photo_key
     where id = p_id;
    if not found then
      raise exception using errcode = 'P0002', message = 'byline_not_found';
    end if;
  end if;
  perform public.audit_event(
    'staff', case when p_id is null then 'newsroom.byline_create' else 'newsroom.byline_update' end,
    'author', v_id, 'success', '{}'::jsonb
  );
  return v_id;
exception when unique_violation then
  raise exception using errcode = '23505', message = 'reference_slug_conflict';
end;
$$;

revoke all on function public.newsroom_category_save(uuid, text, text, text, integer, boolean) from public, anon;
revoke all on function public.newsroom_byline_save(uuid, text, text, text, text) from public, anon;
grant execute on function public.newsroom_category_save(uuid, text, text, text, integer, boolean) to authenticated;
grant execute on function public.newsroom_byline_save(uuid, text, text, text, text) to authenticated;
