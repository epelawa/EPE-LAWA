# Route visual review

Screenshots were captured from the production build in headless Chromium, which emulates each viewport size; this is **not** real-device testing. Viewports: 320×740, 360×800, 375×812, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1440×900, 1920×1080. Captures are viewport-height (above the fold plus the first scroll).

| Folder | Content |
|---|---|
| `docs/route-audit/before-data/screens/` | Baseline `4bea03d`: 17 key routes × 10 viewports |
| `docs/route-audit/after-data/screens/` | This branch: the same 17 routes × 10 viewports |
| `docs/route-audit/after-news-many/screens/` | `/news` and the author page with many categories and stories (rail stress test), × 10 |
| `docs/route-audit/forum/screens/` | Thread (member, own bubble), failed send, and listing at 320, 375 and 1440 (audit-only forum fixture) |
| `docs/route-audit/interactions/screens/` | Search, Notification Centre and onboarding states at 375 and 1440 |

Key routes: news, news article, news author, radio, radio archive, forum, forum/new, invalid forum thread, Ìtàn Ilú Mi, Ìtàn correction, Who is Who, invalid person, map, business directory, invalid business, tourism, newsletter unsubscribe.

Metrics for all 46 routes are in the `metrics-*.json` files. The full 460-image sets were generated but not committed, to keep the repo light (about 26 MB each).

## What was checked, route by route

| Route | Before | After |
|---|---|---|
| `/news` | No overflow; tab rail OK with 2 categories | No overflow at any width with many categories (`after-news-many/news-320.jpg`). The rail scrolls on its own, with the last tab cut at the edge as a scroll cue and an inset focus ring |
| `/news/smoke-market-story` | Renders | Unchanged; no overflow at 320 (`after-data/screens/news_smoke-market-story-320.jpg`) |
| `/radio` | Red "On air now: station programming"; provider named in a long sentence | A neutral grey dot with truthful copy; one provider credit; 44 px Mute. **Note:** at 375 the title truncated one character earlier ("Radio Lag…") because Mute grew, so the station name now wraps to 2 lines at ≤480 px (applied after the `after-data` capture, verified in the build) |
| `/itan-ilu-mi/correction` | 404 | Back link, eyebrow, h1, explanation and the 3-step list, then the private form. Comfortable at 320 |
| `/itan-ilu-mi` | Inline form at the top | Archive first, with a single "Request a correction or removal" button |
| `/forum` and `/forum/thread/*` | The stub had no forum data, so the honest "could not be loaded" state | With the audit fixture: chat bubbles, the member's own bubble on the right in Royal Steel, initials avatars, 44 px Support and Report, and a docked composer. The failed send shows the alert above the composer while the draft stays (`forum/screens/thread-send-failed-375.png`) |
| Invalid slugs | Error panel with an h2 title | Same visual; the title is now the page h1 |
| `/who-is-who/[slug]` | No fixture | The error state is verified; the person-head and action row are verified in code and CSS (`btn-compact`, wraps at 320) |
| `/map` | Map area blank (CSP) | The OSM iframe loads (0 console errors) |
| `/tourism` | Tiny caption links | 44 px caption targets with no visual size change |

## Known visual limitations
- Fixture images point at `images.example.com`, which does not resolve in the sandbox, so image slots show the placeholder or logo.
- In screenshots the header shows "Sign in" even for the fixture member. The client-side session read is CORS-blocked by the local stub. Server-rendered member UI (own bubbles, composer) is correct.
