-- HTTP cron calls retain their existing secret check and use service_role.
-- Staff reads are separately authorized via RLS; members cannot read job details.
revoke execute on function public.cron_job_start(text),
  public.cron_job_complete(uuid,text,text,jsonb), public.get_cron_job_history(integer),
  public.get_cron_job_stats() from public, anon, authenticated;
grant execute on function public.cron_job_start(text),
  public.cron_job_complete(uuid,text,text,jsonb), public.get_cron_job_history(integer),
  public.get_cron_job_stats() to service_role;
grant select on public.cron_job_history to service_role;

drop policy if exists cron_job_history_staff_read on public.cron_job_history;
create policy cron_job_history_staff_read on public.cron_job_history
  for select to authenticated
  using (public.has_capability('admin.access') and public.has_capability('audit.read'));
