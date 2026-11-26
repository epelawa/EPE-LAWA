# Route audit artefacts

| Path | What it is |
|---|---|
| `audit.mjs` | Sweep: 46 paths × 10 viewports, recording status, overflow, h1 count, <44 px targets, Lorem, duplicate provider, progress bars, on-air claims and console errors, with viewport screenshots |
| `interactions.mjs` | Search dialog, Notification Centre, onboarding and `/search` redirect checks (375 and 1440) |
| `forum-flows.mjs` | Forum thread, composer, reaction and floating-widget checks (320, 375 and 1440) |
| `forum-fixture.mjs` | **Audit-only** overlay: synthetic forum rows in front of the smoke stub. Not used by CI |
| `before-data/`, `after-data/` | Populated runs (stub mode `stories`) for `4bea03d` and this branch: `metrics-*.json` (460 rows each) plus 17 key routes × 10 screenshots |
| `after-news-many/` | `/news` and the author page with many categories and stories (rail stress test) |
| `before-readfail/`, `after-readfail/` | Metrics only, with every server-side DB read failing (a degraded-state comparison) |
| `interactions/`, `forum/` | JSON results and state screenshots |

## Reproduce
1. Build: `pnpm run build` in `frontend/apps/main`, with `NEXT_PUBLIC_SUPABASE_URL` pointing at an **https** proxy in front of `frontend/tests/browser-smoke/supabase-stub.mjs`. `next start` refuses http Supabase URLs; the stub listens on `[::1]:54321`.
2. Start: `next start --hostname 0.0.0.0 --port 3100`.
3. Sweep: `BASE=http://127.0.0.1:3100 MODE=stories node docs/route-audit/audit.mjs <outDir> <label> all`.
4. Interactions: `node docs/route-audit/interactions.mjs docs/route-audit/interactions`.
5. Forum: run `node docs/route-audit/forum-fixture.mjs` (listens on `[::1]:54331` and forwards to the stub), point the https proxy at 54331, then run `node docs/route-audit/forum-flows.mjs docs/route-audit/forum`.

The scripts expect a Chromium at `/tmp/chr/chrome.sh`; edit `executablePath` for your machine. Run them from the repo root so `@playwright/test` resolves.
