# Approved News covers and linked attribution

Updated 2026-11-15 07:24 WAT. Isolated branch `feat/news-approved-cover-attribution-20261115`, combined with main `b34b42f9e86ed3d3cfb4989c2b3038b069363e70` (published-version body binding).

## Done

A bounded two-item catalog serves exact-byte copies of the owner-approved Commons covers: Welcome to Epe by DemoBebz and Epe Express Road by Benbeezy, both CC BY-SA 4.0. SHA-256 regression checks protect the original files; their source/license/author metadata is retained in the catalog and asset README. No watermarks, crop or image edits were introduced.

Canonical Admin create/edit screens expose an optional approved-cover selector. Server actions reject unknown nonempty keys and pass the selected key through create/save/revision RPCs. The editor reads its saved key from the current article version, not a nonexistent article column. Public article pages display the full image with contain sizing, illustrative-location captions, linked author/source credit and a separate CC BY-SA license link. Listing and related images also use contain. Non-catalog media URL resolution retains the existing R2 behavior. The separately merged safe published-body helper remains intact.

Pinned Node 22.23.5 / pnpm 10.34.9 forced workspace builds and typechecks pass. Combined complete suite: 263 tests, 262 passed, zero failed, one existing skip. Log: `/tmp/news-cover-final-combined-gates.log`. Six cover regressions include actual catalog/media helpers, invalid/prototype keys, exact asset hashes and editor import/saved-key correctness.

Loopback-only production-build visual assertions pass for both public covers and linked licenses at 320, 390, 430, 768 and 1440px, with zero horizontal overflow and exact published-version fetches. Separate canonical Admin new/edit fixtures verify the two catalog choices, selection and saved-key retention at all five widths. Artifacts and measurements: `docs/screenshots/approved-covers/2026-11-15/` (Admin captures under `admin/`). Loading/reveal transitions are allowed to finish before final screenshots.

## Remaining and resume point

Ordinary focused PR merge without bypass, verify byte-identical updated main and exact Production SHA plus asset hashes, then use authenticated Admin to create/publish only owner-approved Drafts 1 and 2 with their exact copy/covers. Verify public copy, attribution, edit and unpublish/republish; leave both published. Draft 3 remains on hold. No schema, environment, account or production content change belongs to this code patch. Full-platform schema gaps remain tracked separately and are not declared complete.
