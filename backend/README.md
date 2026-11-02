# Backend

The staff-access foundation consists of `packages/auth` and a Supabase migration under `supabase/migrations`. Migration `20261102133703` has been applied to the owner-confirmed production project. It created no staff accounts or grants. RLS, privileges, policies and empty tables were inspected on the project; end-to-end provider security testing remains outstanding, and automated behavioural tests use ephemeral simulated Postgres.

Admin is deliberately unavailable. Login, session management, role assignment, audit, database provisioning, storage and email are not implemented or configured. See [the staff-access handoff](../docs/14-staff-access-foundation.md) before applying a migration or enabling admin. Do not add seed scripts, demo records or credentials.
