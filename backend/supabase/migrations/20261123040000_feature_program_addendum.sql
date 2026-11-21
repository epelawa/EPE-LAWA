-- EPE LAWA — feature program addendum: article tag authoring (forward-only).
--
-- published_articles already exposes tags for display; until now no RPC could
-- write article_version_tags. This lets newsroom staff attach tags to the
-- article's current version, creating tag rows as needed. Gated by
-- article.review and audited.

create or replace function public.article_tags_save(p_article_id uuid, p_tags text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version_id uuid;
  v_tag text;
  v_slug text;
  v_tag_id uuid;
  v_count integer := 0;
begin
  if not public.has_capability('article.review') then
    raise exception using errcode = '42501', message = 'tags_forbidden';
  end if;
  select a.current_version_id into v_version_id
    from public.articles a
    where a.id = p_article_id;
  if v_version_id is null then
    raise exception using errcode = '22023', message = 'tags_article_unknown';
  end if;
  if p_tags is null or array_length(p_tags, 1) > 12
    or exists (select 1 from unnest(p_tags) t where t is null or char_length(btrim(t)) not between 2 and 40) then
    raise exception using errcode = '22023', message = 'tags_payload_invalid';
  end if;

  delete from public.article_version_tags where version_id = v_version_id;
  foreach v_tag in array p_tags loop
    v_slug := public.slugify(btrim(v_tag));
    if v_slug is null then continue; end if;
    insert into public.tags (label, slug)
      values (btrim(v_tag), v_slug)
      on conflict (slug) do update set label = excluded.label
      returning id into v_tag_id;
    insert into public.article_version_tags (version_id, tag_id) values (v_version_id, v_tag_id);
    v_count := v_count + 1;
  end loop;

  perform public.audit_event('staff', 'article.tags', 'article', p_article_id, 'success',
    jsonb_build_object('tags', v_count));
  return v_count;
end;
$$;

grant execute on function public.article_tags_save(uuid, text[]) to authenticated;
