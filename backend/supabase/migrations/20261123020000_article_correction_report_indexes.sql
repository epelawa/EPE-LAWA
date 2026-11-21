-- EPE LAWA — article_correction_reports structural invariants (forward-only).
--
-- 20261123010000_article_correction_reports.sql (APPLIED in production) left
-- the table without FK indexes on reporter_id/resolved_by and without the
-- standard set_updated_at trigger, violating the structural invariants
-- enforced by backend/tests/schema.test.mjs. Historical migrations are not
-- edited; this reconciles idempotently.

create index if not exists article_correction_reports_reporter_idx
  on public.article_correction_reports (reporter_id);
create index if not exists article_correction_reports_resolved_by_idx
  on public.article_correction_reports (resolved_by);

drop trigger if exists article_correction_reports_set_updated_at
  on public.article_correction_reports;
create trigger article_correction_reports_set_updated_at
  before update on public.article_correction_reports
  for each row execute function public.set_updated_at();
