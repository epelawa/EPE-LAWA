-- Turn 26: housekeeping for the encrypted AI provider keys table, so it follows
-- the schema rules every other table follows (indexed foreign keys, and
-- updated_at maintained by the shared trigger).
create index if not exists ai_provider_keys_updated_by_idx on public.ai_provider_keys (updated_by);

drop trigger if exists ai_provider_keys_set_updated_at on public.ai_provider_keys;
create trigger ai_provider_keys_set_updated_at before update on public.ai_provider_keys
  for each row execute function public.set_updated_at();
