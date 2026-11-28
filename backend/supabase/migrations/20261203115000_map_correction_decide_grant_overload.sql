-- Forward-only repair for the grant in 20261203120000_map_correction_review_queue.sql:
-- that migration grants and revokes an eight-argument map_correction_decide overload
-- while its own definition has nine arguments, so a fresh apply fails at the grant and
-- no recorded database can carry the broken version. Historical migrations are never
-- edited in place, so this earlier migration provides exactly the overload the grant
-- names. The stub is not callable; the later cleanup migration removes it.
create or replace function public.map_correction_decide(
  p_submission_id uuid, p_decision text, p_place_name text, p_details text,
  p_latitude numeric, p_longitude numeric, p_source_note text, p_source_url text
) returns uuid language plpgsql security definer set search_path = '' as $stub$
begin
  raise exception using errcode = '0A000', message = 'map_correction_decide_overload_is_not_callable';
end;
$stub$;
revoke all on function public.map_correction_decide(uuid,text,text,text,numeric,numeric,text,text) from public, anon;
