-- Keep the existing creation RPC available for clients that do not send tags.
-- Only the draft created inside this transaction can receive tags via this RPC.
create function public.article_create_with_hashtags(
  p_title text, p_summary text, p_body jsonb, p_author_id uuid, p_category_id uuid,
  p_seo_title text, p_seo_description text, p_cover_url text, p_cover_alt text,
  p_cover_credit text, p_cover_source_url text, p_cover_license_url text, p_cover_caption text,
  p_tags text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_article_id uuid;
  v_version_id uuid;
  v_count integer;
begin
  perform public.require_capability('article.create');
  if p_tags is null or cardinality(p_tags) > 12
    or exists (select 1 from unnest(p_tags) as entry(tag)
      where tag is null or char_length(btrim(tag)) not between 2 and 40
        or public.slugify(btrim(tag)) is null) then
    raise exception using errcode = '22023', message = 'tags_payload_invalid';
  end if;

  v_article_id := public.article_create_with_cover(
    p_title, p_summary, p_body, p_author_id, p_category_id, p_seo_title,
    p_seo_description, p_cover_url, p_cover_alt, p_cover_credit,
    p_cover_source_url, p_cover_license_url, p_cover_caption
  );
  select current_version_id into strict v_version_id from public.articles where id = v_article_id;

  with labels as (
    select distinct on (public.slugify(btrim(tag)))
      btrim(tag) as label, public.slugify(btrim(tag)) as slug
    from unnest(p_tags) with ordinality as entry(tag, position)
    order by public.slugify(btrim(tag)), position
  ), saved as (
    insert into public.tags (label, slug)
    select label, slug from labels order by slug
    on conflict (slug) do update set label = tags.label
    returning id
  )
  insert into public.article_version_tags (version_id, tag_id)
  select v_version_id, id from saved;
  get diagnostics v_count = row_count;
  if v_count > 0 then
    perform public.audit_event('staff', 'article.tags', 'article', v_article_id, 'success',
      jsonb_build_object('tags', v_count));
  end if;
  return v_article_id;
end;
$$;

revoke all on function public.article_create_with_hashtags(text,text,jsonb,uuid,uuid,text,text,text,text,text,text,text,text,text[]) from public, anon;
grant execute on function public.article_create_with_hashtags(text,text,jsonb,uuid,uuid,text,text,text,text,text,text,text,text,text[]) to authenticated;
