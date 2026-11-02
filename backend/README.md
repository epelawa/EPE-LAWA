# Backend

The local staff-access foundation consists of `packages/auth` and an **unapplied** Supabase migration under `supabase/migrations`. The migration creates no staff accounts or grants and is tested only against an ephemeral simulated Postgres environment, not an actual Supabase project.

Admin is deliberately unavailable. Login, session management, role assignment, audit, database provisioning, storage and email are not implemented or configured. See [the staff-access handoff](../docs/14-staff-access-foundation.md) before applying a migration or enabling admin. Do not add seed scripts, demo records or credentials.
