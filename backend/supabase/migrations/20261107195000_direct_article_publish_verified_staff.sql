-- EPE LAWA — verified staff access and direct article publishing.
-- Owner-authorized workflow: an active, email-verified staff member with article.publish may
-- publish a draft directly; a second reviewer is not required. Every published version remains
-- immutable, and all transitions retain optimistic revision checks and audit events.

-------------------------------------------------------------------------------
-- Verified email is part of every staff capability decision, including RLS.
-------------------------------------------------------------------------------

create or replace function public.has_capability(p_capability text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_capability_grants g
    join public.staff_profiles p on p.user_id = g.user_id
    join auth.users u on u.id = g.user_id
    where g.user_id = auth.uid()
      and g.capability = p_capability
      and g.revoked_at is null
      and p.is_active
      and u.email_confirmed_at is not null
  );
$$;

-- A submitted but unpublished version can be reopened by its author and saved as a private draft.
-- It remains private, uses compare-and-swap revisions, and leaves a durable audit event.
create or replace function public.article_draft_update(
  p_article_id uuid,
  p_expected_revision bigint,
  p_title text,
  p_summary text,
  p_body jsonb,
  p_author_id uuid,
  p_category_id uuid,
  p_seo_title text,
  p_seo_description text,
  p_og_image_key text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_revision bigint;
  v_current uuid;
  v_state text;
begin
  perform public.require_capability('article.create');

  select a.owner_id, a.revision, a.current_version_id
    into v_owner, v_revision, v_current
  from public.articles a
  where a.id = p_article_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'article_not_found';
  end if;
  if v_owner <> v_actor and not public.has_capability('article.review') then
    raise exception using errcode = '42501', message = 'not_article_owner';
  end if;
  if v_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'revision_conflict',
      detail = format('Expected revision %s but article is at %s.', p_expected_revision, v_revision),
      hint = 'Reload the article before saving again.';
  end if;
  if p_body is null or jsonb_typeof(p_body) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_body';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'invalid_title';
  end if;
  if p_summary is not null and char_length(p_summary) > 1000 then
    raise exception using errcode = '22023', message = 'invalid_summary';
  end if;

  select v.state into v_state
  from public.article_versions v
  where v.id = v_current and v.article_id = p_article_id;
  if v_state not in ('draft', 'review') then
    raise exception using errcode = '42501', message = 'invalid_transition',
      detail = 'Only the current unpublished draft or review submission may be edited.';
  end if;

  update public.article_versions
  set title = btrim(p_title),
      summary = nullif(btrim(coalesce(p_summary, '')), ''),
      body = p_body,
      author_id = p_author_id,
      category_id = p_category_id,
      seo_title = nullif(btrim(coalesce(p_seo_title, '')), ''),
      seo_description = nullif(btrim(coalesce(p_seo_description, '')), ''),
      og_image_key = nullif(btrim(coalesce(p_og_image_key, '')), ''),
      state = 'draft'
  where id = v_current;

  update public.articles
  set revision = revision + 1
  where id = p_article_id
  returning revision into v_revision;

  perform public.audit_event(
    'staff', 'article.draft_update', 'article', p_article_id, 'success',
    jsonb_build_object('version_id', v_current, 'revision', v_revision, 'previous_state', v_state)
  );

  return v_revision;
end;
$$;

revoke all on function public.article_draft_update(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text)
  from public, anon;
grant execute on function public.article_draft_update(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text)
  to authenticated;

-------------------------------------------------------------------------------
-- A published snapshot is a permanent record; corrections always use a new version.
-------------------------------------------------------------------------------

alter table public.article_versions
  drop constraint if exists article_versions_state;

alter table public.article_versions
  add constraint article_versions_state
  check (state in ('draft', 'review', 'approved', 'rejected', 'published'));

create or replace function public.guard_article_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '42501',
      message = 'article_version_immutable',
      detail = 'Article versions are a permanent record. Unpublish the article instead of deleting history.';
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
    or new.og_image_key is distinct from old.og_image_key
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
       (old.state = 'draft' and new.state in ('review', 'published'))
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

-------------------------------------------------------------------------------
-- Direct publish: validated current draft/review/approved version -> immutable published snapshot.
-------------------------------------------------------------------------------

create or replace function public.article_publish(
  p_article_id        uuid,
  p_expected_revision bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision        bigint;
  v_current         uuid;
  v_published       uuid;
  v_state           text;
  v_was_breaking    boolean;
  v_publication_mode text;
begin
  perform public.require_capability('article.publish');

  select a.revision, a.current_version_id, a.published_version_id, a.is_breaking
    into v_revision, v_current, v_published, v_was_breaking
  from public.articles a
  where a.id = p_article_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'article_not_found';
  end if;

  if v_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'revision_conflict',
      detail = format('Expected revision %s but article is at %s.', p_expected_revision, v_revision);
  end if;

  if v_current is null then
    raise exception using errcode = '42501', message = 'no_current_version';
  end if;

  select v.state into v_state
  from public.article_versions v
  where v.id = v_current and v.article_id = p_article_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'no_current_version';
  end if;

  if v_state not in ('draft', 'review', 'approved', 'published') then
    raise exception using errcode = '42501', message = 'invalid_publish_state',
      detail = format('A version in state %s cannot be published. Create a new draft first.', v_state);
  end if;

  if v_published = v_current then
    raise exception using errcode = '23505', message = 'already_published',
      detail = 'This exact version is already the published version.';
  end if;

  v_publication_mode := case
    when v_state = 'approved' then 'previously_approved'
    when v_state = 'published' then 'republish'
    else 'direct'
  end;

  if v_state <> 'published' then
    update public.article_versions
    set state = 'published'
    where id = v_current;
  end if;

  update public.articles
  set published_version_id = v_current,
      published_at = now(),
      revision = revision + 1
  where id = p_article_id;

  perform public.audit_event('staff', 'article.publish', 'article', p_article_id, 'success',
    jsonb_build_object(
      'version_id', v_current,
      'previous_version_id', v_published,
      'is_correction', v_published is not null,
      'publication_mode', v_publication_mode,
      'breaking', v_was_breaking
    ));
end;
$$;

revoke all on function public.article_publish(uuid, bigint) from public;
grant execute on function public.article_publish(uuid, bigint) to authenticated;
