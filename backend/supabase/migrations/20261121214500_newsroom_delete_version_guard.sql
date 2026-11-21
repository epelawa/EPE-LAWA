-- Newsroom article deletion was rolled back by the article_versions_guard
-- trigger, which rejects every DELETE on article_versions. The permanent
-- record stays protected for everyone except the sanctioned delete path:
-- newsroom_article_delete announces itself with a transaction-local setting
-- and the guard lets exactly that context through. Clients cannot forge this
-- on a staff database because the DELETE grant on article_versions is staff
-- only and the RPC enforces article.publish.

begin;

create or replace function public.guard_article_version() returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if tg_op = 'DELETE' and current_setting('app.newsroom_article_delete', true) = 'on' then
    return old;
  end if;

  if tg_op = 'DELETE' then
    raise exception using
      errcode = '42501',
      message = 'article_version_immutable',
      detail = 'Article versions are a permanent record. Unpublish the article, or use the newsroom delete action which removes the whole article at once.';
  end if;

  if new.article_id <> old.article_id
     or new.version_number <> old.version_number
     or new.created_by <> old.created_by
     or new.created_at <> old.created_at then
    raise exception using
      errcode = '42501',
      message = 'article_version_immutable',
      detail = 'A version cannot be moved to another article, renumbered, or reattributed.';
  end if;

  if old.state in ('approved', 'published') and (
       new.title is distinct from old.title
    or new.summary is distinct from old.summary
    or new.body is distinct from old.body
    or new.author_id is distinct from old.author_id
    or new.category_id is distinct from old.category_id
    or new.seo_title is distinct from old.seo_title
    or new.seo_description is distinct from old.seo_description
  ) then
    raise exception using
      errcode = '42501',
      message = case when old.state = 'published'
        then 'published_version_immutable'
        else 'approved_version_immutable'
      end,
      detail = 'Create a new version for a correction. Published and approved snapshots cannot be edited in place.';
  end if;

  if old.state <> new.state and not (
       (old.state = 'draft' and new.state in ('review', 'approved', 'published'))
    or (old.state = 'review' and new.state in ('draft', 'approved', 'rejected', 'published'))
    or (old.state = 'approved' and new.state = 'published')
  ) then
    raise exception using
      errcode = '42501',
      message = 'invalid_version_transition',
      detail = format('Cannot move an article version from %s to %s.', old.state, new.state);
  end if;

  return new;
end;
$$;

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
  perform set_config('app.newsroom_article_delete', 'on', true);
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
revoke all on function public.guard_article_version() from public, anon, authenticated;
grant execute on function public.guard_article_version() to anon, authenticated;

commit;
