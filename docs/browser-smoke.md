# Public browser smoke

This is a small Playwright smoke gate for the public homepage and News shell. It is not the full Playwright release suite described in [Testing and Acceptance](11-testing-acceptance.md); in particular, it does not satisfy the eight-module, member-authentication, staff-publishing, privacy, or release E2E gates.

## Run locally

From a clean checkout, install dependencies and Chromium, then run the CI command:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
pnpm test:browser-smoke
```

The CI-ready command is `pnpm test:browser-smoke`. It starts the public app and its local fixture server itself. To save representative homepage and News screenshots at 320px and 1440px:

```sh
SMOKE_SCREENSHOT_DIR=/tmp/epe-lawa-smoke SMOKE_EVIDENCE_LABEL=local pnpm test:browser-smoke
```

To run the same harness against another local commit or worktree, set `SMOKE_APP_DIR` to that checkout's absolute path. The test harness remains in the current checkout; only the public app process is launched from the alternate directory.

## What it checks

The suite opens the homepage and News at 320, 375, 768, 1024, and 1440 CSS pixels. It checks route headings and navigation, keyboard operation and focus restoration in the mobile drawer at 320/375/768/1024, desktop Discover-dropdown keyboard behavior, a News search with no matches, unavailable/error states, reduced-motion CSS behavior, and horizontal overflow on the public shells and no-results/error screens. At 320/375px it requires a `Mobile primary navigation` landmark with exactly four links—Home, News, Discover, and Account—checks `/news` uses `aria-current="page"`, activates Home by keyboard and Discover by touch, and verifies the last footer link is not obscured. Forum is intentionally not a fifth tab; the existing mobile drawer must keep its `/forum` link available.

The mobile-navigation cases run on `/news`, where the owner-approved contract requires the bar; they must fail if it is missing, has the wrong four links/current-page state, or covers content. The owner-approved contract hides the bar on `/` and retains it on `/news`, `/tourism`, and authenticated `/dashboard`; this shell smoke checks the News case only, so the other route states remain separate acceptance gates. Locators follow the current `Primary navigation` and `Mobile primary navigation` landmarks and the current Discover dropdown; they must not be changed to bypass keyboard, route, link-count, active-state, or content-overlap assertions.

The dedicated `.github/workflows/browser-smoke.yml` runs on pull requests and pushes to `main`, installs Chromium, runs this command, and uploads representative screenshots as an artifact.

## Data safety and limits

The harness starts an HTTP fixture on `localhost:54321` and launches the app with a cleared environment containing only a local Supabase URL, an explicitly synthetic placeholder key, and non-secret runtime settings. The fixture returns empty arrays for public article/category reads or a deterministic 503 response; it holds no real records, has no production credentials, and refuses PostgREST write methods. It is not a Supabase emulator and proves nothing about production schema, RLS, network providers, or database behavior. No production endpoint or data is used.

There is no isolated test account or approved synthetic auth/staff fixture in this lane, so login, email verification/recovery, protected staff routes, publishing, capability checks, and authorization boundaries are intentionally not exercised. Manual screen-reader, zoom/reflow, full keyboard, and broader accessibility review also remain outstanding. Do not represent this shell smoke as completion of the full acceptance plan.
