-- M3 — editorial media and radio.
-- citext is created here rather than relying on M2 having run first.
create extension if not exists citext schema public;

--
-- Object storage is Cloudflare R2. The database stores an object key plus a bucket and
-- provider discriminator, never a full URL: URLs are environment-specific and must be
-- constructed at read time, so a media row stays portable across environments.
--
-- The upstream stream URL is never stored in plaintext. It lives as encrypted bytes plus a
-- lookup hash, so the secret can be rotated without touching the catalogue.

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('image', 'video_thumb', 'document')),
  title text,
  credit text,
  rights_note text,
  provider text not null default 'r2',
  bucket text not null,
  object_key text not null,
  mime_type text not null,
  byte_size bigint not null,
  width integer,
  height integer,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (provider, bucket, object_key)
);

create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  slug citext unique not null,
  name text not null,
  description text,
  schedule_note text,
  is_active boolean not null default true
);

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid references public.programmes(id) on delete restrict,
  slug citext unique not null,
  title text not null,
  description text,
  aired_on date,
  duration_seconds integer,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  external_url text,
  published_at timestamptz
);

create table public.radio_schedule (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid references public.programmes(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  note text
);

-- The upstream stream URL. Encrypted, never rendered back to any client.
create table public.stream_config (
  id integer primary key default 1 check (id = 1),
  stream_url_encrypted bytea,
  stream_url_hash text,
  status_check_url text,
  station_external_id text,
  station_name text,
  station_frequency text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- Append-only health log. "LIVE" is derived from the most recent row within 60 seconds,
-- never from stream_config alone.
create table public.stream_status_checks (
  id bigserial primary key,
  checked_at timestamptz not null default now(),
  ok boolean not null,
  latency_ms integer,
  error_class text
);

alter table public.media_assets enable row level security;
alter table public.programmes enable row level security;
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

-- Public reads: programmes, episodes and the health log. Media metadata is public; the
-- object itself is fetched by key through a server route, and the private bucket is not
-- readable by anon.
grant select on table public.programmes to anon, authenticated;
grant select on table public.episodes to anon, authenticated;
grant select on table public.radio_schedule to anon, authenticated;
grant select on table public.stream_status_checks to anon, authenticated;
grant select on table public.media_assets to anon, authenticated;

create policy programmes_read on public.programmes
  for select to anon, authenticated using (is_active);

create policy episodes_read on public.episodes
  for select to anon, authenticated using (published_at is not null);

create policy radio_schedule_read on public.radio_schedule
  for select to anon, authenticated using (true);

create policy stream_status_checks_read on public.stream_status_checks
  for select to anon, authenticated using (true);

create policy media_assets_read on public.media_assets
  for select to anon, authenticated using (true);

-- stream_config is staff-only and has no grant for anon or authenticated. The encrypted
-- URL is never exposed: a server-side function decrypts it and the client never sees it.