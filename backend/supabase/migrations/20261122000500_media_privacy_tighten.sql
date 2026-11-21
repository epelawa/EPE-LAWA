-- EPE LAWA — media privacy tighten (forward-only).
--
-- media_assets carried a wide-open table-wide SELECT grant for anon, which
-- also exposed the private staff rights_note column. Access is narrowed:
-- anon keeps column-level read access without rights_note and only for
-- published gallery photographs; authenticated staff keep full reads.

revoke select on public.media_assets from anon;

grant select (id, kind, title, credit, provider, bucket, object_key, mime_type, byte_size,
  width, height, alt_text, uploaded_by, created_at, is_public)
  on public.media_assets to anon;

drop policy if exists media_assets_read on public.media_assets;
create policy media_assets_staff_read on public.media_assets for select to authenticated using (true);
create policy media_assets_public_read on public.media_assets for select to anon using (
  kind = 'gallery' and is_public
);
