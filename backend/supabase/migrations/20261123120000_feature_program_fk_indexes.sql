-- Close the FK-index lint gaps found by backend/tests/schema.test.mjs after the
-- 2026-11-23 feature-program tables. Every public foreign key must lead an index.

create index if not exists business_claims_decided_by_idx
  on public.business_claims (decided_by);

create index if not exists moderation_appeals_decided_by_idx
  on public.moderation_appeals (decided_by);

create index if not exists site_poll_votes_user_id_idx
  on public.site_poll_votes (user_id);

create index if not exists site_polls_created_by_idx
  on public.site_polls (created_by);
