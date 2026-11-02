-- M6 — editorial transitions (security definer functions).
--
-- Every editorial transition goes through a security definer function so the
-- caller can never bypass capability checks, revision CAS, or audit logging.
-- Functions run with the service role's privileges but validate the caller's
-- capabilities explicitly before mutating anything.

-- Helper: assert the caller has a given active capability.
create or replace function public.require_capability(capability text)
returns void language plpgsql as $$
declare
  grant_count integer;
begin
  select count(*) into grant_count
  from public.staff_capability_grants g
  where g.user_id = (select auth.uid())
    and g.capability = capability
    and g.revoked_at is null
    and exists (
      select 1 from public.staff_profiles p
      where p.user_id = g.user_id
        and p.is_active = true
    );
  if grant_count = 0 then
    raise exception
      using message = 'capability_required',
            detail = format('Missing capability: %s', capability),
            hint = 'Ask an administrator to grant you this capability.';
  end if;
end;
$$;

-- Helper: write an audit event.
create or replace function public.audit_event(
  actor_kind text,
  action text,
  resource_type text,
  resource_id uuid,
  outcome text,
  metadata jsonb default '{}'::jsonb
) returns void language plpgsql as $$
declare
  actor_id uuid;
begin
  select auth.uid() into actor_id;
  insert into public.audit_events (actor_id, actor_kind, action, resource_type, resource_id, outcome, metadata)
  values (actor_id, actor_kind, action, resource_type, resource_id, outcome, metadata);
end;
$$;

-------------------------------------------------------------------------------
-- Article transitions
-------------------------------------------------------------------------------

-- Create a draft article. Returns the new article id and first version id.
create or replace function public.article_create(
  p_title text,
  p_summary text,
  p_body jsonb,
  p_author_id uuid,
  p_category_id uuid,
  p_seo_title text,
  p_seo_description text,
  p_og_image_key text
) returns uuid language plpgsql as $$
declare
  v_article_id uuid;
  v_version_id uuid;
begin
  call public.require_capability('article.create');

  insert into public.articles (slug, owner_id, revision, state)
  values (lower(replace(p_title, ' ', '-')), (select auth.uid()), 1, 'draft')
  returning id into v_article_id;

  insert into public.article_versions (
    article_id, version_number, title, summary, body,
    author_id, category_id, seo_title, seo_description, og_image_key,
    state, created_by
  ) values (
    v_article_id, 1, p_title, p_summary, p_body,
    p_author_id, p_category_id, p_seo_title, p_seo_description, p_og_image_key,
    'draft', (select auth.uid())
  ) returning id into v_version_id;

  update public.articles
  set current_version_id = v_version_id,
      updated_at = now()
  where id = v_article_id;

  call public.audit_event('staff', 'article.create', 'article', v_article_id, 'success',
    jsonb_build_object('title', p_title, 'category_id', p_category_id));

  return v_article_id;
end;
$$;

-- Submit a draft for review (draft → review). Requires article.create on the owner.
create or replace function public.article_submit(
  p_article_id uuid,
  p_expected_revision bigint
) returns void language plpgsql as $$
declare
  v_current_revision bigint;
  v_owner_id uuid;
  v_state text;
begin
  call public.require_capability('article.create');

  select revision, owner_id, state into v_current_revision, v_owner_id, v_state
  from public.articles
  where id = p_article_id
  for update;

  if v_current_revision <> p_expected_revision then
    raise exception
      using message = 'revision_conflict',
            detail = format('Expected revision %s but article is at revision %s', p_expected_revision, v_current_revision),
            hint = 'Reload the article and retry.';
  end if;

  if v_owner_id <> (select auth.uid()) then
    raise exception
      using message = 'not_article_owner',
            detail = 'Only the article owner can submit it for review.';
  end if;

  if v_state <> 'draft' then
    raise exception
      using message = 'invalid_transition',
            detail = format('Cannot submit an article in state %s for review.', v_state);
  end if;

  update public.article_versions
  set state = 'review'
  where id = (
    select id from public.article_versions
    where article_id = p_article_id and state = 'draft'
    order by version_number desc limit 1
  );

  update public.articles
  set revision = v_current_revision + 1,
      updated_at = now()
  where id = p_article_id;

  call public.audit_event('staff', 'article.submit', 'article', p_article_id, 'success');
end;
$$;

-- Editor reviews: approve (review → approved) or reject (review → rejected).
-- Requires article.review capability. Cannot approve your own submission.
create or replace function public.article_review(
  p_article_id uuid,
  p_action text,           -- 'approve' or 'reject'
  p_expected_revision bigint,
  p_revision_note text
) returns void language plpgsql as $$
declare
  v_current_revision bigint;
  v_version_state text;
  v_created_by uuid;
