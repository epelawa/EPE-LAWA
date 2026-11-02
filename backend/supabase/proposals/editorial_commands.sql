-- EXPERIMENT ONLY. Depends on editorial_storage.sql. Not a migration.
-- SECURITY DEFINER requires independent production review before any deployment.
-- These functions use only auth.uid(), not a caller-supplied actor or capability.
-- They hold shared locks on the active profile and grants for the transaction,
-- so revocation and actions have a defined order.
create function public.editorial_prototype_require_active() returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  perform 1 from public.staff_profiles where user_id = actor and is_active = true for share;
  if not found then raise exception 'editorial request denied' using errcode = 'P0001'; end if;
  perform 1 from public.staff_capability_grants where user_id = actor and capability = 'admin.access' for share;
  if not found then raise exception 'editorial request denied' using errcode = 'P0001'; end if;
  return actor;
end $$;

create function public.editorial_prototype_require_capability(actor uuid, cap text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.editorial_capabilities where user_id = actor and capability = cap for share;
  if not found then raise exception 'editorial request denied' using errcode = 'P0001'; end if;
end $$;

create function public.editorial_prototype_create(article_id uuid, version_id uuid, title text, summary text, body text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare actor uuid;
begin
  actor := public.editorial_prototype_require_active();
  perform public.editorial_prototype_require_capability(actor, 'draft.create');
  insert into public.editorial_articles (id, owner_id, revision, current_version_id) values (article_id, actor, 1, version_id);
  insert into public.editorial_versions (id, article_id, author_id, title, summary, body, state) values (version_id, article_id, actor, title, summary, body, 'draft');
  insert into public.editorial_audit_events (article_id, revision, version_id, actor_id, action) values (article_id, 1, version_id, actor, 'create');
  return 1;
end $$;

create function public.editorial_prototype_command(
  target uuid, expected_revision bigint, operation text,
  new_version uuid default null, new_title text default null,
  new_summary text default null, new_body text default null
) returns bigint language plpgsql security definer set search_path = '' as $$
declare
  actor uuid;
  article public.editorial_articles%rowtype;
  current_version public.editorial_versions%rowtype;
  event_version uuid;
  next_revision bigint;
begin
  actor := public.editorial_prototype_require_active();
  select * into article from public.editorial_articles where id = target for update;
  if not found or expected_revision is distinct from article.revision or article.revision >= 9007199254740991 then
    raise exception 'editorial request denied' using errcode = 'P0001';
  end if;
  select * into strict current_version from public.editorial_versions where id = article.current_version_id and article_id = article.id;
  next_revision := article.revision + 1;
  event_version := current_version.id;
  case operation
    when 'edit' then
      if actor = article.owner_id then
        -- Any-editor access is also sufficient for an owner.
        if not exists (select 1 from public.editorial_capabilities where user_id = actor and capability = 'draft.edit.own') then
          perform public.editorial_prototype_require_capability(actor, 'draft.edit.any');
        else perform public.editorial_prototype_require_capability(actor, 'draft.edit.own'); end if;
      else perform public.editorial_prototype_require_capability(actor, 'draft.edit.any'); end if;
      if current_version.state = 'review' then raise exception 'editorial request denied' using errcode = 'P0001'; end if;
      insert into public.editorial_versions (id, article_id, author_id, title, summary, body, state) values (new_version, target, actor, new_title, new_summary, new_body, 'draft');
      event_version := new_version;
      update public.editorial_articles set current_version_id = new_version where id = target;
    when 'submit' then
      perform public.editorial_prototype_require_capability(actor, 'draft.submit');
      if actor = article.owner_id then
        if not exists (select 1 from public.editorial_capabilities where user_id = actor and capability = 'draft.edit.own') then
          perform public.editorial_prototype_require_capability(actor, 'draft.edit.any');
        else perform public.editorial_prototype_require_capability(actor, 'draft.edit.own'); end if;
      else perform public.editorial_prototype_require_capability(actor, 'draft.edit.any'); end if;
      if current_version.state <> 'draft' then raise exception 'editorial request denied' using errcode = 'P0001'; end if;
      update public.editorial_versions set state = 'review' where id = current_version.id;
    when 'request_revision' then
      perform public.editorial_prototype_require_capability(actor, 'article.review');
      if current_version.state <> 'review' then raise exception 'editorial request denied' using errcode = 'P0001'; end if;
      update public.editorial_versions set state = 'draft' where id = current_version.id;
    when 'approve' then
      perform public.editorial_prototype_require_capability(actor, 'article.approve');
      if current_version.state <> 'review' or actor = article.owner_id or actor = current_version.author_id then raise exception 'editorial request denied' using errcode = 'P0001'; end if;
      insert into public.editorial_approvals (article_id, version_id, approved_by) values (target, current_version.id, actor);
      update public.editorial_versions set state = 'approved' where id = current_version.id;
    when 'publish' then
      perform public.editorial_prototype_require_capability(actor, 'article.publish');
      if current_version.state <> 'approved' or article.published_version_id = current_version.id then raise exception 'editorial request denied' using errcode = 'P0001'; end if;
      update public.editorial_articles set published_version_id = current_version.id where id = target;
    when 'unpublish' then
      perform public.editorial_prototype_require_capability(actor, 'article.unpublish');
      if article.published_version_id is null then raise exception 'editorial request denied' using errcode = 'P0001'; end if;
      event_version := article.published_version_id;
      update public.editorial_articles set published_version_id = null where id = target;
    else raise exception 'editorial request denied' using errcode = 'P0001';
  end case;
  update public.editorial_articles set revision = next_revision where id = target;
  insert into public.editorial_audit_events (article_id, revision, version_id, actor_id, action) values (target, next_revision, event_version, actor, operation);
  return next_revision;
end $$;

revoke all on function public.editorial_prototype_require_active(), public.editorial_prototype_require_capability(uuid,text), public.editorial_prototype_create(uuid,uuid,text,text,text), public.editorial_prototype_command(uuid,bigint,text,uuid,text,text,text) from public, anon, authenticated, service_role;
grant execute on function public.editorial_prototype_create(uuid,uuid,text,text,text), public.editorial_prototype_command(uuid,bigint,text,uuid,text,text,text) to authenticated;
-- All operations remain experimental and unwired. No read API or public projection.
