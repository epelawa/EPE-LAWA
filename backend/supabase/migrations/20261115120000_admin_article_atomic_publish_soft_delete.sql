-- EPE LAWA — atomic direct publication and recoverable article takedown.
-- Forward-only: preserves article_versions history and the deployed published view's
-- exact column shape while ensuring deleted articles can never be served publicly.
begin;

-- Catalogue entry only: no direct user grant or role assignment is seeded. The
-- authorized staff scope must be selected explicitly before separate provisioning.
insert into public.capabilities (key, description)
values ('article.delete', 'Soft-delete and restore articles while retaining version history')
on conflict (key) do nothing;

alter table public.articles
  add column if not exists deleted_at timestamptz;

create index if not exists articles_deleted_at_idx
  on public.articles (deleted_at)
  where deleted_at is not null;

-------------------------------------------------------------------------------
-- Immediate Upload Article path. Both capabilities are checked in this transaction
-- before any write; delegated create/publish RPCs recheck their own capabilities,
-- expected revision, cover metadata, and audit requirements.
-------------------------------------------------------------------------------
create or replace function public.article_create_and_publish_with_cover(
  p_title text,
  p_summary text,
  p_body jsonb,
  p_author_id uuid,
  p_category_id uuid,
  p_seo_title text,
  p_seo_description text,
  p_og_image_key text,
  p_cover_url text,
  p_cover_alt text,
  p_cover_credit text,
  p_cover_source_url text,
  p_cover_license_url text,
  p_cover_caption text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_article_id uuid;
  v_revision bigint;
begin
  perform public.require_capability('article.create');
  perform public.require_capability('article.publish');

  v_article_id := public.article_create_with_cover(
    p_title, p_summary, p_body, p_author_id, p_category_id,
    p_seo_title, p_seo_description, p_og_image_key,
    p_cover_url, p_cover_alt, p_cover_credit, p_cover_source_url,
    p_cover_license_url, p_cover_caption
  );

  select a.revision into v_revision
  from public.articles as a
  where a.id = v_article_id
  for update;
  if not found or v_revision <> 1 then
    raise exception using
      errcode = '40001',
      message = 'article_create_revision_conflict';
  end if;

  perform public.article_publish(v_article_id, v_revision);
  return v_article_id;
end;
$$;
revoke all on function public.article_create_and_publish_with_cover(
  text, text, jsonb, uuid, uuid, text, text, text,
  text, text, text, text, text, text
) from public, anon;
grant execute on function public.article_create_and_publish_with_cover(
  text, text, jsonb, uuid, uuid, text, text, text,
  text, text, text, text, text, text
) to authenticated;

-------------------------------------------------------------------------------
-- Guard the tombstone boundary. A soft-deleted row cannot be edited or published
-- through older RPCs; restore is allowed only by article.delete and stays private.
-------------------------------------------------------------------------------
create or replace function public.guard_article_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is not null then
    if new.deleted_at is not null then
      raise exception using errcode = '42501', message = 'article_deleted';
    end if;

    perform public.require_capability('article.delete');
    if new.published_version_id is not null
       or new.published_at is not null
       or new.is_breaking
       or new.breaking_until is not null then
      raise exception using
        errcode = '42501',
        message = 'article_restore_must_remain_unpublished';
    end if;
    return new;
  end if;

  if new.deleted_at is not null then
    perform public.require_capability('article.delete');
    if new.published_version_id is not null
       or new.published_at is not null
       or new.is_breaking
       or new.breaking_until is not null then
      raise exception using
        errcode = '42501',
        message = 'article_delete_must_unpublish';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_article_soft_delete() from public, anon, authenticated;
drop trigger if exists articles_soft_delete_guard on public.articles;
create trigger articles_soft_delete_guard
  before update on public.articles
  for each row execute function public.guard_article_soft_delete();

-------------------------------------------------------------------------------
-- Recoverable soft-delete. Published articles require both delete and unpublish
-- capabilities, clear the live pointer atomically, retain all versions, and bump
-- the revision. The audit row commits or rolls back with the state transition.
-------------------------------------------------------------------------------
create or replace function public.article_soft_delete(
  p_article_id uuid,
  p_expected_revision bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision bigint;
  v_new_revision bigint;
  v_current_version uuid;
  v_published_version uuid;
  v_deleted_at timestamptz;
begin
  perform public.require_capability('article.delete');
  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception using errcode = '22023', message = 'invalid_expected_revision';
  end if;

  select a.revision, a.current_version_id, a.published_version_id, a.deleted_at
    into v_revision, v_current_version, v_published_version, v_deleted_at
  from public.articles as a
  where a.id = p_article_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'article_not_found';
  end if;
  if v_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'revision_conflict',
      detail = format('Expected revision %s but article is at %s.', p_expected_revision, v_revision);
  end if;
  if v_deleted_at is not null then
    raise exception using errcode = '42501', message = 'article_already_deleted';
  end if;
  if v_published_version is not null then
    perform public.require_capability('article.unpublish');
  end if;
  if v_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'article_revision_exhausted';
  end if;

  update public.articles
  set deleted_at = now(),
      published_version_id = null,
      published_at = null,
      is_breaking = false,
      breaking_until = null,
      revision = revision + 1,
      updated_at = now()
  where id = p_article_id
  returning revision into v_new_revision;

  perform public.audit_event(
    'staff', 'article.soft_delete', 'article', p_article_id, 'success',
    jsonb_build_object(
      'previous_revision', v_revision,
      'revision', v_new_revision,
      'current_version_id', v_current_version,
      'previous_published_version_id', v_published_version,
      'was_published', v_published_version is not null
    )
  );
  return v_new_revision;
end;
$$;
revoke all on function public.article_soft_delete(uuid, bigint) from public, anon;
grant execute on function public.article_soft_delete(uuid, bigint) to authenticated;

create or replace function public.article_restore(
  p_article_id uuid,
  p_expected_revision bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision bigint;
  v_new_revision bigint;
  v_current_version uuid;
  v_deleted_at timestamptz;
begin
  perform public.require_capability('article.delete');
  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception using errcode = '22023', message = 'invalid_expected_revision';
  end if;

  select a.revision, a.current_version_id, a.deleted_at
    into v_revision, v_current_version, v_deleted_at
  from public.articles as a
  where a.id = p_article_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'article_not_found';
  end if;
  if v_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'revision_conflict',
      detail = format('Expected revision %s but article is at %s.', p_expected_revision, v_revision);
  end if;
  if v_deleted_at is null then
    raise exception using errcode = '42501', message = 'article_not_deleted';
  end if;
  if v_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'article_revision_exhausted';
  end if;

  update public.articles
  set deleted_at = null,
      revision = revision + 1,
      updated_at = now()
  where id = p_article_id
  returning revision into v_new_revision;

  perform public.audit_event(
    'staff', 'article.restore', 'article', p_article_id, 'success',
    jsonb_build_object(
      'previous_revision', v_revision,
      'revision', v_new_revision,
      'current_version_id', v_current_version,
      'remains_unpublished', true
    )
  );
  return v_new_revision;
end;
$$;
revoke all on function public.article_restore(uuid, bigint) from public, anon;
grant execute on function public.article_restore(uuid, bigint) to authenticated;

-------------------------------------------------------------------------------
-- Preserve the live published view's deployed columns (the live view and local
-- migration source currently disagree). Wrap its exact definition and exclude
-- deleted rows without changing column names, types, or order.
-------------------------------------------------------------------------------
do $$
declare
  v_definition text;
begin
  if pg_catalog.to_regclass('public.published_articles') is null then
    raise exception 'article_soft_delete_view_precondition_failed: published_articles view missing';
  end if;

  v_definition := pg_catalog.regexp_replace(
    pg_catalog.pg_get_viewdef('public.published_articles'::regclass, true),
    ';[[:space:]]*$',
    ''
  );
  if v_definition is null then
    raise exception 'article_soft_delete_view_precondition_failed: view definition unavailable';
  end if;

  if pg_catalog.strpos(v_definition, 'soft_delete_article.deleted_at') = 0 then
    execute pg_catalog.format(
      'create or replace view public.published_articles with (security_invoker = true) as
       select published_source.*
       from (%s) as published_source
       join public.articles as soft_delete_article
         on soft_delete_article.id = published_source.id
       where soft_delete_article.deleted_at is null',
      v_definition
    );
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
