-- EPE LAWA — media administration (forward-only).
--
-- Adds capability-gated, audited server RPCs so the staff media workspace can
-- register a freshly uploaded R2 object and remove a media asset. Storage
-- objects themselves are written/removed by the server app against Cloudflare
-- R2; the database stores non-sensitive metadata rows.
--
-- Authorization: registration requires article.create or radio.manage;
-- deletion requires article.publish or radio.manage. Every transition is
-- audited. The app fails closed until this migration is applied.

create or replace function public.media_asset_create(
  p_kind         text,
  p_title        text,
  p_credit       text,
  p_rights_note  text,
  p_bucket       text,
  p_object_key   text,
  p_mime_type    text,
  p_byte_size    bigint,
  p_width        integer,
  p_height       integer,
  p_alt_text     text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'media_upload_forbidden';
  end if;
  if not (public.has_capability('article.create') or public.has_capability('radio.manage')) then
    raise exception using errcode = '42501', message = 'media_upload_forbidden';
  end if;

  insert into public.media_assets (kind, title, credit, rights_note, provider, bucket, object_key,
    mime_type, byte_size, width, height, alt_text, uploaded_by)
  values (
    p_kind, nullif(btrim(p_title), ''), nullif(btrim(p_credit), ''), nullif(btrim(p_rights_note), ''),
    'r2', p_bucket, p_object_key, p_mime_type, p_byte_size, p_width, p_height,
    nullif(btrim(p_alt_text), ''), auth.uid()
  )
  returning id into v_id;

  perform public.audit_event('staff', 'media.asset_create', 'media_asset', v_id, 'success',
    jsonb_build_object('kind', p_kind, 'bucket', p_bucket, 'object_key', p_object_key,
      'mime_type', p_mime_type, 'byte_size', p_byte_size));
  return v_id;
end;
$$;

create or replace function public.media_asset_delete(p_asset_id uuid)
returns table (bucket text, object_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket text;
  v_key    text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'media_delete_forbidden';
  end if;
  if not (public.has_capability('article.publish') or public.has_capability('radio.manage')) then
    raise exception using errcode = '42501', message = 'media_delete_forbidden';
  end if;

  select m.bucket, m.object_key into v_bucket, v_key
    from public.media_assets m where m.id = p_asset_id;
  if not found then
    raise exception 'media_not_found';
  end if;

  begin
    delete from public.media_assets where id = p_asset_id;
  exception when foreign_key_violation then
    raise exception using errcode = '23503', message = 'media_asset_in_use';
  end;

  perform public.audit_event('staff', 'media.asset_delete', 'media_asset', p_asset_id, 'success',
    jsonb_build_object('bucket', v_bucket, 'object_key', v_key));
  return query select v_bucket, v_key;
end;
$$;

revoke all on function public.media_asset_create(text, text, text, text, text, text, text, bigint, integer, integer, text) from public, anon, authenticated;
grant execute on function public.media_asset_create(text, text, text, text, text, text, text, bigint, integer, integer, text) to authenticated;
revoke all on function public.media_asset_delete(uuid) from public, anon, authenticated;
grant execute on function public.media_asset_delete(uuid) to authenticated;
