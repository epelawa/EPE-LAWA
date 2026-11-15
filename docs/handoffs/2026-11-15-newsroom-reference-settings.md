# Newsroom categories and bylines

Checkpoint: 2026-11-15 01:33 WAT, base main `82167c8` (Radio PR #87 normally merged and additive schema applied).

## Done

Added `/admin/newsroom/settings` with clear links from the Newsroom and New article screens. Publishing-capable verified staff can create/update categories and credited bylines, deactivate a category for new drafts, and see truthful saved/conflict/error states. Existing article versions and reference rows are not deleted. No capability/role is assigned to any person. The same `article.publish` check is enforced inside security-definer, empty-search-path RPCs; anonymous execution is explicitly denied and changes are audited. The migration uses verified live category/author columns, not missing timestamp fields.

Pinned Node22.23.5/pnpm10.34.9 exact combined gates passed: forced builds2/2, forced typechecks5/5, full252 total251passed0failed1existing PGlite constraint skip. Dedicated reference RPC behavior and UI contract tests cover unauthorized denial, create/update, duplicate slug handling and audit.

Five-width synthetic captures at320/390/430/768/1440 show zero document overflow. All below-fold reveal sections were scrolled into view with instant scrolling before capture; no pending reveals remain. The390 capture was visually checked to contain both category and byline controls. No Production content/accounts or external requests were used. See `docs/screenshots/newsroom-settings/2026-11-15/`.

## Remaining / resume

Commit/push one focused PR, ordinary merge with no bypass, fresh live reference/helper preflight, apply only `20261115011000_newsroom_reference_settings.sql`, then verify ACL/ledger/route deployment. Authorized live reference creation and the two previously approved private drafts still require a staff session; no reference rows or articles were seeded here. No reset, destructive SQL or migration-history rewrite.
