-- Turn 26 (owner): AI provider keys are typed into the admin page and stored
-- encrypted by the server (AES-256-GCM with a Vercel-only secret). Only the
-- service role can touch the table; no browser or signed-in user can read it.
create table if not exists public.ai_provider_keys (
  provider text primary key check (provider in ('openrouter', 'kilo', 'gemini', 'groq', 'cerebras', 'mistral', 'nvidia')),
  sealed text not null check (sealed ~ '^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$' and char_length(sealed) <= 2000),
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{12}$'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.ai_provider_keys enable row level security;
revoke all on public.ai_provider_keys from public, anon, authenticated;
grant select, insert, update, delete on public.ai_provider_keys to service_role;

-- NVIDIA NIM joins the free providers.
do $$
declare v_src text;
begin
  select pg_get_functiondef('public.ai_models_save(jsonb,text)'::regprocedure) into v_src;
  v_src := replace(v_src, '^(kilo|gemini|groq|cerebras|mistral)@', '^(kilo|gemini|groq|cerebras|mistral|nvidia)@');
  execute v_src;
end $$;
