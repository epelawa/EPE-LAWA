-- EPE LAWA — system backup capabilities (forward-only).
--
-- Adds the capability vocabulary for the staff backup workspace. Reference data only:
-- no grant is issued here, so no account gains backup or restore rights by shipping this file.
-- The owner grants these keys to specific staff roles after the migration is applied.
--
-- The application fails closed: has_capability('backup.*') returns false until the key
-- exists AND is granted. Nothing in this file touches production data.

insert into public.capabilities (key, description) values
  ('backup.read',    'List available R2 database backups and their metadata'),
  ('backup.create',  'Request an on-demand database backup to R2'),
  ('backup.restore', 'Restore the live database from a verified R2 backup')
on conflict (key) do nothing;
