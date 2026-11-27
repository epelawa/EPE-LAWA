-- Support tickets (public intake, private staff desk, AI assistant) and
-- per-job autopilot schedules. Idempotent: safe to run again.

-- ---------------------------------------------------------------------------
-- Support tickets
-- ---------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^EPE-[A-Z0-9]{6}$'),
  access_hash text not null check (access_hash ~ '^[a-f0-9]{64}$'),
  requester_name text not null check (char_length(btrim(requester_name)) between 2 and 120),
  requester_email text not null check (char_length(requester_email) between 5 and 254),
  requester_user_id uuid null references auth.users(id) on delete set null,
  category text not null default 'general' check (category in ('general','account','technical','business','advertising','news','privacy','other')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','awaiting_customer','in_progress','resolved','closed')),
  subject text not null check (char_length(btrim(subject)) between 3 and 160),
  assigned_to uuid null references auth.users(id) on delete set null,
  ai_summary text null check (ai_summary is null or char_length(ai_summary) <= 1000),
  needs_human boolean not null default false,
  last_message_at timestamptz not null default now(),
  last_customer_message_at timestamptz not null default now(),
  resolved_at timestamptz null,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_kind text not null check (author_kind in ('customer','staff','ai','system')),
  author_user_id uuid null references auth.users(id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 8000),
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_status_idx on public.support_tickets (status, last_customer_message_at);
create index if not exists support_tickets_requester_user_idx on public.support_tickets (requester_user_id);
create index if not exists support_tickets_assigned_to_idx on public.support_tickets (assigned_to);
create index if not exists support_ticket_messages_ticket_idx on public.support_ticket_messages (ticket_id, created_at);
create index if not exists support_ticket_messages_author_idx on public.support_ticket_messages (author_user_id);

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
-- No policies: the public reaches tickets only through the server (service role,
-- after checking the private link), and staff only through the functions below.
revoke all on public.support_tickets from anon, authenticated;
revoke all on public.support_ticket_messages from anon, authenticated;

-- Staff list (newest activity first within each status group).
create or replace function public.staff_support_list(p_status text default null)
returns table (
  id uuid, reference text, requester_name text, requester_email text, category text, priority text, status text,
  subject text, needs_human boolean, ai_summary text, assigned_to uuid, last_message_at timestamptz,
  last_customer_message_at timestamptz, created_at timestamptz, message_count bigint, last_author text
)
language plpgsql security definer set search_path to '' as $$
begin
  if not coalesce(public.staff_enquiry_authorized(), false) then
    raise exception using errcode = '42501', message = 'support_forbidden';
  end if;
  return query
    select t.id, t.reference, t.requester_name, t.requester_email, t.category, t.priority, t.status, t.subject,
      t.needs_human, t.ai_summary, t.assigned_to, t.last_message_at, t.last_customer_message_at, t.created_at,
      (select count(*) from public.support_ticket_messages m where m.ticket_id = t.id and not m.internal),
      (select m.author_kind from public.support_ticket_messages m where m.ticket_id = t.id and not m.internal order by m.created_at desc, m.id desc limit 1)
    from public.support_tickets t
    where p_status is null
       or (p_status = 'active' and t.status in ('open','in_progress','awaiting_customer'))
       or (p_status = 'attention' and (t.needs_human or t.status = 'open'))
       or t.status = p_status
    order by case t.priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
      t.last_message_at desc
    limit 200;
end $$;

create or replace function public.staff_support_get(p_id uuid)
returns jsonb
language plpgsql security definer set search_path to '' as $$
declare v jsonb;
begin
  if not coalesce(public.staff_enquiry_authorized(), false) then
    raise exception using errcode = '42501', message = 'support_forbidden';
  end if;
  select jsonb_build_object(
    'ticket', to_jsonb(t) - 'access_hash',
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'author_kind', m.author_kind, 'body', m.body, 'internal', m.internal, 'created_at', m.created_at,
        'author_email', (select u.email from auth.users u where u.id = m.author_user_id)) order by m.created_at, m.id)
      from public.support_ticket_messages m where m.ticket_id = t.id), '[]'::jsonb)
  ) into v from public.support_tickets t where t.id = p_id;
  perform public.audit_event('staff', 'support.view', 'support_ticket', p_id, 'success', '{}'::jsonb);
  return v;
end $$;

-- A staff reply (emailed by the server) or an internal note; returns who to email.
create or replace function public.staff_support_reply(p_id uuid, p_body text, p_internal boolean, p_status text)
returns jsonb
language plpgsql security definer set search_path to '' as $$
declare v public.support_tickets;
begin
  if not coalesce(public.staff_enquiry_authorized(), false) then
    raise exception using errcode = '42501', message = 'support_forbidden';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 2 and 8000 then
    raise exception using errcode = '22023', message = 'invalid_body';
  end if;
  if p_status is not null and p_status not in ('open','awaiting_customer','in_progress','resolved','closed') then
    raise exception using errcode = '22023', message = 'invalid_status';
  end if;
  insert into public.support_ticket_messages (ticket_id, author_kind, author_user_id, body, internal)
    values (p_id, 'staff', auth.uid(), btrim(p_body), coalesce(p_internal, false));
  update public.support_tickets set
    status = coalesce(p_status, case when coalesce(p_internal, false) then status else 'awaiting_customer' end),
    needs_human = case when coalesce(p_internal, false) then needs_human else false end,
    assigned_to = coalesce(assigned_to, auth.uid()),
    last_message_at = case when coalesce(p_internal, false) then last_message_at else now() end,
    resolved_at = case when coalesce(p_status, '') in ('resolved','closed') then now() else null end,
    revision = revision + 1
  where id = p_id returning * into v;
  if v.id is null then
    raise exception using errcode = '40001', message = 'support_conflict';
  end if;
  perform public.audit_event('staff', case when coalesce(p_internal, false) then 'support.note' else 'support.reply' end, 'support_ticket', p_id, 'success', jsonb_build_object('status', v.status));
  return jsonb_build_object('reference', v.reference, 'requester_name', v.requester_name, 'requester_email', v.requester_email, 'subject', v.subject, 'status', v.status);
