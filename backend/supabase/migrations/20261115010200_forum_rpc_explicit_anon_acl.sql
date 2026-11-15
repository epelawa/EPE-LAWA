-- Supabase's live default privileges grant anon EXECUTE explicitly; PUBLIC-only
-- revocation does not remove that role grant. Preserve capability checks and
-- authenticated staff access while removing unnecessary anonymous invocation.
revoke all on function public.forum_post_moderate(uuid, text, text) from public, anon;
revoke all on function public.forum_report_resolve(uuid, text, text) from public, anon;
grant execute on function public.forum_post_moderate(uuid, text, text) to authenticated;
grant execute on function public.forum_report_resolve(uuid, text, text) to authenticated;
