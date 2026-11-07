-- News comment workflow hardening. This migration extends the existing comments foundation
-- without changing article publishing, revision, or published-version transitions.
-- Public tombstones are exposed only for published stories; hidden bodies remain private.
drop policy if exists comments_read_tombstones on public.comments;
create policy comments_read_tombstones on public.comments
  for select to anon, authenticated
  using (
    state = 'deleted'
    and exists (
      select 1 from public.articles a
      where a.id = comments.article_id and a.published_version_id is not null
    )
  );

-- Staff resolve reports only after recording a meaningful decision. Actor identity is
-- derived from auth.uid(); neither the client nor an argument can impersonate a reviewer.
create or replace function public.comment_report_resolve(
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
  v_comment_id uuid;
begin
  perform public.require_capability('moderation.review');
  if p_action not in ('actioned', 'dismissed') then
    raise exception using errcode = '22023', message = 'invalid_action';
  end if;
  if coalesce(char_length(btrim(p_reason)), 0) < 5 or char_length(btrim(p_reason)) > 1000 then
    raise exception using errcode = '22023', message = 'reason_required';
  end if;
  select r.comment_id into v_comment_id
    from public.comment_reports r
    where r.id = p_report_id and r.state = 'open'
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'open_report_not_found';
  end if;
  update public.comment_reports
    set state = p_action, resolved_by = v_actor, resolved_at = now()
    where id = p_report_id;
  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
    values (v_actor, 'comment_report', p_report_id, p_action, btrim(p_reason));
  perform public.audit_event('staff', 'comment.report.' || p_action, 'comment', v_comment_id,
    'success', jsonb_build_object('report_id', p_report_id, 'reason', btrim(p_reason)));
end;
$$;
revoke all on function public.comment_report_resolve(uuid, text, text) from public, anon;
grant execute on function public.comment_report_resolve(uuid, text, text) to authenticated;
