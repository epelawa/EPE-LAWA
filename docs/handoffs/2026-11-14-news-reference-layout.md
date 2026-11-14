# EPE-LAWA News reference-layout handoff — 14 November 2026

## Done

- Reworked the News listing to follow the owner-provided mobile reference: compact date/search row, clear “Breaking News” heading, one image-led lead story, simple category tabs and compact story rows.
- Removed the non-reference filter controls and status panel. The accessible search icon remains because it is present in the reference.
- Hid the shared site masthead only on mobile News listing/article routes; desktop navigation remains visible. Article pages use a compact back/share row and image-first title layout. Comments remain sign-in gated.
- Captured five responsive widths for both listing and article routes. See [`docs/screenshots/news-reference-layout/2026-11-14/README.md`](../screenshots/news-reference-layout/2026-11-14/README.md) and [`metrics.json`](../screenshots/news-reference-layout/2026-11-14/metrics.json).
- Verified on Node 22.23.4 and pnpm 10.34.9: 15/15 focused Node tests passed; app TypeScript check passed; Next.js production build passed; `git diff --check` passed. Playwright metrics show zero horizontal overflow at all 10 captures, zero filter buttons on all five listing widths, the search form opening at all five listing widths, and the signed-out comment action present in all five article captures.

## Pending

- The owner has not provided an authorized live-news feed URL. Do not invent or link an external feed; the layout uses the existing published News data path.
- Verify the exact GitHub PR head and hosted checks after publishing this branch.

## Blocked

- Do not merge unless exact-head hosted checks are verifiably healthy through the ordinary merge path. If the check rollup remains inaccessible, leave the PR open and report the access blocker; do not bypass checks.
- No production News feed source was configured or changed during this work.

## Resume point

Refresh the News branch against the latest verified `main`, confirm the pushed PR head and hosted check results, then use an ordinary merge only if every required check is accessible and passing. Keep the live-feed source pending until the owner supplies an authorized URL.

## Local QA boundary

The screenshots use only a synthetic story and a Playwright-fulfilled illustration. The local app used dummy Supabase values and the loopback-only read-only fixture at `127.0.0.1:54322`; the browser route guard aborted requests to all other hosts. No real member records, production content, secrets, or Production environment settings were read or changed.
