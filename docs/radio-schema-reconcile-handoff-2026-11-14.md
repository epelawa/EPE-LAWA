# Radio publication-state reconciliation — handoff, 2026-11-14

## Exact payload

`backend/supabase/migrations/20261114141000_radio_publication_state_reconcile.sql` is the forward-only reconciliation candidate for the Production Radio schema drift. It adds `publication_status` to programmes, episodes and schedule; hardens staff capability predicates; replaces Radio read policies with published-only visibility; and adds rights-record and audit structures. It contains no row deletion or database reset.

The accepted visibility effect is material: existing Radio rows receive the new `draft` default and may become hidden from public reads until a staff member publishes them. The owner reviewed and approved this exact migration as written, including that effect, at 17:36 CET on 2026-11-14.

## Approval and safety boundary

The approval is for later application only. Do not apply the migration until the required backup/restore rehearsal and release gates are cleared. No Production SQL, database, user record, or Radio row has been changed. Do not merge the dependent published-only application PR until the columns exist in Production and the normal merge checks are healthy.

## Current blockers

PR #50 (`fix/radio-published-only`) remains open and is still blocked by the missing Production publication-status columns. Its current GitHub state also reports a merge conflict. The approved migration is currently a local candidate; keep it separate from the application change so the schema payload can be reviewed and applied in the proper order.

## Resume

After the backup/restore rehearsal and release authorization, publish the migration as a focused PR, apply it through the normal forward-only Supabase migration process, verify the applied ledger and schema, and only then resolve the PR #50 conflict and run its exact-head checks. Confirm any existing Radio catalogue entries that should be public are republished after migration.