begin
  call public.require_capability('article.review');

  select a.revision, v.state, v.created_by
  into v_current_revision, v_version_state, v_created_by
  from public.articles a
  join public.article_versions v on v.id = a.current_version_id
  where a.id = p_article_id
  for update;

  if v_current_revision <> p_expected_revision then
    raise exception
      using message = 'revision_conflict',
            detail = format('Expected revision %s but article is at revision %s', p_expected_revision, v_current_revision),
            hint = 'Reload the article and retry.';
  end if;

  if v_created_by = (select auth.uid()) then
    raise exception
      using message = 'self_review_not_allowed',
            detail = 'An editor cannot approve or reject their own article.';
  end if;

  if v_version_state <> 'review' then
    raise exception
      using message = 'invalid_transition',
            detail = format('Article version is not in review state (current: %s).', v_version_state);
  end if;

  if p_action = 'approve' then
    update public.article_versions
    set state = 'approved'
    where id = (
      select id from public.article_versions
      where article_id = p_article_id and state = 'review'
      order by version_number desc limit 1
    );

    call public.audit_event('staff', 'article.approve', 'article', p_article_id, 'success',
      jsonb_build_object('note', p_revision_note));
  elsif p_action = 'reject' then
    update public.article_versions
    set state = 'rejected'
    where id = (
      select id from public.article_versions
      where article_id = p_article_id and state = 'review'
      order by version_number desc limit 1
    );

    call public.audit_event('staff', 'article.reject', 'article', p_article_id, 'success',
      jsonb_build_object('note', p_revision_note));
  else
    raise exception using message = 'invalid_action', detail = "Action must be 'approve' or 'reject'.";
  end if;

  update public.articles
  set revision = v_current_revision + 1,
      updated_at = now()
  where id = p_article_id;
end;
$$;

-- Publisher publishes an approved article (sets published_version_id).
-- Requires article.publish capability.
create or replace function public.article_publish(
  p_article_id uuid,
  p_expected_revision bigint
) returns void language plpgsql as $$
declare
  v_current_revision bigint;
  v_published_version_id uuid;
begin
  call public.require_capability('article.publish');

  select a.revision, a.published_version_id
  into v_current_revision, v_published_version_id
  from public.articles a
  where a.id = p_article_id
  for update;

  if v_current_revision <> p_expected_revision then
    raise exception
      using message = 'revision_conflict',
            detail = format('Expected revision %s but article is at revision %s', p_expected_revision, v_current_revision),
            hint = 'Reload the article and retry.';
  end if;

  if v_published_version_id is not null then
    raise exception using message = 'already_published', detail = 'Article is already published.';
  end if;

  select id into v_published_version_id
  from public.article_versions
  where article_id = p_article_id and state = 'approved'
  order by version_number desc
  limit 1;

  if v_published_version_id is null then
    raise exception using message = 'no_approved_version', detail = 'No approved version exists to publish.';
  end if;

  update public.articles
  set published_version_id = v_published_version_id,
      published_at = now(),
      revision = v_current_revision + 1,
      updated_at = now()
  where id = p_article_id;

  call public.audit_event('staff', 'article.publish', 'article', p_article_id, 'success');
end;
$$;

-- Publisher unpublishes an article.
-- Requires article.unpublish capability.
create or replace function public.article_unpublish(
  p_article_id uuid,
  p_expected_revision bigint
) returns void language plpgsql as $$
declare
  v_current_revision bigint;
begin
  call public.require_capability('article.unpublish');

  select a.revision into v_current_revision
  from public.articles a
  where a.id = p_article_id
  for update;

  if v_current_revision <> p_expected_revision then
    raise exception
      using message = 'revision_conflict',
            detail = format('Expected revision %s but article is at revision %s', p_expected_revision, v_current_revision),
            hint = 'Reload the article and retry.';
  end if;

  update public.articles
  set published_version_id = null,
      published_at = null,
      revision = v_current_revision + 1,
      updated_at = now()
  where id = p_article_id;

  call public.audit_event('staff', 'article.unpublish', 'article', p_article_id, 'success');
end;
$$;

-- Grant execute on all editorial functions to authenticated.
-- RLS policies on the underlying tables still apply; the function validates
-- capabilities explicitly before mutating.
grant execute on function public.article_create(text, text, jsonb, uuid, uuid, text, text, text) to authenticated;
grant execute on function public.article_submit(uuid, bigint) to authenticated;
grant execute on function public.article_review(uuid, text, bigint, text) to authenticated;
grant execute on function public.article_publish(uuid, bigint) to authenticated;
grant execute on function public.article_unpublish(uuid, bigint) to authenticated;
grant execute on function public.require_capability(text) to authenticated;
grant execute on function public.audit_event(text, text, text, uuid, text, jsonb) to authenticated;
