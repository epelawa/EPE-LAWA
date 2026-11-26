# EPE LAWA homepage — baseline (before any change)

Recorded 2026-11-26 on branch `arena/1a336494-epe-lawa`, base commit `7f6bdcf` (merge of PR #272).
Nothing in this file describes work done in this task. It records what was there when the task started.

## How the baseline was captured

| Source | What it shows | Limits |
| --- | --- | --- |
| Source code at `7f6bdcf` | Component tree, CSS, data reads | — |
| `fetch_page` of `https://epelawa.vercel.app/` (text only) | The live hero copy, radio panel, "No stories published yet" news state, community panel, storage notice. The support dialog markup also showed up in the extracted text. | The sandbox cannot open a TLS connection to `epelawa.vercel.app` (`curl` fails with `SSL_ERROR_SYSCALL`). So **no screenshots, Lighthouse or axe runs were made against production**. |
| Local production build (`next build --webpack` + `next start`) against the repo's own Supabase fixture (`frontend/tests/browser-smoke/supabase-stub.mjs`), modes `stories`, `empty` and `error` | Screenshots at 7 viewports, axe-core 4.x, Lighthouse 13, keyboard order, request logs | Synthetic fixture stories, not real content. The fixture runs behind a local TLS proxy because production mode rejects `http://localhost` Supabase URLs. Chromium is the `@sparticuz/chromium` build (Chromium 158), headless. |

Screenshots: `docs/homepage-audit/screenshots/before/` (JPEG, curated subset; full JSON reports for all 21 runs) and `before-supabase-unavailable/`.

### Live vs repository

The text from the live page matches the repository's hero, radio, news-heading, community and storage-notice copy word for word. The live newsroom showed **"No stories published yet"** on 2026-11-26. The README says it had real stories on 2026-11-21. I could not tell from here whether the stories were unpublished or whether the read returned no rows; I made no database reads. The visual output of production could not be compared.

## Stack

- Next.js 16.4.5 (App Router, webpack build), React 19.3, TypeScript 5.9, Tailwind 3 (barely used: utilities plus hand-written CSS), pnpm 10 + Turborepo monorepo.
- Public app is `frontend/apps/main`. `frontend/packages/ui` provides the design tokens (`tokens.css`), the self-hosted Plus Jakarta Sans variable font (`fonts.css`), `ui.css`/`forms.css` and form primitives.
- Data comes from Supabase (`@supabase/ssr`), read on the server. `layout.tsx` sets `force-dynamic`, so every request is rendered fresh.
- Analytics: the Plerdy click-tracking bootstrap is injected in `<head>` unless `BROWSER_SMOKE_TEST=true`. Cloudflare Turnstile loads only when a site key is set.
- No animation library. Motion is CSS, plus an IntersectionObserver `Reveal` component.
- Icons are hand-written inline SVG in `components/icons.tsx`.

## Homepage route and component hierarchy

`app/page.tsx` (server component) is rendered inside `app/layout.tsx`:

```
RootLayout (shared)
├─ SiteMotion, ScrollToTop, ScrollProgress, ToastRegion, SlashFocus, NotificationSoundListener (shared, global)
├─ a.skip-link
├─ SiteHeader (shared, client)      — blue masthead, News + 3 <details> dropdowns, bell (RadioReminder), Sign in, Join CTA, drawer
├─ main#main.site-main
│  └─ Home (page.tsx)  div.public-home
│     ├─ StructuredData (WebSite + Organization JSON-LD)
│     ├─ section.home-hero  → HeroCarousel (client; 54 credited photos, autoplay 7.2 s)  → eyebrow, H1, lede, 2 CTAs
│     ├─ Suspense → HomeBreaking → HomeBreakingTicker (client; polls /api/live/home every 60 s)
│     ├─ HomeSectionReveal → div.home-discovery
│     │  ├─ section.home-radio  (Radio Lagos 107.5 FM, "Listen to radio")
│     │  └─ nav.home-shortcuts "Explore EPE LAWA" (News, Radio, History, Forum, Business, Events) — CSS `order:-1` puts it visually above the radio panel
│     ├─ HomeSectionReveal
│     │  ├─ Suspense(HomeNewsSkeleton) → HomeNews (3 latest published stories, live pill, empty/error states)
│     │  └─ section.home-community.connection-panel ("Good things begin with connection.", Create an account, guidelines)
│     ├─ HomeSectionReveal → div.home-poll → Suspense → SitePoll (server; active poll or null)
│     └─ CookieBanner (client; homepage-only storage notice, localStorage `epelawa_cookie_consent`)
├─ SiteFooter → NewsFooter listing (shared; identity, social links, quick links, categories, paused newsletter form)
├─ AuthenticatedMobileNavigation (only for signed-in members, not shown on /)
├─ Connectivity (shared offline notice)
└─ FloatingSupport (shared; draggable "Support" pill + native <dialog>)
```

### Homepage-only vs shared

| Homepage only | Shared |
| --- | --- |
| `app/page.tsx`, `hero-logo.css`, `connection-panel.css`, `home-client-refresh.css`, `components/hero-carousel.tsx`, `home-sections.tsx`, `home-breaking-ticker.tsx` (+ module CSS, also used on `/news` through `breaking-news.tsx`), `cookie-banner.tsx`, `site-poll.tsx`, `lib/home-data.ts`, `lib/hero-images.json` | `site-header.tsx` + `navigation-refinement.css`, `news-footer.tsx`, `floating-support.tsx`, `news-image.tsx`, `article-byline.tsx`, `home-live-pill.tsx` (also `/news`), `reveal.tsx`, `globals.css`, `native-controls.css`, `notice-refinement.css`, `lib/i18n-messages.ts`, `lib/structured-data.ts` |

## Design language at baseline

- Palette: the owner-approved cobalt set (Midnight `#0A1023`, Navy `#17264A`, Royal Steel `#294B91`, Cobalt `#477FE0`, Ice Blue `#A7C5F5`, Cloud `#F1F4FA`, Silver, Border) through tokens. The homepage CSS also hard-codes many near-palette hexes (`#071936`, `#dce3ee`, `#52627b`, `#e3ebf8`, …).
- Type: Plus Jakarta Sans everywhere; the display and body faces are the same. The hero H1 is `clamp(2.4rem,4.5vw,4.6rem)`, weight 800.
- Three homepage stylesheets are stacked as layered "refresh" passes. Many rules are declared 2–4 times. In `home-client-refresh.css` alone, `.home-shortcuts a` is restyled four times (white → gradient colours → white again). The later rules win, and the earlier ones are dead weight.
- Radii: 7, 12, 14, 17, 18 and 40px pills are all used on one page, against a token set of 8/12/pill.

## Responsive strategy at baseline

- Breakpoints are scattered: 600, 640, 700, 767, 800 and 960px.
- `globals.css` gives `main` and `.site-main` `padding-inline: var(--gutter)` below 640px **and** gives `.site-main` `max-width: 1160px` from 1024px up. On the homepage this means:
  - **≥1024px**: the hero photo is boxed at 1160px. A pale column runs down the middle of a dotted page background, while the header and footer are full width.
  - **<640px**: content inside `.ep-container` is inset twice (16px main padding plus 16px container margin). The shortcut tiles start 32px from the screen edge on a 360px phone, and the hero photo has 16px side gutters.

## Interactions inventory (baseline)

Skip link · brand link · News link · 3 `<details>` nav dropdowns · bell (radio reminder) · Sign in · Join the community · drawer menu button (focus trap, Esc, outside click, focus return) · hero CTAs ×2 · hero carousel autoplay (pauses on hover, focus, hidden tab, reduced motion or save-data; no visible controls) · breaking ticker links (marquee, paused on focus/hover/reduced motion) · 6 shortcut tiles · radio CTA · live "new stories" pill (polls; refreshes on click) · story cover/title/"Read story" links ×3 · "View all news" · Create an account · guidelines link · poll vote form (only when a poll is active) · storage notice "Got it" / Privacy notice · footer social links, quick links, topics · newsletter form (disabled: `NEWSLETTER_SIGNUP_ENABLED` is not true) · Support pill (drag handle + dialog).

## Initial technical observations

1. `SitePoll` calls `createClient()` and `auth.getUser()` with no `try/catch`. Every other homepage data read is guarded. Any Supabase configuration or network failure in the poll reaches `app/error.tsx` and **replaces the entire homepage** with "This page couldn't be loaded". Reproduced locally (`before-supabase-unavailable/*.jpg`, React error #441 in the console).
2. Loading copy: "One moment / Finding your page / Loading the latest available information" lives in `app/loading.tsx`, the route-level Suspense fallback shared by every route. Its markup is emitted in the initial HTML stream for `/` and is replaced by the homepage within the same response (`curl` shows both). No persistent loading text was observed in any screenshot after content resolved. The homepage's own news fallback is a section-specific skeleton.
3. The hero carousel downloads the outgoing slide's **WebP** copy on every rotation, after the AVIF copy has already been shown. Prefetching also takes its width from the current slide (one slide is only 640px wide), which leads to wrong-size prefetches. Measured: `rot.mjs` request log in `HOMEPAGE_AUDIT.md`.
4. Header dropdowns draw two chevrons: the inline SVG plus a global `details > summary::after` chevron from `native-controls.css`.
5. axe-core reports `label-content-name-mismatch` (serious) on `.nav-brand`. Its accessible name is "EPE LAWA home", but the visible text is "EPE LAWA The Voice of Epe Division" (WCAG 2.5.3).
6. DOM order and visual order differ in `.home-discovery`: the radio panel comes first in the DOM but is drawn below the shortcuts (WCAG 2.4.3 / 1.3.2).
7. When there is no breaking news, the shortcut tiles sit directly against the bottom of the hero.

## Regression risks to manage

- Many source-regex unit tests (`frontend/tests/*.test.mjs`) pin exact homepage CSS strings and copy, for example `home-shortcuts a:nth-child(6)` and `.home-story-list--3 { grid-template-columns: minmax(0, 2fr) … }`. Restructuring needs matching, deliberate test updates.
- The Playwright smoke specs depend on: the H1 text "Stay Connected, Stay Informed", the H2 "Latest News", the link "Read latest news", the "newsroom is unavailable" heading, carousel attributes (`aria-roledescription`), autoplay behaviour, the news skeleton (`.home-news-skeleton__card` ×3) and `.home-hero__content` centred text.
- Shared header, footer and support widget changes reach every public page.
- Baseline test state (before any edit): `pnpm test:node` **409/423 pass, 14 fail**; `pnpm test:unit` (vitest) **149/153 pass, 4 fail**; `tsc --noEmit` passes; `next build` passes. The failing tests are listed in `HOMEPAGE_TEST_REPORT.md`. None are caused by this task.
