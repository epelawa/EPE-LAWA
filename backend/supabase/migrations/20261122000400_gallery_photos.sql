-- EPE LAWA — gallery photos (forward-only).
--
-- The public gallery shows published, credited photographs. Staff add gallery
-- photographs and retire them through audited, capability-gated RPCs so the
-- database row, the public page and the audit log stay in step.
--
-- Photos can reference an external HTTPS image the staff account has the
-- rights to use, or (once storage is configured) an R2 object registered by
-- the media upload flow. rights_note stays private to staff.

alter table public.media_assets add column if not exists is_public boolean not null default false;

create or replace function public.gallery_photo_add(
  p_title       text,
  p_credit      text,
  p_alt_text    text,
  p_media_url   text,
  p_rights_note text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'gallery_photo_forbidden';
  end if;
  if not public.has_capability('site.content') then
    raise exception using errcode = '42501', message = 'gallery_photo_forbidden';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 2 and 160 then
    raise exception using errcode = '22023', message = 'gallery_title_invalid';
  end if;
  if p_alt_text is null or char_length(btrim(p_alt_text)) not between 5 and 300 then
    raise exception using errcode = '22023', message = 'gallery_alt_invalid';
  end if;
  if p_media_url is null or p_media_url !~ '^https://[^\s]+$' then
    raise exception using errcode = '22023', message = 'gallery_url_invalid';
  end if;
  if p_rights_note is null or char_length(btrim(p_rights_note)) not between 5 and 2000 then
    raise exception using errcode = '22023', message = 'gallery_rights_required';
  end if;

  insert into public.media_assets (kind, title, credit, rights_note, provider, bucket, object_key,
    mime_type, byte_size, alt_text, uploaded_by, is_public)
  values ('gallery', btrim(p_title), nullif(btrim(coalesce(p_credit, '')), ''), btrim(p_rights_note),
    'external', 'external', btrim(p_media_url), 'image/*', 0, btrim(p_alt_text), auth.uid(), true)
  returning id into v_id;

  perform public.audit_event('staff', 'gallery.photo_add', 'media_asset', v_id, 'success',
    jsonb_build_object('title', btrim(p_title), 'credit', coalesce(btrim(coalesce(p_credit, '')), '')));
  return v_id;
end;
$$;

create or replace function public.gallery_photo_remove(p_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'gallery_photo_forbidden';
  end if;
  if not public.has_capability('site.content') then
    raise exception using errcode = '42501', message = 'gallery_photo_forbidden';
  end if;
  if not exists (select 1 from public.media_assets m where m.id = p_asset_id and m.kind = 'gallery') then
    raise exception using errcode = 'P0002', message = 'gallery_photo_not_found';
  end if;

  delete from public.media_assets where id = p_asset_id and kind = 'gallery';
  perform public.audit_event('staff', 'gallery.photo_remove', 'media_asset', p_asset_id, 'success', '{}');
end;
$$;

revoke all on function public.gallery_photo_add(text,text,text,text,text) from public, anon;
grant execute on function public.gallery_photo_add(text,text,text,text,text) to authenticated;
revoke all on function public.gallery_photo_remove(uuid) from public, anon;
grant execute on function public.gallery_photo_remove(uuid) to authenticated;
