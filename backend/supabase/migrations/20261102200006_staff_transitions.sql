-- EPE LAWA — M6: staff transition functions (articles and people).
--
-- Why every transition is a SECURITY DEFINER function and not a direct UPDATE grant:
--   1. The authority check needs to read tables the caller cannot see (grants, sources).
--   2. Every transition must write an audit row atomically with the change.
--   3. Optimistic concurrency (expected_revision) has to be enforced in the same statement that
--      performs the write, otherwise two editors both win.
--
-- Conventions:
--   * The actor is always auth.uid(). No function accepts an actor parameter.
--   * Every exception uses a machine-readable MESSAGE that the API maps to an error code,
--     with a DETAIL the developer can read in logs. Nothing here returns a stack trace.
--   * search_path is pinned to '' and every table is schema-qualified.

------------------------------------------------------------------------------
-- Article: create
------------------------------------------------------------------------------

create or replace function public.article_create(
  p_title           text,
  p_summary         text,
  p_body            jsonb,
  p_author_id       uuid,
  p_category_id     uuid,
  p_seo_title       text,
  p_seo_description text,
  p_og_image_key    text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor      uuid := auth.uid();
  v_article_id uuid := gen_random_uuid();
  v_version_id uuid := gen_random_uuid();
  v_slug       text;
begin
  perform public.require_capability('article.create');

  if p_body is null or jsonb_typeof(p_body) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_body',
      detail = 'body must be a Tiptap JSON object.';
  end if;

  v_slug := public.article_slug(p_title);

  insert into public.articles (id, slug, owner_id)
  values (v_article_id, v_slug, v_actor);

  insert into public.article_versions (
    id, article_id, version_number, title, summary, body,
    author_id, category_id, seo_title, seo_description, og_image_key, state, created_by
  ) values (
    v_version_id, v_article_id, 1, btrim(p_title), p_summary, p_body,
    p_author_id, p_category_id, p_seo_title, p_seo_description, p_og_image_key,
    'draft', v_actor
  );

  update public.articles
  set current_version_id = v_version_id
  where id = v_article_id;

  perform public.audit_event(
    'staff', 'article.create', 'article', v_article_id, 'success',
    jsonb_build_object('title', btrim(p_title), 'category_id', p_category_id, 'slug', v_slug)
  );

  return v_article_id;
end;
$$;

------------------------------------------------------------------------------
-- Article: revise (a correction is a new version, never an edit)
------------------------------------------------------------------------------

create or replace function public.article_revise(
  p_article_id      uuid,
  p_expected_revision bigint,
  p_title           text,
  p_summary         text,
  p_body            jsonb,
  p_author_id       uuid,
  p_category_id     uuid,
  p_seo_title       text,
  p_seo_description text,
  p_og_image_key    text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor        uuid := auth.uid();
  v_owner        uuid;
  v_revision     bigint;
  v_current      uuid;
  v_state        text;
  v_next_number  integer;
  v_new_version  uuid := gen_random_uuid();
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
    raise exception using errcode = '42501', message = 'not_article_owner',
      detail = 'Only the owner or a reviewer may create a new version.';
  end if;

  if v_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'revision_conflict',
      detail = format('Expected revision %s but article is at %s.', p_expected_revision, v_revision),
      hint = 'Reload the article and retry.';
  end if;

  select v.state into v_state from public.article_versions v where v.id = v_current;

  if v_state in ('draft', 'review') then
    raise exception using errcode = '42501', message = 'invalid_transition',
      detail = format('Cannot start a new version while the current version is %s.', v_state),
      hint = 'Edit the draft, or wait for the review to finish.';
  end if;

  if p_body is null or jsonb_typeof(p_body) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_body';
  end if;

  select coalesce(max(v.version_number), 0) + 1 into v_next_number
  from public.article_versions v
  where v.article_id = p_article_id;

  insert into public.article_versions (
    id, article_id, version_number, title, summary, body,
    author_id, category_id, seo_title, seo_description, og_image_key, state, created_by
  ) values (
    v_new_version, p_article_id, v_next_number, btrim(p_title), p_summary, p_body,
    p_author_id, p_category_id, p_seo_title, p_seo_description, p_og_image_key, 'draft', v_actor
  );

  update public.articles
  set current_version_id = v_new_version,
      revision = revision + 1
  where id = p_article_id;

  perform public.audit_event(
    'staff', 'article.revise', 'article', p_article_id, 'success',
    jsonb_build_object('version_number', v_next_number, 'version_id', v_new_version)
  );

  return v_new_version;
end;
$$;

------------------------------------------------------------------------------
-- Article: draft -> review
------------------------------------------------------------------------------

create or replace function public.article_submit(
  p_article_id        uuid,
  p_expected_revision bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor    uuid := auth.uid();
  v_owner    uuid;
  v_revision bigint;
  v_current  uuid;
  v_state    text;
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

  if v_owner <> v_actor then
    raise exception using errcode = '42501', message = 'not_article_owner';
  end if;

  if v_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'revision_conflict',
      detail = format('Expected revision %s but article is at %s.', p_expected_revision, v_revision);
  end if;

  select v.state into v_state from public.article_versions v where v.id = v_current;

  if v_state <> 'draft' then
    raise exception using errcode = '42501', message = 'invalid_transition',
      detail = format('Cannot submit an article whose current version is %s.', v_state);
  end if;

  update public.article_versions set state = 'review' where id = v_current;

  update public.articles set revision = revision + 1 where id = p_article_id;

  perform public.audit_event('staff', 'article.submit', 'article', p_article_id, 'success',
    jsonb_build_object('version_id', v_current));
end;
$$;

------------------------------------------------------------------------------
-- Article: review -> approved | rejected
------------------------------------------------------------------------------

create or replace function public.article_review(
  p_article_id        uuid,
  p_action            text,
  p_expected_revision bigint,
  p_note              text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor     uuid := auth.uid();
  v_revision  bigint;
  v_current   uuid;
  v_state     text;
  v_created_by uuid;
begin
  perform public.require_capability('article.review');

  if p_action not in ('approve', 'reject') then
    raise exception using errcode = '22023', message = 'invalid_action',
      detail = 'Action must be approve or reject.';
  end if;

  select a.revision, a.current_version_id
    into v_revision, v_current
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

  select v.state, v.created_by into v_state, v_created_by
  from public.article_versions v
  where v.id = v_current;

  -- Four eyes. An editor who wrote the draft cannot be the editor who approves it, otherwise
  -- the review gate is a formality with a click.
  if v_created_by = v_actor then
    raise exception using errcode = '42501', message = 'self_review_not_allowed',
      detail = 'An editor cannot review a version they created.';
  end if;

  if v_state <> 'review' then
    raise exception using errcode = '42501', message = 'invalid_transition',
      detail = format('Version is %s, not in review.', v_state);
  end if;

  if p_action = 'reject' and coalesce(char_length(btrim(p_note)), 0) < 3 then
    raise exception using errcode = '22023', message = 'rejection_note_required',
      detail = 'A rejection must record why.';
  end if;

  update public.article_versions
  set state = case when p_action = 'approve' then 'approved' else 'rejected' end
  where id = v_current;

  update public.articles set revision = revision + 1 where id = p_article_id;

  perform public.audit_event(
    'staff',
    case when p_action = 'approve' then 'article.approve' else 'article.reject' end,
    'article', p_article_id, 'success',
    jsonb_build_object('version_id', v_current, 'note', p_note)
  );
end;
$$;

------------------------------------------------------------------------------
-- Article: publish / unpublish / breaking
------------------------------------------------------------------------------

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
  v_actor        uuid := auth.uid();
  v_revision     bigint;
  v_current      uuid;
  v_published    uuid;
  v_state        text;
  v_was_breaking boolean;
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

  select v.state into v_state from public.article_versions v where v.id = v_current;

  if v_state <> 'approved' then
    raise exception using errcode = '42501', message = 'no_approved_version',
      detail = format('Current version is %s. Only an approved version can be published.', v_state);
  end if;

  if v_published = v_current then
    raise exception using errcode = '23505', message = 'already_published',
      detail = 'This exact version is already the published version.';
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
      'breaking', v_was_breaking
    ));
end;
$$;

create or replace function public.article_unpublish(
  p_article_id        uuid,
  p_expected_revision bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision  bigint;
  v_published uuid;
begin
  perform public.require_capability('article.unpublish');

  select a.revision, a.published_version_id
    into v_revision, v_published
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

  if v_published is null then
    raise exception using errcode = '42501', message = 'not_published',
      detail = 'Article is not published.';
  end if;

  -- is_breaking must be cleared in the same statement: the check constraint forbids a breaking
  -- flag on an unpublished article.
  update public.articles
  set published_version_id = null,
      published_at = null,
      is_breaking = false,
      breaking_until = null,
      revision = revision + 1
  where id = p_article_id;

  perform public.audit_event('staff', 'article.unpublish', 'article', p_article_id, 'success',
    jsonb_build_object('version_id', v_published));
end;
$$;

create or replace function public.article_set_breaking(
  p_article_id        uuid,
  p_breaking          boolean,
  p_until             timestamptz,
  p_expected_revision bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision  bigint;
  v_published uuid;
begin
  perform public.require_capability('article.publish');

  select a.revision, a.published_version_id
    into v_revision, v_published
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

  if v_published is null then
    raise exception using errcode = '42501', message = 'not_published',
      detail = 'Only a published article can be flagged breaking.';
  end if;

  if p_breaking and (p_until is null or p_until <= now()) then
    raise exception using errcode = '22023', message = 'breaking_expiry_required',
      detail = 'A breaking flag needs an expiry in the future.';
  end if;

  update public.articles
  set is_breaking = p_breaking,
      breaking_until = case when p_breaking then p_until else null end,
      revision = revision + 1
  where id = p_article_id;

  perform public.audit_event('staff', 'article.set_breaking', 'article', p_article_id, 'success',
    jsonb_build_object('breaking', p_breaking, 'until', p_until));
end;
$$;

------------------------------------------------------------------------------
-- Who is Who: content and status
------------------------------------------------------------------------------

create or replace function public.people_create(
  p_full_name        text,
  p_preferred_name   text,
  p_community        text,
  p_community_note   text,
  p_biography        text,
  p_is_deceased      boolean,
  p_portrait_key     text,
  p_portrait_alt     text,
  p_portrait_credit  text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id    uuid := gen_random_uuid();
  v_base  text;
  v_slug  text;
  v_n     integer := 1;
begin
  perform public.require_capability('people.manage');

  v_base := coalesce(public.slugify(p_full_name), 'person');
  v_slug := v_base;

  loop
    exit when not exists (select 1 from public.people p where p.slug = v_slug);
    v_n := v_n + 1;
    if v_n > 50 then
      v_slug := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
      exit;
    end if;
    v_slug := v_base || '-' || v_n::text;
  end loop;

  insert into public.people (
    id, slug, full_name, preferred_name, community, community_note, biography, is_deceased,
    portrait_key, portrait_alt, portrait_credit, status
  ) values (
    v_id, v_slug, btrim(p_full_name), p_preferred_name, p_community, p_community_note,
    p_biography, coalesce(p_is_deceased, false),
    p_portrait_key, p_portrait_alt, p_portrait_credit, 'draft'
  );

  perform public.audit_event('staff', 'people.create', 'person', v_id, 'success',
    jsonb_build_object('full_name', btrim(p_full_name), 'slug', v_slug));

  return v_id;
end;
$$;

create or replace function public.people_update(
  p_person_id        uuid,
  p_expected_revision bigint,
  p_full_name        text,
  p_preferred_name   text,
  p_community        text,
  p_community_note   text,
  p_biography        text,
  p_is_deceased      boolean,
  p_portrait_key     text,
  p_portrait_alt     text,
  p_portrait_credit  text,
  p_contributor_name text,
  p_contributor_consent boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision bigint;
begin
  perform public.require_capability('people.manage');

  select p.revision into v_revision
  from public.people p
  where p.id = p_person_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'person_not_found';
  end if;

  if v_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'revision_conflict',
      detail = format('Expected revision %s but person is at %s.', p_expected_revision, v_revision);
  end if;

  update public.people
  set full_name = btrim(p_full_name),
      preferred_name = p_preferred_name,
      community = p_community,
      community_note = p_community_note,
      biography = p_biography,
      is_deceased = coalesce(p_is_deceased, false),
      portrait_key = p_portrait_key,
      portrait_alt = p_portrait_alt,
      portrait_credit = p_portrait_credit,
      contributor_name = p_contributor_name,
      contributor_consent_recorded_at =
        case when p_contributor_consent then now() else null end,
      revision = revision + 1
  where id = p_person_id;

  perform public.audit_event('staff', 'people.update', 'person', p_person_id, 'success',
    jsonb_build_object('revision', v_revision + 1));
end;
$$;

create or replace function public.people_set_status(
  p_person_id         uuid,
  p_status            text,
  p_expected_revision bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision bigint;
  v_status   text;
begin
  perform public.require_capability('people.manage');

  if p_status not in ('draft', 'review', 'published', 'withdrawn') then
    raise exception using errcode = '22023', message = 'invalid_status';
  end if;

  select p.revision, p.status into v_revision, v_status
  from public.people p
  where p.id = p_person_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'person_not_found';
  end if;

  if v_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'revision_conflict',
      detail = format('Expected revision %s but person is at %s.', p_expected_revision, v_revision);
  end if;

  -- The publish gate itself lives in the table trigger; this only records the move.
  update public.people
  set status = p_status,
      revision = revision + 1
  where id = p_person_id;

  perform public.audit_event('staff', 'people.set_status', 'person', p_person_id, 'success',
    jsonb_build_object('from', v_status, 'to', p_status));
end;
$$;

create or replace function public.people_verify(
  p_person_id uuid,
  p_source_id uuid,
  p_note      text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id    uuid := gen_random_uuid();
begin
  perform public.require_capability('people.manage');

  if not exists (select 1 from public.people p where p.id = p_person_id) then
    raise exception using errcode = 'P0002', message = 'person_not_found';
  end if;

  -- The cited source must belong to this person. Otherwise the badge cites evidence about
  -- somebody else, which is worse than no badge.
  if not exists (
    select 1 from public.people_sources s
    where s.id = p_source_id and s.person_id = p_person_id
  ) then
    raise exception using errcode = '23503', message = 'source_not_for_person',
      detail = 'The verification source must belong to the person being verified.';
  end if;

  update public.people_verifications
  set superseded_at = now()
  where person_id = p_person_id and superseded_at is null;

  insert into public.people_verifications (id, person_id, verified_by, source_id, note)
  values (v_id, p_person_id, v_actor, p_source_id, btrim(p_note));

  perform public.audit_event('staff', 'people.verify', 'person', p_person_id, 'success',
    jsonb_build_object('verification_id', v_id, 'source_id', p_source_id));

  return v_id;
end;
$$;

create or replace function public.people_unverify(
  p_person_id uuid,
  p_reason    text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  perform public.require_capability('people.manage');

  if coalesce(char_length(btrim(p_reason)), 0) < 3 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;

  update public.people_verifications
  set superseded_at = now()
  where person_id = p_person_id and superseded_at is null;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception using errcode = 'P0002', message = 'no_current_verification';
  end if;

  perform public.audit_event('staff', 'people.unverify', 'person', p_person_id, 'success',
    jsonb_build_object('reason', p_reason));
end;
$$;

------------------------------------------------------------------------------
-- Grants
------------------------------------------------------------------------------

revoke all on function public.article_create(text, text, jsonb, uuid, uuid, text, text, text) from public;
revoke all on function public.article_revise(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text) from public;
revoke all on function public.article_submit(uuid, bigint) from public;
revoke all on function public.article_review(uuid, text, bigint, text) from public;
revoke all on function public.article_publish(uuid, bigint) from public;
revoke all on function public.article_unpublish(uuid, bigint) from public;
revoke all on function public.article_set_breaking(uuid, boolean, timestamptz, bigint) from public;
revoke all on function public.people_create(text, text, text, text, text, boolean, text, text, text) from public;
revoke all on function public.people_update(uuid, bigint, text, text, text, text, text, boolean, text, text, text, text, boolean) from public;
revoke all on function public.people_set_status(uuid, text, bigint) from public;
revoke all on function public.people_verify(uuid, uuid, text) from public;
revoke all on function public.people_unverify(uuid, text) from public;

grant execute on function public.article_create(text, text, jsonb, uuid, uuid, text, text, text) to authenticated;
grant execute on function public.article_revise(uuid, bigint, text, text, jsonb, uuid, uuid, text, text, text) to authenticated;
grant execute on function public.article_submit(uuid, bigint) to authenticated;
grant execute on function public.article_review(uuid, text, bigint, text) to authenticated;
grant execute on function public.article_publish(uuid, bigint) to authenticated;
grant execute on function public.article_unpublish(uuid, bigint) to authenticated;
grant execute on function public.article_set_breaking(uuid, boolean, timestamptz, bigint) to authenticated;
grant execute on function public.people_create(text, text, text, text, text, boolean, text, text, text) to authenticated;
grant execute on function public.people_update(uuid, bigint, text, text, text, text, text, boolean, text, text, text, text, boolean) to authenticated;
grant execute on function public.people_set_status(uuid, text, bigint) to authenticated;
grant execute on function public.people_verify(uuid, uuid, text) to authenticated;
grant execute on function public.people_unverify(uuid, text) to authenticated;
