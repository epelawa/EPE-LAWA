# Daily News layout previews — 14 November 2026

This local-only visual QA set covers five reference-inspired page structures: editorial rail, magazine sections, breaking-ranked list, reader-style column, and compact topical navigation. The selector uses the Africa/Lagos calendar date, so visitors see the same layout each day and the layout advances after Lagos midnight.

## Screenshots

`current-news-375.png` is the full-page 375px preview for 14 November 2026. The 25 `*-320.png`, `*-375.png`, `*-768.png`, `*-1024.png`, and `*-1440.png` captures cover every layout at five widths. `current-news-375.json` records the current layout and footer/overflow checks; `metrics.json` contains the full matrix.

## Test data and checks

Story titles, bylines, dates, and the airplane cover image are synthetic local fixtures. The cover image is served by the browser capture script from the reserved `news-fixture.local` test host, while the News API fixture is bound to loopback only. External browser requests were blocked. No production article, account, database, or image data was used or changed.

All 25 viewport captures have a loaded synthetic lead image, no horizontal document overflow, the route-specific News navigation, the small EPE LAWA mark, and no full site footer. The reader-style variant changes typography/layout only; it does not add a bookmark or save action.

## Reproduction

From `/workspace/EPE-LAWA-batch-news`, build the app with local-only dummy Supabase settings and `NEXT_PUBLIC_R2_PUBLIC_BASE_URL=https://news-fixture.local`, run the loopback fixture, start the production build on `127.0.0.1`, then run the local Playwright helper at `/tmp/capture_news_daily.py`. The helper aborts non-local browser requests and asserts the image, layout, footer, and overflow conditions before writing screenshots.
