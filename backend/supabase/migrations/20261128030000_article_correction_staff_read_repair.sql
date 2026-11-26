-- EPE LAWA — repair staff read access to news correction reports. Forward-only.
--
-- Production drift found during the turn-4 form audit: the table had no SELECT
-- grant for `authenticated` (so the staff Corrections page always listed nothing)
-- and its only policy was `correction_reports_auth_read USING (true)`, which would
-- have exposed every report to every signed-in member had the grant existed.
-- This restores the intent of 20261123010000: staff with article.review read
-- reports; members and visitors read none. Writes stay RPC/service-role only.

drop policy if exists correction_reports_auth_read on public.article_correction_reports;
drop policy if exists correction_reports_staff_read on public.article_correction_reports;
create policy correction_reports_staff_read
  on public.article_correction_reports
  for select to authenticated
  using (public.has_capability('article.review'));

revoke all on public.article_correction_reports from anon;
grant select on public.article_correction_reports to authenticated;
