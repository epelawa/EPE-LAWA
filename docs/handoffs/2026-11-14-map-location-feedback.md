# Map location prompt — handoff (2026-11-14)

## Done

- Preserved the authorized map-location patch on `fix/location-prompt-copy` after safely fast-forwarding from `origin/main` at `e5c9bde21b82d555f486ac3356592f6e31007b29`. The branch was 12 commits behind and had zero unique commits before synchronization.
- Location remains click-only. The click handler clears any stale coordinate, rejects insecure contexts and unsupported geolocation, and requests a single current position (10-second timeout). Permission denied, timeout, and other errors report concise manual-search fallback. Device coordinates remain in component state only and are included in an external directions link only after an explicit user click; the revised notice avoids claiming Google Maps/Places is EPE LAWA-powered.
- Focused test command: `./node_modules/.bin/tsx --conditions=react-server --test frontend/tests/map-navigation.test.mjs` — PASS, 6/6 tests.
- Main-app TypeScript command: `./node_modules/.bin/tsc --noEmit -p frontend/apps/main/tsconfig.json` — PASS.
- Responsive signed-out preview screenshots (local app on 127.0.0.1:3102; dummy Supabase values; Chromium external hostnames blocked) and their viewport/limitations README are in `docs/screenshots/map-location-feedback/2026-11-14/`.

## Pending

- Stage only `frontend/apps/main/app/map/map-search.tsx`, `frontend/tests/map-navigation.test.mjs`, `docs/screenshots/map-location-feedback/2026-11-14/`, and this handoff; commit with author `EPE LAWA <info.epelawa@gmail.com>`.
- Push using the authorized GitHub connector with a transient askpass, open one focused PR if none exists, refresh its exact head, and inspect exact-head hosted checks. Keep PR open if hosted rollup is unknown/inaccessible. Do not merge.

## Blocked

- Required exact toolchain was unavailable: runtime is Node `v24.22.1`, pnpm `11.25.0`; expected Node `22.23.4`, pnpm `10.34.9`. `corepack` is not installed. Attempted `pnpm exec` and `pnpm typecheck` via the available pnpm but its install/lifecycle guard failed on ignored `esbuild@0.28.2` build scripts. Direct focused test and direct `tsc` did pass.
- `pnpm typecheck` via Turbo also failed for the same pnpm install guard in `@epelawa/main`; use the direct tsc result above, not Turbo's incomplete report.
- Screenshots are page-load captures only; no permission behavior was interactively exercised. Preview was signed out because no synthetic authenticated fixture was present.

## Resume point

1. Confirm current changes/status in `/workspace/EPE-LAWA-map-polish` on `fix/location-prompt-copy`.
2. If possible, provision the exact requested Node/pnpm versions without persistent config changes, rerun focused tests and typecheck.
3. Review the staged path list strictly, commit, push without force with connector askpass, create/locate one PR, and fetch the exact current PR head plus hosted check rollup. Do not merge.

Screenshot paths: `docs/screenshots/map-location-feedback/2026-11-14/map-320px.png`, `map-375px.png`, `map-768px.png`, `map-1024px.png`, and `map-1440px.png`; README: `docs/screenshots/map-location-feedback/2026-11-14/README.md`.