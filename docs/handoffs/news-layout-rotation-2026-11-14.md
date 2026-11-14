# News layout rotation handoff — 14 November 2026

## Done

- Added a pure layout selector driven by the Africa/Lagos calendar date. All visitors receive the same layout on a given day; the selector advances at Lagos midnight, not UTC midnight. `/news` remains request-time rendered so the daily layout is not frozen at build time.
- Added five structurally distinct, reference-inspired presentations that all use the same published-only feed: editorial rail, magazine sections, breaking-ranked rows, reader-style column, and compact topic navigation. Category links remain real links; the reader-style variant does not imply an unimplemented save/bookmark action.
- Added a News-specific Home/News navigation. On narrow screens the global masthead is hidden on News routes so the reference layout has a compact header; News listing and article routes omit the full footer and retain only a small EPE LAWA mark.
- Captured 25 local synthetic-data screenshots at 320/375/768/1024/1440px across all five layouts, plus the full-page 375px current-day layout. The synthetic airplane cover is served through a fake local host; external browser requests are blocked. No Production article or member data was read or written.
- All 25 captures show a loaded synthetic lead image, no horizontal overflow, the News navigation and the small bottom mark, and no global footer. See `artifacts/news-layout/README.md` and `artifacts/news-layout/metrics.json`.

## Validation

- Pinned Node `22.23.4` / pnpm `10.34.9`.
- News-focused suite: `node --test frontend/tests/news-daily-layout.test.mjs frontend/tests/news-listing.test.mjs frontend/tests/news-feature-readiness.test.mjs frontend/tests/news-comments.test.mjs` — **PASS, 22 tests** on the final pinned Node/pnpm rerun.
- Main-app TypeScript check — **PASS**.
- Main-app production build — **PASS**; `/news` and `/news/[slug]` remain dynamic routes.
- `git diff --check` — **PASS**.
- Visual matrix: **25/25** responsive views passed image-load, no-overflow and footer/navigation assertions; current-day 375px full-page capture also passed.

## Remaining

- Refresh this branch against the latest verified GitHub `main`, rerun exact-head local validation and final screenshots, then open its separate focused PR. No merge has been attempted.
- Hosted checks must be checked on the exact pushed SHA; an inaccessible or 403 check result is not healthy. Do not merge until exact-head checks are verified and any repository-wide failures are resolved or explicitly approved.
- Re-run the full repository suite after rebasing. Earlier runs on the older base reported an unrelated dashboard-markup assertion; do not carry that as current status without rechecking.

## Blocked / safety

- No live-feed URL/source was supplied, so none is invented or linked.
- The only stories/images in these screenshots are synthetic test fixtures; no Production News, member, or database records were used.
- Gmail SMTP belongs in Supabase Auth settings and is still blocked on the owner's private credentials. Do not configure it in Vercel.
- Database migrations and Production writes remain out of scope until the separate backup/schema safety review clears them.

## Resume

1. Verify this worktree is still based on the same content and the synthetic local fixture is only a test artifact.
2. Fetch the latest authorized `main` and rebase this branch without touching the preserved `/workspace/EPE-LAWA` worktree.
3. Re-run the focused suite, main-app typecheck/build, full tests, and screenshot matrix.
4. Push/open one News-rotation PR, verify the exact head and hosted check status, then use an ordinary non-bypass merge only after checks are healthy.
