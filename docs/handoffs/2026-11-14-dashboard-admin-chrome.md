# Dashboard and Admin Chrome Follow-up — 2026-11-14

## Done

- Added a dashboard-only footer-hiding hook covering both normal and fail-closed server-rendered dashboard states; other routes, including News, are unaffected.
- Added regression assertions for the footer rule on all dashboard return paths, kept the member dashboard in the public route manifest, and updated the dashboard shell contract test.
- Captured fresh local `/dashboard` fail-closed screenshots at 320×568, 375×812, 768×1024, 1024×900, and 1440×1000. The expected synthetic “Account service unavailable” state has no visible footer; metrics show zero horizontal overflow and document height equal to the viewport at each width.
- Kept the approved compact admin sign-in, visible disabled Google row, dark/navy palette, and header behavior unchanged. Source inspection found no continuous vertical logo sway or page-owned black strip, so no speculative edits were made.

## Validation

- Pinned Node 22.23.4 / pnpm 10.34.9 full repository tests: **189 passed, 0 failed, 1 documented PGlite extension skip**.
- Production builds for both `@epelawa/main` and `@epelawa/admin`: **passed**; Next build includes TypeScript checking.
- Dashboard viewport checks: 320, 375, 768, 1024, and 1440 CSS pixels; footer computed `display:none` and height `0` at every width; no horizontal overflow.
- No Production Supabase, real member data, or deployment was used. The screenshot build used deliberately invalid local configuration and the browser blocked all non-loopback requests.

## Remaining

- Review and commit only the focused dashboard source/tests/route-manifest/screenshots/docs changes on the existing PR #56 branch; push through the authorized connector.
- Refresh PR #56’s exact pushed head and hosted checks. Attempt a normal non-bypass merge only if exact-head checks are verifiably healthy; otherwise keep the PR open and report the access/check blocker.

## Blocked / scope notes

- No synthetic authenticated member session is available in this local run, so the authenticated dashboard layout is not screenshot-verified; screenshots show only the fail-closed configuration-error state.
- The one skipped PGlite test is already documented: `btree_gist` is unavailable in that local test setup, so two exclusion constraints are not exercised.
- No page-owned black strip was found. Phone status/navigation/address bars, if present in a device screenshot, are outside page CSS. The approved dark auth palette remains intentional.
- No Vercel or Production verification was performed.

## Resume point

In `/workspace/EPE-LAWA-dashboard-admin-chrome`, inspect the pending diff and branch status, commit and push the dashboard-only follow-up, refresh PR #56’s exact head/checks, and merge only through the ordinary non-bypass path if the hosted checks are healthy. Do not touch the preserved `/workspace/EPE-LAWA` worktree or the separate News branch.