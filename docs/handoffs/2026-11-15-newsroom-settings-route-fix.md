# Newsroom settings route fix — handoff

**Timestamp:** 2026-11-15 07:03 WAT (UTC+01:00)
**Branch:** `fix/admin-newsroom-settings-route-20261115`
**Base:** `origin/main` at `f3383b953cc3587448e9f8efebe2b95d17b84b47`

## Scope and implementation

The main app exposes staff pages under `/admin` by re-exporting canonical pages from `frontend/apps/admin`. The link to `/admin/newsroom/settings` and the canonical settings page already existed, but the same-origin protected route wrapper did not. Added `frontend/apps/main/app/admin/(protected)/newsroom/settings/page.tsx`, which re-exports the existing canonical page, and added `/admin/newsroom/settings` to `frontend/apps/main/public/manus-routes.json` to keep the public route inventory aligned. No settings implementation, cover/editor/rendering code, auth logic, database schema/data, or production service was changed.

Expanded `frontend/tests/admin-newsroom-settings.test.mjs` with regression coverage for the wrapper default export and its resolved target, existing protected layout, and canonical `article.publish` check. Existing settings links, data handling and migration assertions remain in the test.

## Verification

Verified with Node.js **22.23.5** and pnpm **10.34.9** (dependency install used `--frozen-lockfile`):

- Focused `admin-newsroom-settings.test.mjs`: **3/3 passed**.
- `pnpm typecheck`: **5/5 tasks passed**.
- `pnpm build`: **2/2 app builds passed**; output lists `/admin/newsroom/settings` in the main app route table.
- Full `pnpm test`: **254 total, 253 passed, 0 failed, 1 documented PGlite exclusion-constraint skip**.
- `git diff --check`: passed.

Build used only synthetic `https://epe-settings-route.invalid` Supabase URL and placeholder key; no production requests, accounts or data were used. Parent agent owns review, release and any integration actions; no commit, push, PR, merge, or deployment was performed.

## Parent canonical-path verification — 07:10 WAT

The actual main app (not standalone Admin) served `/admin/newsroom/settings` against an HTTPS loopback-only synthetic Auth/reference-data fixture. Captures at320/390/430/768/1440px show zero document overflow and fully revealed categories/bylines. Mobile390 capture visually inspected. All non-loopback browser requests blocked; no Production data or real account used. Evidence in `docs/screenshots/canonical-newsroom/2026-11-15/`. Ordinary PR and deployment acceptance remain.
