-- Reconciliation: radio public status projection and stream health append-only guard.
--
-- The live schema has the radio tables, their audit triggers and radio_touch_updated_at
-- triggers, but never received the stream health guard or the public radio_status view from
-- 20261102190003_editorial_media_and_radio.sql. Only those missing objects are applied here,
-- copied verbatim. The radio table backfill triggers and the RLS/revoke block are deliberately
-- NOT restated: episodes/programmes/radio_schedule already have touch triggers, and the
-- media_assets staff SELECT policy must stay authoritative.
--
-- Additionally, the live stream_config table was built from a shortened reconstruction and is
-- missing the stream format and embedding-permission audit columns that the status view
-- semantics depend on. Those columns are restored here (guarded, forward-only) before the view
-- is created.

alter table public.stream_config
  add column if not exists stream_format text,
  add column if not exists embedding_permitted boolean not null default false,
  add column if not exists embedding_permitted_at timestamptz,
  add column if not exists embedding_permitted_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.stream_config'::regclass and c.conname = 'stream_config_format'
  ) then
    alter table public.stream_config add constraint stream_config_format
      check (stream_format is null or stream_format in ('mp3', 'aac', 'hls', 'ogg'));
  end if;
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.stream_config'::regclass and c.conname = 'stream_config_permission_recorded'
  ) then
    alter table public.stream_config add constraint stream_config_permission_recorded
      check (
        embedding_permitted = false
        or (embedding_permitted_at is not null and embedding_permitted_by is not null)
      );
  end if;
end;
$$;

-- foreign key in this schema is indexed.

-- The health log is evidence: no application role may rewrite it. DELETE is left available to
-- the table owner only, because the 7-day prune job (docs/07-database-schema.md §3.1) has to
-- remove old rows — and anon/authenticated have no DELETE grant at all.
create or replace function public.guard_stream_status_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '42501',
    message = 'stream_status_append_only',
    detail = 'Health checks are an append-only log. Insert a new row instead.';
end;
$$;

drop trigger if exists stream_status_checks_append_only on public.stream_status_checks;
create trigger stream_status_checks_append_only
  before update on public.stream_status_checks
  for each row execute function public.guard_stream_status_append_only();



drop trigger if exists media_assets_set_updated_at on public.media_assets;
create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

drop trigger if exists stream_config_set_updated_at on public.stream_config;
create trigger stream_config_set_updated_at
  before update on public.stream_config
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- Public status projection
------------------------------------------------------------------------------

-- This view is deliberately SECURITY DEFINER (default view behaviour): stream_config is private,
-- so a security_invoker view would return nothing. It is the only public window onto that table
-- and it exposes booleans and labels only. The encrypted URL, its hash, the check URL and the
-- recorder identities are not selected. Recreating this view with SELECT * would leak them, so
-- the column list is explicit and must stay explicit.
--
-- status semantics the client renders:
--   not_configured -> B1 open: no stream URL or no embedding permission. Never show a player.
--   unknown        -> configured, but no status check within 60 seconds. Never show "LIVE".
--   live           -> the newest check succeeded and is younger than 60 seconds.
--   offline        -> the newest check failed. Offer the archive.
drop view if exists public.radio_status;
create view public.radio_status as
select
  sc.station_name,
  sc.station_frequency,
  sc.stream_format,
  (sc.stream_url_encrypted is not null)                                  as stream_configured,
  sc.embedding_permitted,
  (sc.stream_url_encrypted is not null and sc.embedding_permitted)       as is_configured,
  lc.ok                                                                  as last_check_ok,
  lc.checked_at                                                          as last_checked_at,
  case
    when sc.stream_url_encrypted is null or not sc.embedding_permitted then 'not_configured'
    when lc.checked_at is null then 'unknown'
    when lc.checked_at < now() - interval '60 seconds' then 'unknown'
    when lc.ok then 'live'
    else 'offline'
  end                                                                    as status
from public.stream_config sc
left join lateral (
  select c.ok, c.checked_at
  from public.stream_status_checks c
  order by c.checked_at desc
  limit 1
) lc on true
where sc.id = 1;


grant select on public.radio_status to anon, authenticated;
