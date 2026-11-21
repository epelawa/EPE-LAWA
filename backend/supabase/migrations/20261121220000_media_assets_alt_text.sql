-- EPE LAWA — restore the media_assets.alt_text column used by media_asset_create.
-- The production table predates the column, so new R2 uploads currently fail during metadata registration.
alter table public.media_assets
  add column if not exists alt_text text;
