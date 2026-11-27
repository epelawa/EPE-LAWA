-- AI processes: live progress for each run. While a run works, it reports what
-- it is doing right now (`progress`) and keeps a step-by-step trail (`steps`,
-- the latest 300), so administrators can open a running job and watch it.
-- Read access is unchanged (primary administrators via ai_runs_admin_read);
-- only the server (service_role) can write steps.

alter table public.ai_runs add column if not exists progress text;
alter table public.ai_runs add column if not exists progress_at timestamptz;
alter table public.ai_runs add column if not exists steps jsonb not null default '[]'::jsonb;
alter table public.ai_runs drop constraint if exists ai_runs_progress_check;
alter table public.ai_runs add constraint ai_runs_progress_check check (progress is null or char_length(progress) <= 300);
alter table public.ai_runs drop constraint if exists ai_runs_steps_check;
alter table public.ai_runs add constraint ai_runs_steps_check check (jsonb_typeof(steps) = 'array');

create or replace function public.ai_run_step(p_run uuid, p_text text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_text text := left(btrim(regexp_replace(coalesce(p_text, ''), '[[:cntrl:]]+', ' ', 'g')), 300);
begin
  if p_run is null or v_text = '' then
    return;
  end if;
  update public.ai_runs
     set progress = v_text,
         progress_at = now(),
         steps = (
           select coalesce(jsonb_agg(entry order by ord), '[]'::jsonb)
             from (
               select entry, ord
                 from jsonb_array_elements(steps || jsonb_build_array(jsonb_build_object('at', now(), 'text', v_text))) with ordinality as e(entry, ord)
                order by ord desc
                limit 300
             ) latest
         )
   where id = p_run and status = 'running';
end $$;

revoke all on function public.ai_run_step(uuid, text) from public, anon, authenticated;
grant execute on function public.ai_run_step(uuid, text) to service_role;
