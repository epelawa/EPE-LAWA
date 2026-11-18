-- Candidate trusted-server rate limiting. No browser can call or inspect this.
-- Client fingerprints must be HMACs of an IP provided by a trusted proxy.
create table if not exists public.form_rate_buckets (
  scope text not null check (scope in ('newsletter','enquiry')),
  bucket timestamptz not null,
  fingerprint text not null check (fingerprint = 'global' or fingerprint ~ '^[a-f0-9]{64}$'),
  requests integer not null check (requests > 0),
  primary key (scope, bucket, fingerprint)
);
alter table public.form_rate_buckets enable row level security;
revoke all on public.form_rate_buckets from public, anon, authenticated;

create or replace function public.form_rate_limit(p_scope text, p_fingerprint text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_bucket timestamptz := pg_catalog.date_trunc('hour', now()); global_count integer; client_count integer;
begin
  if p_scope is null or p_scope not in ('newsletter','enquiry') or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' then return false; end if;
  -- Serialize a scope's counters to avoid exceeding the global budget under race.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('form-limit:' || p_scope, 0));
  select requests into global_count from public.form_rate_buckets where scope = p_scope and bucket = current_bucket and fingerprint = 'global';
  select requests into client_count from public.form_rate_buckets where scope = p_scope and bucket = current_bucket and fingerprint = p_fingerprint;
  if coalesce(global_count, 0) >= 100 or coalesce(client_count, 0) >= 5 then return false; end if;
  insert into public.form_rate_buckets(scope,bucket,fingerprint,requests) values(p_scope,current_bucket,'global',1),(p_scope,current_bucket,p_fingerprint,1)
    on conflict(scope,bucket,fingerprint) do update set requests = public.form_rate_buckets.requests + 1;
  return true;
end; $$;
revoke all on function public.form_rate_limit(text,text) from public, anon, authenticated;
grant execute on function public.form_rate_limit(text,text) to service_role;
