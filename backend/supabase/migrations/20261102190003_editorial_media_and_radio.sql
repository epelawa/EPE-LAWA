-- EPE LAWA — M3: editorial media, radio catalogue and the honest stream-status projection.
--
-- Two rules drive this file (docs/00-master-plan.md §2.3, docs/01-product-requirements.md §4.2):
--   1. "LIVE" is a verified state, never decorative. It is derived from a status check that
--      actually ran in the last 60 seconds, never from configuration.
--   2. Blocker B1 is open: no stream URL, format or embedding permission has been supplied.
--      The schema therefore has a first-class "not configured" answer, so the UI never has to
--      invent one.

------------------------------------------------------------------------------
-- Media (object storage metadata only, never bytes, never a full URL)
------------------------------------------------------------------------------

create table if not exists public.media_assets (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,
  title      text,
  credit     text,
  rights_note text,
  provider   text not null default 'r2',
  bucket     text not null,
  object_key text not null,
  mime_type  text not null,
  byte_size  bigint not null,
  width      integer,
  height     integer,
  alt_text   text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_kind check (kind in ('image', 'video_thumb', 'document')),
  -- docs/13-tech-stack.md names Cloudflare R2; docs/10-integrations.md still says GCS.
  -- Both are accepted so the conflict is resolved by configuration, not by a migration.
  constraint media_provider check (provider in ('r2', 'gcs')),
  constraint media_bucket check (bucket in ('public', 'private')),
  constraint media_mime_format check (mime_type ~ '^[a-z]+/[A-Za-z0-9.+_-]+$'),
  constraint media_byte_size check (byte_size > 0 and byte_size <= 26214400),
  constraint media_dimensions check (
    (width is null or width > 0) and (height is null or height > 0)
  ),
  -- No path traversal, no leading slash, no backslash, no double slash.
  constraint media_object_key_safe check (
    object_key ~ '^[A-Za-z0-9][A-Za-z0-9._/-]*$'
    and object_key !~ '\.\.'
    and object_key !~ '//'
  ),
  constraint media_object_unique unique (provider, bucket, object_key)
);

-- Alt text is a WCAG requirement, not a nicety. A public image without it is a defect that
-- ships to screen-reader users, so it is rejected at the boundary.
alter table public.media_assets drop constraint if exists media_public_image_requires_alt;
alter table public.media_assets
  add constraint media_public_image_requires_alt check (
    not (kind = 'image' and bucket = 'public')
    or (alt_text is not null and char_length(btrim(alt_text)) between 1 and 300)
  );

create index if not exists media_assets_uploader_idx on public.media_assets (uploaded_by, created_at desc);
create index if not exists media_assets_bucket_idx   on public.media_assets (bucket, kind);

------------------------------------------------------------------------------
-- Radio catalogue
------------------------------------------------------------------------------

create table if not exists public.programmes (
  id            uuid primary key default gen_random_uuid(),
  slug          citext not null unique,
  name          text not null,
  description   text,
  schedule_note text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint programmes_slug_format check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint programmes_name_length check (char_length(btrim(name)) between 1 and 120)
);

create table if not exists public.episodes (
  id               uuid primary key default gen_random_uuid(),
  programme_id     uuid not null references public.programmes(id) on delete restrict,
  slug             citext not null unique,
  title            text not null,
  description      text,
  aired_on         date,
  duration_seconds integer,
  media_asset_id   uuid references public.media_assets(id) on delete set null,
  external_url     text,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint episodes_slug_format check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint episodes_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint episodes_duration check (duration_seconds is null or duration_seconds > 0),
  -- No http:// audio on an https:// page: the browser blocks it and there is no workaround
  -- (docs/10-integrations.md §8).
  constraint episodes_external_url_https check (
    external_url is null or external_url ~ '^https://'
  ),
  -- An episode cannot be published with nothing to play.
  constraint episodes_publishable check (
    published_at is null or media_asset_id is not null or external_url is not null
  )
);

create index if not exists episodes_programme_idx
  on public.episodes (programme_id, aired_on desc nulls last);
create index if not exists episodes_archive_idx
  on public.episodes (published_at desc, id desc)
  where published_at is not null;
create index if not exists episodes_media_asset_idx on public.episodes (media_asset_id);

create table if not exists public.radio_schedule (
  id           uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  day_of_week  smallint not null,
  starts_at    time not null,
  ends_at      time not null,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Seconds since midnight / 60. Generated so the overlap constraint below is possible; a
  -- "time" value has no built-in GiST range operator.
  starts_minute integer generated always as ((extract(epoch from starts_at)::integer / 60)) stored,
  ends_minute   integer generated always as ((extract(epoch from ends_at)::integer / 60)) stored,
  -- 0 = Sunday. The app renders local time; Epe is WAT (UTC+1, no DST), so a wall-clock
  -- schedule is stored without a timezone on purpose.
  constraint radio_schedule_day check (day_of_week between 0 and 6),
  constraint radio_schedule_order check (ends_at > starts_at),
  constraint radio_schedule_programme_start_key unique (programme_id, day_of_week, starts_at)
);

-- Overlapping slots make "what is on now" ambiguous, and an ambiguous schedule is a bug the UI
-- cannot fix. Two programmes may not occupy the same minute on the same day.
create extension if not exists btree_gist;
alter table public.radio_schedule drop constraint if exists radio_schedule_no_overlap;
alter table public.radio_schedule
  add constraint radio_schedule_no_overlap
  exclude using gist (
    day_of_week with =,
    int4range(starts_minute, ends_minute, '[)') with &&
  );

create index if not exists radio_schedule_programme_idx on public.radio_schedule (programme_id);