end $$;

create or replace function public.staff_support_update(p_id uuid, p_status text, p_priority text, p_category text, p_assign_me boolean)
returns void
language plpgsql security definer set search_path to '' as $$
declare v_id uuid;
begin
  if not coalesce(public.staff_enquiry_authorized(), false) then
    raise exception using errcode = '42501', message = 'support_forbidden';
  end if;
  if (p_status is not null and p_status not in ('open','awaiting_customer','in_progress','resolved','closed'))
     or (p_priority is not null and p_priority not in ('low','normal','high','urgent'))
     or (p_category is not null and p_category not in ('general','account','technical','business','advertising','news','privacy','other')) then
    raise exception using errcode = '22023', message = 'invalid_value';
  end if;
  update public.support_tickets set
    status = coalesce(p_status, status),
    priority = coalesce(p_priority, priority),
    category = coalesce(p_category, category),
    assigned_to = case when coalesce(p_assign_me, false) then auth.uid() else assigned_to end,
    needs_human = case when p_status in ('resolved','closed') then false else needs_human end,
    resolved_at = case when p_status in ('resolved','closed') then now() when p_status is not null then null else resolved_at end,
    revision = revision + 1
  where id = p_id returning id into v_id;
  if v_id is null then
    raise exception using errcode = '40001', message = 'support_conflict';
  end if;
  perform public.audit_event('staff', 'support.update', 'support_ticket', p_id, 'success',
    jsonb_build_object('status', p_status, 'priority', p_priority, 'category', p_category, 'assign_me', coalesce(p_assign_me, false)));
end $$;

revoke all on function public.staff_support_list(text) from public, anon;
revoke all on function public.staff_support_get(uuid) from public, anon;
revoke all on function public.staff_support_reply(uuid, text, boolean, text) from public, anon;
revoke all on function public.staff_support_update(uuid, text, text, text, boolean) from public, anon;
grant execute on function public.staff_support_list(text) to authenticated;
grant execute on function public.staff_support_get(uuid) to authenticated;
grant execute on function public.staff_support_reply(uuid, text, boolean, text) to authenticated;
grant execute on function public.staff_support_update(uuid, text, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- AI: the support job, per-job schedules, no local request cap
-- ---------------------------------------------------------------------------
alter table public.ai_runs drop constraint if exists ai_runs_job_check;
alter table public.ai_runs add constraint ai_runs_job_check
  check (job = any (array['news','enquiries','businesses','ads','moderation','admin_logs','support','tick']));

alter table public.ai_settings add column if not exists job_schedules jsonb not null default '{}'::jsonb;
alter table public.ai_settings add column if not exists job_last_due jsonb not null default '{}'::jsonb;
do $$ begin
  alter table public.ai_settings add constraint ai_settings_job_schedules_object check (jsonb_typeof(job_schedules) = 'object');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ai_settings add constraint ai_settings_job_last_due_object check (jsonb_typeof(job_last_due) = 'object');
exception when duplicate_object then null; end $$;

-- The owner asked for no local cap: the AI works while OpenRouter accepts requests.
update public.ai_settings set daily_request_budget = 10000 where id = 1 and daily_request_budget < 10000;
-- The support assistant starts on, like the enquiry assistant.
update public.ai_settings set capabilities = capabilities || jsonb_build_object('support_reply', coalesce((capabilities ->> 'enquiry_reply')::boolean, true))
  where id = 1 and not (capabilities ? 'support_reply');

create or replace function public.ai_job_schedules_save(p_schedules jsonb, p_support_enabled boolean)
returns void
language plpgsql security definer set search_path to '' as $$
declare k text; v jsonb; v_email text;
begin
  if not coalesce(public.staff_roles_authorized(), false) then
    raise exception using errcode = '42501', message = 'ai_settings_forbidden';
  end if;
  if p_schedules is null or jsonb_typeof(p_schedules) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_schedules';
  end if;
  for k, v in select * from jsonb_each(p_schedules) loop
    if k not in ('moderation','enquiries','support','businesses','admin_logs','ads')
       or jsonb_typeof(v) <> 'object'
       or coalesce(v ->> 'mode', '') not in ('pass','interval','times','off')
       or coalesce((v ->> 'minutes')::int, 0) not between 5 and 10080
       or jsonb_typeof(coalesce(v -> 'times', '[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(v -> 'times', '[]'::jsonb)) > 24 then
      raise exception using errcode = '22023', message = 'invalid_schedule';
    end if;
  end loop;
  update public.ai_settings
     set job_schedules = p_schedules,
         capabilities = capabilities || jsonb_build_object('support_reply', coalesce(p_support_enabled, false))
   where id = 1;
  select email into v_email from auth.users where id = auth.uid();
  insert into public.ai_activity (job, action, outcome, title, details, actor_id)
    values ('schedule', 'schedules.update', 'done', 'Job schedules saved by ' || coalesce(v_email, 'an administrator'), jsonb_build_object('schedules', p_schedules, 'support_reply', coalesce(p_support_enabled, false)), auth.uid());
end $$;
revoke all on function public.ai_job_schedules_save(jsonb, boolean) from public, anon;
grant execute on function public.ai_job_schedules_save(jsonb, boolean) to authenticated;
