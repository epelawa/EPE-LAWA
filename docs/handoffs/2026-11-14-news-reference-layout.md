# EPE-LAWA News reference-layout handoff — 14 November 2026

## Done

- Reworked the News listing to follow the owner-provided mobile reference: compact date/search row, clear “Breaking News” heading, one image-led lead story, simple category tabs and compact story rows. Removed the non-reference filter controls and status panel; the accessible search icon remains because it is present in the reference.
- Hid the shared site masthead only on mobile News listing/article routes; desktop navigation remains visible. Article pages use a compact back/share row and image-first title layout. Comments remain sign-in gated.
- Increased reference-style rounding on mobile: the listing/article surface uses a 32px radius, the lead story card 24px, its image clip 16px, and the article hero image 16px. Desktop retains an open page canvas, a 20px lead card and a 14px image clip.
- Captured five responsive widths for both listing and article routes. See [`docs/screenshots/news-reference-layout/2026-11-14/README.md`](../screenshots/news-reference-layout/2026-11-14/README.md) and [`metrics.json`](../screenshots/news-reference-layout/2026-11-14/metrics.json). All ten captures have no horizontal overflow; the listing has zero filter buttons and its search opens at all five widths, and the signed-out comment action is visible in all five article captures.
- Verified with Node 22.23.4 and pnpm 10.34.9: 14/14 focused Node tests passed; app TypeScript check passed; Next.js production build passed; `git diff --check` passed. Screenshots use only the synthetic local story and a Playwright-fulfilled illustration, not production content.
- PR #52 (Radio copy), #53 (Map location prompt) and #55 (member dashboard) were merged by ordinary CLI flow. The latest verified `main` SHA after those merges is `dd0b66615a7ef2c3a12e0977b7a212e9759bcced`.

## Remaining

- The owner has not provided an authorized live-News feed URL. Do not invent or link an external feed; the layout continues to use the existing published-News data path.
- The rounding correction is committed locally and the branch is rebased onto the latest `main`; publish the corrected head and screenshots, then attempt an ordinary merge.
- Verify Production after any merge; Vercel deployment inspection is pending connector authorization.

## Blocked

- GitHub hosted check-run and commit-status endpoints returned HTTP 403 for the previously published PR #54 head. Do not claim hosted checks passed; recheck the exact new head after pushing, and let the ordinary merge path enforce repository rules. Never bypass protections.
- PR #50 must remain open until Production has the required `publication_status` columns on `programmes` and `episodes`.
- No production News feed or environment configuration was changed during this work.

## Resume point

The isolated `fix/news-mobile-reference` branch is already rebased onto `dd0b66615a7ef2c3a12e0977b7a212e9759bcced`. Push the corrected branch with a force-with-lease anchored to the current remote PR #54 head `a010c25f70e7bdc79f53129725cae1393ac4d7c0`; refresh the new exact head/check status; then attempt a normal merge. Do not touch the preserved `/workspace/EPE-LAWA` worktree. Keep the live-feed source pending until the owner supplies an authorized URL.

## Local QA boundary

The app preview used dummy Supabase values and the read-only loopback fixture at `https://127.0.0.1:54322`. The browser route guard allowed loopback app/mock traffic and fulfilled the illustrative image from the synthetic `news-fixture.local` route; other hosts were aborted. No real member records, production content, secrets, or Production environment settings were read or changed.
