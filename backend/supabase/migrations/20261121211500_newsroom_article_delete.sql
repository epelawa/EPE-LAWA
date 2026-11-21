-- Newsroom article deletion: removes an article completely, including its
-- comments and versions, then records the deletion in the audit log.
--
-- Access: primary administrators (see 20261121210000) or any verified staff
-- holding the article.publish capability. article_views and saved_articles
-- rows disappear through their ON DELETE CASCADE rules; published_articles is
-- a view, so the public projection clears automatically.

create or replace function public.newsroom_article_delete(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if p_article_id is null then
    raise exception using errcode = '22003', message = 'article_not_found';
  end if;
  if not public.has_capability('article.publish') then
    raise exception using errcode = '42501', message = 'newsroom_article_delete_forbidden';
  end if;
  delete from public.comments where article_id = p_article_id;
  delete from public.article_versions where article_id = p_article_id;
  delete from public.articles where id = p_article_id;
  if not found then
    raise exception using errcode = '22003', message = 'article_not_found';
  end if;
  perform public.audit_event('staff', 'article.delete', 'article', p_article_id, 'success', '{}'::jsonb);
end;
$$;

revoke all on function public.newsroom_article_delete(uuid) from public, anon;
grant execute on function public.newsroom_article_delete(uuid) to authenticated;
