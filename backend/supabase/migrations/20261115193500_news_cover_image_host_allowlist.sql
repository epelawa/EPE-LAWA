begin;
-- Forward-only allowlist enforcement. Production application remains blocked
-- until live migration reconciliation and backup/restore proof are complete.
-- Keep the broad metadata CHECK unchanged: safe pre-existing non-allowlisted
-- covers must remain editable when their URL is retained or copied to a revision.
create or replace function public.news_cover_url_is_safe(p_url text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_authority text;
  v_host text;
begin
  if p_url is null
     or pg_catalog.char_length(p_url) not between 12 and 2048
     or p_url !~* '^https://'
     or p_url ~ '[[:space:]]'
     or pg_catalog.strpos(p_url, pg_catalog.chr(92)) > 0 then
    return false;
  end if;
  v_authority := (pg_catalog.regexp_match(p_url, '^https://([^/?#]+)', 'i'))[1];
  if v_authority is null or v_authority = '' or pg_catalog.strpos(v_authority, '@') > 0 then
    return false;
  end if;
  if v_authority ~ ':[0-9]+$' then
    if pg_catalog.regexp_replace(v_authority, '^.*:', '') <> '443' then
      return false;
    end if;
    v_host := pg_catalog.regexp_replace(v_authority, ':443$', '', 'i');
  else
    v_host := v_authority;
  end if;
  v_host := pg_catalog.lower(pg_catalog.regexp_replace(v_host, '[.]$', ''));
  if v_host !~ '^[a-z0-9.-]+$'
     or v_host !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
     or not (v_host ~ '[.][a-z]{2,63}$' or v_host ~ '[.]xn--[a-z0-9-]{4,59}$')
     or v_host ~ '(^|[.])(localhost|local|internal|lan|test|invalid|example)$'
     or v_host ~ '^[0-9.]+$' then
    return false;
  end if;
  return true;
end;
$$;

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
  v_authority := (pg_catalog.regexp_match(p_url, '^https://([^/?#]+)', 'i'))[1];
  if v_authority is null or v_authority = '' then
    return false;
  end if;
  v_host := pg_catalog.regexp_replace(v_authority, ':443$', '', 'i');
  v_host := pg_catalog.lower(pg_catalog.regexp_replace(v_host, '[.]$', ''));
  return v_host = any (array[
    'images.unsplash.com',
    'images.pexels.com',
    'cdn.pixabay.com',
    'upload.wikimedia.org'
  ]::text[]);
end;
$$;
revoke all on function public.news_cover_image_url_is_allowed(text) from public, anon, authenticated;
grant execute on function public.news_cover_image_url_is_allowed(text) to service_role;

create or replace function public.guard_news_cover_image_host()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cover_url is null or public.news_cover_image_url_is_allowed(new.cover_url) then
    return new;
  end if;

  -- Existing safe covers from hosts outside the allowlist can remain on their
  -- version and flow forward into new revisions, but cannot be newly introduced.
  if not public.news_cover_url_is_safe(new.cover_url) then
    raise exception using errcode = '22023', message = 'invalid_news_cover_image_host';
  end if;
  if tg_op = 'UPDATE' and old.cover_url is not distinct from new.cover_url then
    return new;
  end if;
  if exists (
    select 1
    from public.article_versions as prior_version
    where prior_version.article_id = new.article_id
      and prior_version.id is distinct from new.id
      and prior_version.cover_url = new.cover_url
  ) then
    return new;
  end if;
  raise exception using errcode = '22023', message = 'invalid_news_cover_image_host';
end;
$$;
revoke all on function public.guard_news_cover_image_host() from public, anon, authenticated;
drop trigger if exists article_versions_news_cover_host_guard on public.article_versions;
create trigger article_versions_news_cover_host_guard
  before insert or update of cover_url on public.article_versions
  for each row execute function public.guard_news_cover_image_host();

notify pgrst, 'reload schema';
commit;
