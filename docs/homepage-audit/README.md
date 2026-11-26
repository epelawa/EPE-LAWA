# Homepage audit artifacts

- `screenshots/before/`, `screenshots/after/`: curated JPEGs and the full JSON reports (axe, keyboard order, metadata, notice/hero boxes) for 7 viewports × 3 fixture modes.
- `screenshots/before-supabase-unavailable/`: the P0 full-page error boundary.
- `lighthouse/*.json`: compact Lighthouse summaries (made with `lh-summary.mjs`).
- Harness scripts. They expect the app on `http://127.0.0.1:3100`, the fixture stub on `:54321`, and a Chromium path inside the scripts that you adjust locally:
  - `audit.mjs <label> <mode>`: screenshots + axe + keyboard + drawer checks
  - `lcp2.mjs`: LCP entries over a 52 s idle session
  - `rot.mjs`: hero image request log
  - `cls.mjs`: layout-shift sources
  - `probe.mjs`: DOM measurements (gap above footer, drawer contents)

The audit used a production build. Production rejects `http://` Supabase URLs, so the fixture was served through a local HTTPS proxy. See `HOMEPAGE_TEST_REPORT.md`.
