# Dashboard / admin chrome screenshots — 2026-11-14

Local-only browser captures from `http://127.0.0.1:3126`; viewport widths are 320, 375, 768, 1024, and 1440 CSS pixels (900px tall). No live services or user data were used.

Admin sign-in screenshots: `admin-login-{320,375,768,1024,1440}.png`. They show the centered branded sign-in panel and disabled “Continue with Google / Coming Soon” row. The screen uses the approved cloud/Navy/Cobalt palette; no unintended black page band was found.

Dashboard screenshots: `dashboard-{320,375,768,1024,1440}.png`. No synthetic authenticated session is configured in this local checkout, so `/dashboard` is session-gated and redirects to member sign-in; these images document the unauthenticated gate, not the authenticated dashboard layout. The dashboard-only footer regression is covered by a source test. For comparison, the page selector is narrowly scoped and News pages are unaffected.

The black status/navigation/address bars visible in phone screenshots belong to Android/Chrome UI and are outside page CSS.

## Handoff

- **Done:** created `fix/dashboard-admin-chrome` from exact `origin/main` SHA `5ce245beeb23c8ea972c7ea9700ad747321fa2e5` in a fresh worktree; dashboard's inherited site footer is now hidden only when `.member-dashboard-shell` is present. Inspected shared brand and admin sign-in styles: no continuous vertical logo movement is present. Inspected admin sign-in: dark palette is intentional and compact one-screen composition/disabled Google row are preserved. No auth/security behavior changed.
- **Remaining:** commit, push, and open one focused PR; do not merge. Re-run screenshots on authenticated dashboard only if a local synthetic Supabase session fixture becomes available.
- **Blocked:** full local suite has one unrelated failing legacy assertion in `frontend/tests/ui-rebuild.test.mjs` requiring every non-admin page to use generic `PageFrame|AccountShell|InformationPage|public-home|LinkIssueView`; existing dashboard intentionally uses a bespoke member shell. Local authenticated synthetic member session is unavailable. `pnpm` install/check stops on its ignored `esbuild` build-script policy; direct `tsc` and direct tests work. Git HTTPS without `gh` connector credentials is unavailable; use authenticated GitHub connector CLI for push/PR.
- **Resume:** in `/workspace/EPE-LAWA-dashboard-admin-chrome`, inspect `git status` (discard any generated lock/config changes), run focused regression tests, use `"$MANUS_CONFIG_HOME/connectors/github/gh"` for authenticated GitHub actions, push branch and open a focused PR. Do not modify News routes or merge.