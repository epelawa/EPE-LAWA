-- 20261203120000_map_correction_review_queue.sql never applied in full before (its
-- map_correction_decide grant failed), so the form_rate_limit grants it contained for
-- anon and authenticated never took effect anywhere. Now that the chain applies, restore
-- the locked access control every other migration and the rate-limit tests expect: only
-- service_role may call this security definer throttle.
revoke all on function public.form_rate_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.form_rate_limit(text,text,integer,integer) to service_role;
