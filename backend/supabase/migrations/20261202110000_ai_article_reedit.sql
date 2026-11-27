-- Re-editing stories the AI already published (owner, turn 25): the AI rewrites
-- each one under the current rules (no outlet names or branding, new cover
-- choice) as a new version of the same article. The original posting time is
-- kept, so re-edited stories do not jump to the top of the news list.

alter table public.ai_article_meta
  add column if not exists revised_at timestamptz,
  add column if not exists revise_note text check (revise_note is null or char_length(revise_note) <= 500);

create index if not exists ai_article_meta_unrevised_idx on public.ai_article_meta (created_at desc) where revised_at is null;

create or replace function public.ai_revise_article(
  p_article_id uuid, p_title text, p_summary text, p_body jsonb, p_category_id uuid,
  p_seo_title text, p_seo_description text,
  p_cover_url text, p_cover_alt text, p_cover_credit text, p_cover_source_url text, p_cover_license_url text, p_cover_caption text,
  p_tags text[], p_model text, p_publish boolean
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare v_author uuid; v_revision bigint; v_published_at timestamptz; v_slug text; v_was_published boolean;
begin
  perform public.ai_require_service_role();
  if not exists (select 1 from public.ai_article_meta m where m.article_id = p_article_id) then
    raise exception using errcode = '42501', message = 'not_an_ai_article';
  end if;
  select a.id into v_author from public.authors a where a.slug = 'epe-lawa-editorial-desk';
  if v_author is null then
    raise exception using errcode = '55000', message = 'editorial_desk_missing';
  end if;
  perform public.ai_impersonate();
  select a.revision, a.published_at, a.slug::text, a.published_version_id is not null
    into v_revision, v_published_at, v_slug, v_was_published
    from public.articles a where a.id = p_article_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'article_not_found';
  end if;
  perform public.article_revise_with_cover(
    p_article_id, v_revision, p_title, p_summary, p_body, v_author, p_category_id, p_seo_title, p_seo_description,
    p_cover_url, p_cover_alt, p_cover_credit, p_cover_source_url, p_cover_license_url, p_cover_caption
  );
  begin
    perform public.article_tags_save(p_article_id, coalesce(p_tags, array[]::text[]));
  exception when others then
    null; -- tags are optional; a missing capability must not lose the re-edit
  end;
  if coalesce(p_publish, false) then
    select a.revision into v_revision from public.articles a where a.id = p_article_id;
    perform public.article_publish(p_article_id, v_revision);
    -- Keep the original posting time so the news order does not change.
    if v_published_at is not null then
      update public.articles set published_at = v_published_at where id = p_article_id;
    end if;
  end if;
  update public.ai_article_meta
     set revised_at = now(), revise_note = case when coalesce(p_publish, false) then 'Re-edited and republished.' else 'Re-edit saved as a draft for an editor.' end,
         model = left(coalesce(p_model, model), 120)
   where article_id = p_article_id;
  return jsonb_build_object('id', p_article_id, 'slug', v_slug, 'published', coalesce(p_publish, false));
end $function$;

revoke all on function public.ai_revise_article(uuid, text, text, jsonb, uuid, text, text, text, text, text, text, text, text, text[], text, boolean) from public, anon, authenticated;
grant execute on function public.ai_revise_article(uuid, text, text, jsonb, uuid, text, text, text, text, text, text, text, text, text[], text, boolean) to service_role;
