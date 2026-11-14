# News reference-layout QA — 14 November 2026

These screenshots verify the mobile-first News listing and article layout against the owner-provided reference. They are local synthetic previews, not production captures. The story title is explicitly marked as a local fixture, and its plane illustration is supplied by the screenshot route interceptor.

## Listing screenshots

| Width | Screenshot |
|---:|---|
| 320px | [news-listing-320px.png](news-listing-320px.png) |
| 375px | [news-listing-375px.png](news-listing-375px.png) |
| 768px | [news-listing-768px.png](news-listing-768px.png) |
| 1024px | [news-listing-1024px.png](news-listing-1024px.png) |
| 1440px | [news-listing-1440px.png](news-listing-1440px.png) |

## Article screenshots

| Width | Screenshot |
|---:|---|
| 320px | [news-article-320px.png](news-article-320px.png) |
| 375px | [news-article-375px.png](news-article-375px.png) |
| 768px | [news-article-768px.png](news-article-768px.png) |
| 1024px | [news-article-1024px.png](news-article-1024px.png) |
| 1440px | [news-article-1440px.png](news-article-1440px.png) |

[metrics.json](metrics.json) records the measured widths and key UI checks. All 10 screenshots have `documentWidth === viewportWidth` (no horizontal overflow). The listing has 0 filter buttons at all five widths and the accessible headline search opens; the signed-out comment action is present in all five article captures. The shared navigation remains on desktop and is hidden only on mobile News listing/article routes to match the reference.

## Fixture and network boundary

The app preview used dummy Supabase values and the read-only loopback mock at `https://127.0.0.1:54322`. The illustrative cover image was fulfilled by Playwright from the `news-fixture.local` route. The route guard allowed only loopback app/mock traffic and that synthetic image route, aborting all other hosts. No production News, member data, secrets, or remote media were used.
