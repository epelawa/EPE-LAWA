# News reference-layout QA — 2026-11-13

## What this evidence shows

The candidate redraws `/news` as a source-backed newsroom with the owner-reference order: page heading, featured reporting rail, compact icon-only category filters with accessible names, one-row search, then the recent-story list and honest empty/error guidance. `/news/<slug>` has a responsive editorial hero, publication metadata, reading time derived from the rendered article body, RLS-scoped body loading, related-story links, comments and sharing controls. The clean public slug URL is used for metadata and sharing.

**The cards and article visible in these screenshots are synthetic layout fixtures only.** They are served by a temporary HTTPS mock bound to localhost. The first fixture is explicitly labelled “Isolated layout fixture — not a published Epe story.” None of these headlines, bylines or dates are claims about Epe. No production records were inserted, edited or queried by the screenshot harness, and the browser made no external requests.

## Production baseline and content integrity

The read-only production page at [epelawa.vercel.app/news](https://epelawa.vercel.app/news) was checked on 2026-11-13. It still showed the pre-redesign newsroom and its honest empty state (“The newsroom is being built … When a story is published it appears here …”); no published story cards were returned in that page response. The latest Production deployment at capture time was `dpl_HQPPJWFHfLTftzMoAWiXfcceC7b2`, **READY** from `main` commit `d39acdd703321822d470ebc93c33243786c5f037` (PR #45). This News candidate was not part of that deployment.

## Responsive and interaction checks

A local Next.js **production build** and Chromium Playwright run covered both News routes at **320, 375, 768, 1024 and 1440 CSS px**. Reduced motion was enabled so full-page captures did not depend on scroll-reveal timing. The loopback Supabase mock used a temporary test certificate; no project security rule or production setting was relaxed.

All ten route/viewport checks passed with **zero horizontal overflow**, **zero browser page errors**, **zero browser-console errors**, and **zero external requests**. Playwright checked visible listing/article content, 44px minimum search controls, one-row search alignment, category navigation in an empty state, keyboard reachability at 320px, search preserving the selected category and query, canonical slug metadata, and clipboard copy of the canonical public article URL. The offline-copy and unconfigured-push states remain truthful: offline copies are text-only, and the app does not request notification permission without a verified provider.

Workspace gates on this candidate: `pnpm typecheck` — **5/5 tasks passed**; `pnpm build` — **2/2 app builds passed**; `pnpm test` — **176 total, 175 passed, 0 failed, 1 documented PGlite/PostgreSQL-constraint skip**. These are local results, not hosted CI or hosted-preview checks.

## Screenshots

Each image is a local synthetic fixture capture, not a production screenshot.

| CSS width | News listing | Article |
| ---: | --- | --- |
| 320 | [news-listing-320px.png](news-listing-320px.png) | [news-article-320px.png](news-article-320px.png) |
| 375 | [news-listing-375px.png](news-listing-375px.png) | [news-article-375px.png](news-article-375px.png) |
| 768 | [news-listing-768px.png](news-listing-768px.png) | [news-article-768px.png](news-article-768px.png) |
| 1024 | [news-listing-1024px.png](news-listing-1024px.png) | [news-article-1024px.png](news-article-1024px.png) |
| 1440 | [news-listing-1440px.png](news-listing-1440px.png) | [news-article-1440px.png](news-article-1440px.png) |


**Fresh-session note:** the 320px listing capture also shows the already-merged, site-wide one-time appearance notice. It is dismissible and is not part of the News UI or synthetic story data; the subsequent viewport captures are after that one-time notice has been shown.
