-- Add atomic, capability-checked resolution for staff forum report queue.
-- Existing forum_post_moderate remains the only post mutation path.
create or replace function public.forum_report_resolve(
  p_report_id uuid,
  p_action text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_post_id uuid;
begin
  perform public.require_capability('moderation.review');
  if p_action is null or p_action not in ('hide', 'restore', 'dismiss') then
    raise exception using errcode = '22023', message = 'invalid_action';
  end if;
  if coalesce(char_length(btrim(p_reason)), 0) < 5 or char_length(btrim(p_reason)) > 1000 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;
  select r.post_id into v_post_id
  from public.forum_reports r
  where r.id = p_report_id and r.state = 'open'
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'open_report_not_found';
  end if;

  if p_action in ('hide', 'restore') then
    perform public.forum_post_moderate(v_post_id, p_action, btrim(p_reason));
    update public.forum_reports set state = 'actioned', resolved_by = v_actor, resolved_at = now()
    where id = p_report_id;
  else
    update public.forum_reports set state = 'dismissed', resolved_by = v_actor, resolved_at = now()
    where id = p_report_id;
    insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
    values (v_actor, 'forum_report', p_report_id, 'dismiss', btrim(p_reason));
  end if;

  perform public.audit_event('staff', 'forum.report.resolve', 'forum_report', p_report_id,
    'success', jsonb_build_object('action', p_action, 'post_id', v_post_id));
end;
$$;

revoke all on function public.forum_report_resolve(uuid, text, text) from public;
grant execute on function public.forum_report_resolve(uuid, text, text) to authenticated;