------------------------------------------------------------------------------
-- Stream configuration and health
------------------------------------------------------------------------------

-- Single row. The upstream URL is stored encrypted and is never returned to any client — the
-- player receives a server-proxied or signed URL (docs/10-integrations.md §8).
create table if not exists public.stream_config (
  id                              smallint primary key default 1,
  stream_url_encrypted            bytea,
  stream_url_hash                 text,
  status_check_url                text,
  stream_format                   text,
  station_name                    text,
  station_frequency               text,
  -- B1 is encoded as data, not as a TODO comment: permission to embed is a recorded fact with
  -- a date and a person, and the public status view refuses to say "live" without it.
  embedding_permitted             boolean not null default false,
  embedding_permitted_at          timestamptz,
  embedding_permitted_by          uuid references auth.users(id) on delete set null,
  updated_by                      uuid references auth.users(id) on delete set null,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint stream_config_singleton check (id = 1),
  constraint stream_config_format check (
    stream_format is null or stream_format in ('mp3', 'aac', 'hls', 'ogg')
  ),
  constraint stream_config_check_url_https check (
    status_check_url is null or status_check_url ~ '^https://'
  ),
  constraint stream_config_permission_recorded check (
    embedding_permitted = false
    or (embedding_permitted_at is not null and embedding_permitted_by is not null)
  )
);

-- Append-only. "LIVE" reads the newest row; it is never inferred from configuration.
create table if not exists public.stream_status_checks (
  id          bigint generated always as identity primary key,
  checked_at  timestamptz not null default now(),
  ok          boolean not null,
  latency_ms  integer,
  error_class text,
  source      text not null default 'cron',
  constraint stream_status_latency check (latency_ms is null or latency_ms >= 0),
  constraint stream_status_source check (source in ('cron', 'manual'))
);

create index if not exists stream_status_checks_recent_idx
  on public.stream_status_checks (checked_at desc);

-- No FK index for stream_config.embedding_permitted_by or .updated_by on purpose: stream_config
-- is a singleton (check id = 1), so an index over a one-row table is pure overhead. Every other
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

------------------------------------------------------------------------------
-- updated_at
------------------------------------------------------------------------------

drop trigger if exists media_assets_set_updated_at on public.media_assets;
create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

drop trigger if exists programmes_set_updated_at on public.programmes;
create trigger programmes_set_updated_at
  before update on public.programmes
  for each row execute function public.set_updated_at();

drop trigger if exists episodes_set_updated_at on public.episodes;
create trigger episodes_set_updated_at
  before update on public.episodes
  for each row execute function public.set_updated_at();

drop trigger if exists radio_schedule_set_updated_at on public.radio_schedule;
create trigger radio_schedule_set_updated_at
  before update on public.radio_schedule
  for each row execute function public.set_updated_at();

drop trigger if exists stream_config_set_updated_at on public.stream_config;
create trigger stream_config_set_updated_at
  before update on public.stream_config
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- RLS
------------------------------------------------------------------------------

alter table public.media_assets enable row level security;alter table public.programmes enable row level security;
alter table public.episodes enable row level security;
alter table public.radio_schedule enable row level security;
alter table public.stream_config enable row level security;
alter table public.stream_status_checks enable row level security;

revoke all on table public.media_assets from public, anon, authenticated;
revoke all on table public.programmes from public, anon, authenticated;
revoke all on table public.episodes from public, anon, authenticated;
revoke all on table public.radio_schedule from public, anon, authenticated;
revoke all on table public.stream_config from public, anon, authenticated;
revoke all on table public.stream_status_checks from public, anon, authenticated;

grant select on table public.programmes to anon, authenticated;
grant select on table public.episodes to anon, authenticated;
grant select on table public.radio_schedule to anon, authenticated;
grant select on public.radio_status to anon, authenticated;

-- Media metadata is public only for public assets, and only the safe columns. rights_note and
-- uploaded_by are internal. Staff tooling reads the full row with the service role, server-side,
-- exactly like every other admin read in this schema.
grant select (id, kind, title, credit, bucket, object_key, mime_type, byte_size, width, height,
              alt_text, created_at)
  on table public.media_assets to anon, authenticated;

drop policy if exists programmes_read on public.programmes;
create policy programmes_read on public.programmes
  for select to anon, authenticated
  using (is_active);

drop policy if exists programmes_read_staff on public.programmes;
create policy programmes_read_staff on public.programmes
  for select to authenticated
  using (public.has_capability('radio.manage'));

drop policy if exists episodes_read_public on public.episodes;
create policy episodes_read_public on public.episodes
  for select to anon, authenticated
  using (
    published_at is not null
    and exists (
      select 1 from public.programmes p
      where p.id = episodes.programme_id and p.is_active
    )
  );

drop policy if exists episodes_read_staff on public.episodes;
create policy episodes_read_staff on public.episodes
  for select to authenticated
  using (public.has_capability('radio.manage'));

drop policy if exists radio_schedule_read on public.radio_schedule;
create policy radio_schedule_read on public.radio_schedule
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.programmes p
      where p.id = radio_schedule.programme_id and p.is_active
    )
  );

drop policy if exists media_assets_read_public on public.media_assets;
create policy media_assets_read_public on public.media_assets
  for select to anon, authenticated
  using (bucket = 'public');

drop policy if exists media_assets_read_staff on public.media_assets;
create policy media_assets_read_staff on public.media_assets
  for select to authenticated
  using (
    public.has_capability('article.create')
    or public.has_capability('article.review')
    or public.has_capability('radio.manage')
  );

-- stream_config and stream_status_checks have RLS enabled and NO policy at all. That is the
-- intended state: nobody except the service role reads them directly. The public sees
-- radio_status, which cannot express the stream URL.
