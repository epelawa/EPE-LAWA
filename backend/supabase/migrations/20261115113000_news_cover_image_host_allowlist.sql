begin;

-- A cover is fetched automatically in each visitor's browser, so image URLs
-- are restricted to exact trusted providers. Clickable source/license pages
-- continue to use the broader safe-HTTPS check. Existing cover metadata is not
-- rewritten; this replaces only the validation helpers used by future writes.
create or replace function public.news_cover_image_url_is_allowed(p_url text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_authority text;
  v_host text;
begin
  if not public.news_cover_url_is_safe(p_url) then
    return false;
  end if;

  v_authority := (pg_catalog.regexp_match(p_url, '^https://([^/?#]+)'))[1];
  if v_authority is null or v_authority = '' then
    return false;
  end if;

  v_host := pg_catalog.regexp_replace(pg_catalog.lower(v_authority), ':443$', '');
  return v_host = any (array[
    'images.unsplash.com',
    'images.pexels.com',
    'cdn.pixabay.com',
    'upload.wikimedia.org'
  ]::text[]);
end;
$$;

create or replace function public.news_cover_metadata_is_valid(
  p_og_image_key text,
  p_cover_url text,
  p_cover_alt text,
  p_cover_credit text,
  p_cover_source_url text,
  p_cover_license_url text,
  p_cover_caption text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case when p_cover_url is null then
    p_cover_alt is null and p_cover_credit is null and p_cover_source_url is null
    and p_cover_license_url is null and p_cover_caption is null
  else
    p_og_image_key is null
    and public.news_cover_image_url_is_allowed(p_cover_url)
    and pg_catalog.char_length(pg_catalog.btrim(coalesce(p_cover_alt, ''))) between 1 and 500
    and pg_catalog.char_length(pg_catalog.btrim(coalesce(p_cover_credit, ''))) between 1 and 300
    and public.news_cover_url_is_safe(p_cover_source_url)
    and public.news_cover_url_is_safe(p_cover_license_url)
    and (p_cover_caption is null or pg_catalog.char_length(pg_catalog.btrim(p_cover_caption)) <= 500)
  end
$$;

revoke all on function public.news_cover_image_url_is_allowed(text) from public, anon, authenticated;
revoke all on function public.news_cover_metadata_is_valid(text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.news_cover_image_url_is_allowed(text) to service_role;
grant execute on function public.news_cover_metadata_is_valid(text,text,text,text,text,text,text) to service_role;

commit;
