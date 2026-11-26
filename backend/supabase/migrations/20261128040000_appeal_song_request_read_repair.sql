-- EPE LAWA — repair read policies on moderation appeals and song requests. Forward-only.
--
-- Same production drift as 20261128030000: both tables carried an
-- `*_auth_select USING (true)` policy instead of the repo's own-or-staff policy,
-- and `authenticated` had no SELECT grant, so the staff Appeals page could never
-- list appeals. Restore the policies from 20261123030000 (a member reads their own
-- rows; staff with the matching capability read all), then grant SELECT so the
-- policy, not a missing grant, is what limits access. Writes remain RPC-only.

drop policy if exists moderation_appeals_auth_select on public.moderation_appeals;
drop policy if exists moderation_appeals_own_select on public.moderation_appeals;
create policy moderation_appeals_own_select on public.moderation_appeals
  for select to authenticated
  using (user_id = auth.uid() or public.has_capability('moderation.review'));

drop policy if exists radio_song_requests_auth_select on public.radio_song_requests;
drop policy if exists radio_song_requests_own_select on public.radio_song_requests;
create policy radio_song_requests_own_select on public.radio_song_requests
  for select to authenticated
  using (user_id = auth.uid() or public.has_capability('radio.manage'));

revoke all on public.moderation_appeals from anon;
revoke all on public.radio_song_requests from anon;
grant select on public.moderation_appeals to authenticated;
grant select on public.radio_song_requests to authenticated;
