# Radio catalogue authoring reconciliation

Checkpoint: 2026-11-15 01:24 WAT. Base `29c01dd` (PRs #85 and #86 normally merged).

## Done

Live read-only preflight confirmed programmes, episodes and radio_schedule exist with publication_status but lack created_at, updated_at and revision; radio_authoring_save is absent. The additive `20261115010500_radio_live_schema_authoring_reconcile.sql` supplies those metadata fields, indexes, guarded timestamp triggers and a capability-checked, revision-aware authoring RPC. It preserves catalogue content and publication state, requires a rights note for published saves, retains private rights evidence and records an audit event. Explicit anon/PUBLIC EXECUTE is revoked. The existing fixed 107.5 station player is unchanged; no new station, stream, programme or episode is seeded.

Production-shaped PGlite behavior verifies existing rows/statuses retained; all three Admin read queries; new draft programme/schedule and published episode with rights evidence; revision conflicts; no-rights rejection; denied anonymous execution and safe rerun. Combined full suite: 247 total, 246 passed, 0 failed, 1 existing PGlite exclusion-constraint skip. Forced builds2/2 and typechecks5/5 passed using Node22.23.5/pnpm10.34.9. SQL-only source change; no UI screenshot applicable.

## Remaining / resume

Ordinary focused PR/merge, fresh catalogue/helper/rights preflight, apply exact reviewed SQL and verify metadata, ACL, ledger and live routes. Staff save requires an authorized staff session; no live test catalogue content will be created. No reset, DROP, TRUNCATE, destructive data change or migration-history rewrite.
