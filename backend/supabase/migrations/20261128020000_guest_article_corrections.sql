-- EPE LAWA — news correction reports from signed-out readers. Forward-only, additive.
--
-- The article correction form is public. Signed-in readers keep the
-- member_file_correction RPC; signed-out readers are inserted server-side (service
-- role, rate limited) with a private name and email instead of an account id.
-- Staff read reports on the existing Corrections page; contact details are never
-- exposed to anon/authenticated roles (no new grants).

alter table public.article_correction_reports alter column reporter_id drop not null;
alter table public.article_correction_reports
  add column if not exists reporter_name text,
  add column if not exists reporter_email text;

alter table public.article_correction_reports drop constraint if exists article_correction_reports_reporter_name_len;
alter table public.article_correction_reports add constraint article_correction_reports_reporter_name_len
  check (reporter_name is null or char_length(btrim(reporter_name)) between 2 and 100);
alter table public.article_correction_reports drop constraint if exists article_correction_reports_reporter_email_fmt;
alter table public.article_correction_reports add constraint article_correction_reports_reporter_email_fmt
  check (reporter_email is null or (char_length(reporter_email) <= 254 and reporter_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'));
alter table public.article_correction_reports drop constraint if exists article_correction_reports_reporter_identified;
alter table public.article_correction_reports add constraint article_correction_reports_reporter_identified
  check (reporter_id is not null or reporter_email is not null);
