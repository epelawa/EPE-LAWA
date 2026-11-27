# Responsiveness audit (turn 5, non-admin routes)

**Tool:** `scripts/responsive-audit.mjs` (Playwright + Chromium) against a production `next build` with fixture data.

**What it measures:** for every route × viewport it records
- document `scrollWidth` > `clientWidth` (horizontal overflow);
- elements whose box escapes the viewport;
- overlaps between fixed chrome (Support, forum FAB, mini-player, storage notice, bottom nav);
- interactive targets smaller than 24×24 px.

**Routes (28):** `/`, `/news`, `/about`, `/advertise`, `/contact`, `/support`, `/business-directory`, `/business-directory/submit`, `/business-directory/fixture-business-1`, `/business-directory/fixture-business-3` (long name), `/events`, `/forum`, `/gallery`, `/guidelines`, `/itan-ilu-mi`, `/itan-ilu-mi/correction`, `/map`, `/photo-credits`, `/privacy`, `/terms`, `/radio`, `/radio/programmes`, `/radio/reminders`, `/tourism`, `/who-is-who`, `/newsletter`, `/login`, `/forgot-password`.

**Viewports (22):** 320×568, 320×640, 360×740, 360×800, 375×812, 390×844, 412×915, 414×896, 430×932, 640×360, 740×360, 844×390, 600×960, 768×1024, 820×1180, 1024×768, 1280×720, 1366×768, 1440×900, 1536×864, 1920×1080, 2560×1440 (the owner matrix plus 412).

## Findings before the fixes
| # | Finding | Root cause |
|---|---|---|
| 1 | Horizontal overflow at 740×360 (and 701–770 px) on `/`, `/news`, `/about` | Footer `.listingInner` grid tracks had fixed minimums (200 + 300 + 140 px + gaps). |
| 2 | Forum "new thread" FAB overlapped the Support button at ≥1024 px | Both were anchored at the same bottom-right corner. |
| 3 | `/radio` content was capped at 1160 px inside a dark band | `.site-main` max-width applied to the full-bleed page. |
| 4 | The range slider was stretched to full width with an input border | The global input rule did not exclude `type="range"`. |
| 5 | Consent checkboxes measured 20×20 px (`/itan-ilu-mi`, `/itan-ilu-mi/correction`, `/tourism`) | No minimum size on labelled checkboxes. |
| 6 | Compact filter rows were ragged (44 / 52 / 46 px controls) and wrapped on Who is Who | Mixed control heights from the global input rule. |
| 7 | Business profile left an empty main column when a listing has no description | Fixed two-column grid. |

## Result after the fixes
**616 route × viewport combinations, 0 findings, 0 load errors** (`/tmp/audit-after.json` in the sandbox; re-run with the command in the test report).
