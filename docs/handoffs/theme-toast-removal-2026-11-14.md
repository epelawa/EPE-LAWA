# Theme notice cleanup

Updated 2026-11-14, 18:19 UTC.

## Done

Removed the automatic “Device theme applied” overlay and its unused event/storage plumbing. Device theme detection, explicit theme persistence, the drawer toggle and genuine connection notices remain intact. No backend or configuration dependency is introduced.

Validation on this branch: public and admin `next build --webpack` both passed including TypeScript; `node --test --test-concurrency=1 frontend/tests/*.mjs` passed 184/184; `git diff --check` passed. All builds/tests used localhost Supabase placeholders, not Production records.

Screenshots: `artifacts/theme-toast/home-mobile-dark.png` (390×844) and `home-desktop-dark.png` (1440×1000), captured from the local production build with dark scheme and reduced motion through Python Playwright. Both rendered the visible homepage heading and reported zero page errors. Earlier failed development captures were replaced, not used as evidence.

## Remaining

Ordinary exact-head PR merge and deployment verification.

## Blocked

None for this UI-only change. Database repair and other feature branches are separate.

## Resume

Review the focused PR and merge through the ordinary GitHub path without bypass flags. No Production database, Auth or environment-variable changes are part of this PR.
