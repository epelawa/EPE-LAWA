# Map location prompt — handoff (2026-11-14)

## Done

The authorized implementation and tests are committed on `fix/location-prompt-copy`; the branch was safely fast-forwarded from `origin/main` at `e5c9bde21b82d555f486ac3356592f6e31007b29` after confirming it had 12 behind and zero unique commits. Location remains click-only. The click handler clears stale coordinates, rejects insecure contexts and unsupported geolocation, requests one current position with a 10-second timeout, and reports concise manual-search fallback for denied, timeout, and unavailable outcomes. Coordinates remain in component state only and are included in an external directions link only after an explicit link click. The service disclosure is trimmed and factual.

Focused test command `./node_modules/.bin/tsx --conditions=react-server --test frontend/tests/map-navigation.test.mjs` passed 6/6. Direct main-app TypeScript command `./node_modules/.bin/tsc --noEmit -p frontend/apps/main/tsconfig.json` passed. Responsive signed-out captures and README are in `docs/screenshots/map-location-feedback/2026-11-14/`. Preview used `127.0.0.1:3102`, dummy Supabase values, and Chromium hostname blocking for all non-loopback hosts.

A focused open PR was created: https://github.com/epelawa/EPE-LAWA/pull/53. Its refreshed head was `07ee19213ca9c67a339062cdd81a4030fbc725f4`, matching local `HEAD` at time of inspection. PR remained OPEN.

## Pending

Refresh the PR head and hosted checks after any subsequent commit. Keep the PR OPEN and do not merge unless the hosted rollup becomes readable and all applicable checks pass. Do not make Production changes.

## Blocked

The exact toolchain was unavailable: runtime Node `v24.22.1`, pnpm `11.25.0`; requested Node `22.23.4`, pnpm `10.34.9`. `corepack` was absent. The available pnpm attempts failed because its install/lifecycle guard blocked ignored `esbuild@0.28.2` build scripts. Direct focused test and direct `tsc` passed, but Turbo `typecheck` did not complete for the main package due to the same guard.

Hosted check rollup is inaccessible through the GitHub connector: both `gh pr view ... statusCheckRollup` and `gh pr checks 53` returned `GraphQL: Resource not accessible by integration`. Exact PR metadata (`headRefOid`, URL, state) remained readable. No merge was attempted. Screenshots are signed-out page-load captures; location permission was intentionally not exercised, and no synthetic authenticated fixture was available.

## Resume point

First refresh PR #53 metadata/head and hosted check rollup via an authorized check interface. If the rollup is still unavailable, leave it open and report that limitation. If exact Node/pnpm versions become available, rerun focused test and typecheck; otherwise retain the successful direct checks and clearly note the version deviation. Screenshots: `docs/screenshots/map-location-feedback/2026-11-14/map-320px.png`, `map-375px.png`, `map-768px.png`, `map-1024px.png`, and `map-1440px.png`; README: `docs/screenshots/map-location-feedback/2026-11-14/README.md`.