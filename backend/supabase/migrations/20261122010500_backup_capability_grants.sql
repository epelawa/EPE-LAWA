-- EPE LAWA — backup capability grants (forward-only, least privilege).
--
-- Grants backup.read and backup.create to the existing Developer staff role so the
-- admin backup workspace is reachable by an active verified staff member with that
-- role. backup.restore is deliberately granted to no role: restore stays a
-- primary-administrator-only path (the fixed primary admin emails satisfy
-- has_capability directly), with the typed key match, db-restore.yml dispatch and
-- the production-restore GitHub environment approval as additional gates.
-- Reversible by deleting the matching staff_role_capabilities rows.

insert into public.staff_role_capabilities (role_id, capability)
select r.id, c.capability
  from public.staff_roles r
  join (values ('backup.read'), ('backup.create')) as c(capability) on true
 where r.name = 'Developer'
on conflict (role_id, capability) do nothing;
