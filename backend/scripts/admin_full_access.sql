-- =========================================================================
-- EPE LAWA — grant a full administrator every capability that exists.
-- =========================================================================
-- Purpose: make the named staff accounts able to use every admin surface
-- (newsroom, business, people, radio, tourism, advertising, site content,
-- orders, moderation, audit, staff management) without hunting for
-- individual capability errors.
--
-- How to run
--   1. Open the Supabase SQL editor.
--   2. Edit the EMAILS list in the first line of the DO block below.
--      Any account that already has admin.access is picked up as well
--      when the auto-mode row is uncommented.
--   3. Run the script. It is idempotent — re-running changes nothing that
--      is already in place, and existing columns/keys are untouched.
--
-- The script grants directly in staff_capability_grants, which is the
-- mechanism our sites use (postgrest "admin" surface), so new grants are
-- evaluated on the very next request. No restart is needed.
-- =========================================================================

with targets as (
  -- OPTION A (explicit): list exact emails here.
  select u.id as user_id, lower(u.email) as email
  from auth.users u
  where lower(u.email) = any (array['info.epelawa@gmail.com']::text[])

  -- OPTION B (auto): every account that already holds admin.access.
  -- Uncomment the select below and comment out Option A to use it.
  -- union
  -- select g.user_id, lower(u.email) from staff_capability_grants g join auth.users u on u.id = g.user_id where g.capability = 'admin.access'
),
granted as (
  insert into public.staff_capability_grants (user_id, capability)
  select t.user_id, 'admin.access' from targets t
  on conflict (user_id, capability) do nothing
  returning 1
)
insert into public.staff_capability_grants (user_id, capability)
select t.user_id, c.key
from targets t
cross join public.capabilities c
on conflict (user_id, capability) do nothing;

-- Summary of what each target admin now holds (one row per admin).
select lower(u.email) as email, count(g.capability) as capabilities_held
from auth.users u
join staff_capability_grants g on g.user_id = u.id
group by 1
order by 1;
