-- EPE LAWA — staff queue for radio song requests (forward-only).
--
-- Requests are member-private rows; the radio desk reads them and records what
-- was played through these RPCs, gated by radio.manage and audited.

create or replace function public.staff_song_requests(p_state text default 'open', p_limit integer default 50)
returns table (id uuid, song text, note text, status text, created_at timestamptz, programme_name text, member_email text)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not public.has_capability('radio.manage') then
    raise exception using errcode = '42501', message = 'request_forbidden';
  end if;
  return query
  select r.id, r.song, r.note, r.status, r.created_at, p.name, au.email
  from public.radio_song_requests r
  left join public.programmes p on p.id = r.programme_id
  left join auth.users au on au.id = r.user_id
  where (p_state = 'all' or r.status in ('new', 'queued'))
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

grant execute on function public.staff_song_requests(text, integer) to authenticated;

create or replace function public.staff_song_request_decide(p_request_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_capability('radio.manage') then
    raise exception using errcode = '42501', message = 'request_forbidden';
  end if;
  if p_status not in ('queued', 'played', 'declined') then
    raise exception using errcode = '22023', message = 'request_status_invalid';
  end if;
  if not exists (select 1 from public.radio_song_requests where id = p_request_id) then
    raise exception using errcode = '22023', message = 'request_unknown';
  end if;
  update public.radio_song_requests
    set status = p_status, updated_at = now()
    where id = p_request_id;
  perform public.audit_event('staff', 'radio.request_decide', 'radio_song_request', p_request_id, 'success',
    jsonb_build_object('status', p_status));
end;
$$;

grant execute on function public.staff_song_request_decide(uuid, text) to authenticated;
