-- EPE LAWA — article correction reports (forward-only).
--
-- Readers can report a factual error on a published story. Reports are filed
-- by signed-in members through a capability-free RPC (every member may file),
-- stored with the member reference, and read/resolved only in the private
-- staff workspace by accounts holding `article.review`. Every staff decision
-- is audited.

create table if not exists public.article_correction_reports (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution_note text check (resolution_note is null or char_length(btrim(resolution_note)) between 2 and 2000),
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists article_correction_reports_status_idx
  on public.article_correction_reports (status, created_at);
create index if not exists article_correction_reports_article_idx
  on public.article_correction_reports (article_id);

alter table public.article_correction_reports enable row level security;

revoke all on public.article_correction_reports from anon, authenticated;

create policy correction_reports_staff_read
  on public.article_correction_reports
  for select to authenticated
  using (public.has_capability('article.review'));

-- Members file corrections through the gated RPC below; no direct table writes.
create or replace function public.member_file_correction(
  p_article_id uuid,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'correction_forbidden';
  end if;
  if p_article_id is null or not exists (select 1 from public.articles a where a.id = p_article_id) then
    raise exception using errcode = '22023', message = 'correction_article_unknown';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then
    raise exception using errcode = '22023', message = 'correction_reason_invalid';
  end if;

  insert into public.article_correction_reports (article_id, reporter_id, reason)
  values (p_article_id, auth.uid(), btrim(p_reason))
  returning id into v_id;

  perform public.audit_event('member', 'correction.file', 'article', p_article_id, 'success',
    jsonb_build_object('report_id', v_id));
  return v_id;
end;
$$;

create or replace function public.staff_resolve_correction(
  p_report_id uuid,
  p_status text,
  p_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_capability('article.review') then
    raise exception using errcode = '42501', message = 'correction_forbidden';
  end if;
  if p_status not in ('resolved', 'dismissed') then
    raise exception using errcode = '22023', message = 'correction_status_invalid';
  end if;
  if p_status = 'resolved' and (p_note is null or char_length(btrim(p_note)) < 2) then
    raise exception using errcode = '22023', message = 'correction_note_required';
  end if;

  update public.article_correction_reports
    set status = p_status,
        resolution_note = nullif(btrim(coalesce(p_note, '')), ''),
        resolved_by = auth.uid(),
        updated_at = now()
    where id = p_report_id and status = 'open';

  if not found then
    raise exception using errcode = '22023', message = 'correction_report_unknown';
  end if;

  perform public.audit_event('staff', 'correction.resolve', 'article_correction_report', p_report_id, 'success',
    jsonb_build_object('status', p_status));
end;
$$;

grant execute on function public.member_file_correction(uuid, text) to authenticated;
grant execute on function public.staff_resolve_correction(uuid, text, text) to authenticated;
