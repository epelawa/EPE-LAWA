# Radio publication-state reconciliation — handoff, 2026-11-14

## Exact payload and review

`backend/supabase/migrations/20261114141000_radio_publication_state_reconcile.sql` is the forward-only reconciliation for Production Radio schema drift. It adds `publication_status` to programmes, episodes and schedule; hardens staff capability predicates; replaces Radio read policies with published-only visibility; and adds rights-record and catalogue-audit structures. It contains no row deletion or database reset.

The material visibility effect is explicit: existing Radio rows receive the new `draft` default and may become hidden from public reads until a staff member republishes them. The owner reviewed and approved this exact SQL as written, including that effect, at 17:36 CET on 2026-11-14.

A focused migration-only PR is open as [PR #66](https://github.com/epelawa/EPE-LAWA/pull/66). The local PGlite regression passed **4/4**; it verifies rows remain present as drafts, public reads fail closed until publication, active staff retain access, invalid states are rejected, and re-running the migration is safe.

## Approval and safety boundary

The owner’s approval is for later application only. Do not apply or merge this migration until the required backup/restore rehearsal and release gates are cleared. No Production SQL, database, user record or Radio row has been changed. The owner also approved the auth rate-limit and admin user-management migrations for later application; they remain unapplied as well.

## Current blockers

PR #50 (`fix/radio-published-only`) remains open and blocked because the Production publication-status columns are missing; GitHub also reports a merge conflict on that PR. Keep it separate from PR #66. Do not merge the dependent application change until the schema migration has been applied and verified, the conflict resolved, and exact-head checks are healthy. Vercel Production authorization is still pending.

## Resume

After the backup/restore rehearsal and release authorization, merge/apply the approved migration through the normal forward-only Supabase path, verify the applied ledger and schema, and only then resolve PR #50 and re-run its exact-head checks. Confirm any existing Radio catalogue entries intended for public display are republished after migration.
