-- Index the map review-queue foreign keys; the schema test requires every FK to be indexed.
create index if not exists map_correction_submissions_reviewed_by_idx on public.map_correction_submissions(reviewed_by);
create index if not exists map_verified_knowledge_verified_by_idx on public.map_verified_knowledge(verified_by);
