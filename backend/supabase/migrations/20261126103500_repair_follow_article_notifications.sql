-- The original follow trigger used an unsupported kind and omitted the required
-- body. That could roll back publication whenever a category had followers.
create or replace function public.notify_followers_article_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.published_at is null or old.published_at is not null then
    return new;
  end if;
  insert into public.notifications (user_id, kind, title, body, url, resource_type, resource_id)
  select f.user_id, 'news_published', left('New story: ' || v.title, 140),
    'A new story has been published in a topic you follow.',
    '/news/' || a.slug, 'article', a.id
  from public.articles a
  join public.article_versions v on v.id = a.published_version_id
  join public.topic_follows f on f.topic_type = 'news_category' and f.topic_id = v.category_id
  left join public.notification_preferences p on p.user_id = f.user_id
  where a.id = new.id and coalesce(p.in_app_news, true);
  return new;
end;
$$;
