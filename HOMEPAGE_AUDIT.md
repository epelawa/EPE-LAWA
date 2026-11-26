# EPE LAWA homepage audit

Scope: `/` in `frontend/apps/main` only. Date: 2026-11-26. Baseline: `AUDIT_BASELINE.md`.
Evidence: `docs/homepage-audit/` (screenshots, axe/keyboard reports, Lighthouse summaries, harness scripts).

**How to read this file.** Each finding is labelled with how it was established:

- **[measured]**: reproduced with a tool run (Playwright, axe-core, Lighthouse, request log, build or test output). The artifact is named.
- **[observed]**: seen in a screenshot or the live page text and checked by a person (me), with no metric attached.
- **[judgement]**: a design or content opinion, with the reasoning given.

The production site could not be loaded from the sandbox, because a TLS connection to `epelawa.vercel.app` fails. All visual and metric evidence therefore comes from a local production build against the repository's own Supabase fixture. Production returned **zero published stories** on the audit date. That means the *empty* state is the real current experience, so it is audited as a first-class case.

Severity scale:

- **P0**: the page breaks or a primary task is impossible.
- **P1**: a serious usability, accessibility, performance or trust problem on a primary path.
- **P2**: noticeable quality or consistency defect.
- **P3**: polish or debt.

---

## Executive assessment

The homepage is honest. It has no invented content, uses real CTAs, and handles empty and error news states carefully. It is also already accessible in many basics: there is a skip link, landmarks, visible focus, 44px targets almost everywhere, reduced-motion support, and no horizontal overflow at any of the 7 viewports.

Its weaknesses were:

1. A **resilience gap** that could blank the whole page.
2. A **storage notice and Support pill** that covered primary content on phones.
3. A **hero carousel** that inflated LCP for idle readers and wasted mobile data.
4. **Discoverability**: half the shortcut tiles repeated links already on screen, while places, the map, people and contribution paths had no homepage entry.
5. Several **"layered refresh" visual artefacts**: double chevrons, a boxed hero on desktop, a double gutter on phones, identical logo placeholders, and an empty band above the footer.

---

## Findings

### P0

| ID | Finding | Evidence | Component | Status |
| --- | --- | --- | --- | --- |
| P0-1 | **Any Supabase failure inside the poll blanked the entire homepage.** `SitePoll` was the only homepage data read without a guard. A thrown configuration or network error reached `app/error.tsx`, replacing the hero, news and navigation with "This page couldn't be loaded". News and breaking reads already degrade gracefully, so the poll (optional content) was the single point of failure. | [measured] `docs/homepage-audit/screenshots/before-supabase-unavailable/*.jpg`, React error #441 in console | `components/site-poll.tsx` | **Fixed**: the read is wrapped and returns `null`; Next control-flow errors are re-thrown via `unstable_rethrow` |

### P1

| ID | Finding | Evidence | Component | Status |
| --- | --- | --- | --- | --- |
| P1-1 | **Storage notice and Support pill covered primary content on phones.** At 360–390 the notice (133px tall, 360px card) covered the radio panel and the lower shortcut row, and the Support pill sat on top of the notice's own title text. At 768 the pill also covered a news card. | [observed] `before/stories-mobile-390-fold.jpg`, `before/stories-mobile-360-fold.jpg`, `before/stories-tablet-768-fold.jpg`; [measured] `noticeBox` in `before/*-report.json` | `notice-refinement.css`, `floating-support.module.css` | **Fixed**: below 768px the notice is a full-width bottom bar with the title and copy as one paragraph (124px). At 372px and wider the pill sits in the notice's empty action row; under 372px it lifts above the notice. It still covers part of a tile at 360 until the notice is dismissed. All six shortcut tiles are visible above the notice at 390 (`after/empty-mobile-390-fold.jpg`). |
| P1-2 | **Hero carousel produced late LCP candidates.** Each slide entered with `translateX(7%) scale(1.04)`, so its painted area differed slightly from the previous slide. Chrome then reported later slides as *new, larger* LCP elements. In a 52s idle session at Lighthouse's mobile viewport, LCP entries fired at 0.22s, **36.4s and 43.6s**. Lighthouse mobile recorded the 7th slide (Aiyetoro market) as LCP, at 7.9s. Real readers who do not scroll or tap (the LCP stopping signals) would report these late values to field data. | [measured] `docs/homepage-audit/lcp2.mjs` run: before `[{t:220},{t:36392},{t:43608}]`, after `[{t:220}]`; `lighthouse/before-stories-summary.json` | `home-client-refresh.css`, `hero-carousel.tsx` | **Fixed**: opacity-only entrance. After the change, a single LCP entry at 0.22s over 52s. |
| P1-3 | **Carousel downloaded every outgoing slide twice.** When React swapped the keyed `<img>`, the old element left its `<picture>`, re-ran source selection and fetched its own WebP fallback, around 111–158 KB per rotation, every 7.2s. Prefetch width was also copied from the current file, so a 640px-only slide caused 640px prefetches that were then discarded for 1280px. | [measured] `docs/homepage-audit/rot.mjs` request log, 16s window. Before: 8 hero requests incl. `webp/new-epe-road-1280.webp`, `webp/fish-statue-epe-1280.webp`, two unused 640 AVIFs. After: 6 requests, AVIF only, correct widths. | `hero-carousel.tsx` | **Fixed**: `<picture key={slide.slug}>`, plus viewport-based prefetch width |
| P1-4 | **Brand link failed WCAG 2.5.3 Label in Name.** axe-core reported a *serious* `label-content-name-mismatch` at all 7 viewports and in all modes. The visible text was "EPE LAWA The Voice of Epe Division" but the `aria-label` was "EPE LAWA home". This was the only axe violation on the page. | [measured] `before/*-report.json` | `components/site-header.tsx` (shared) | **Fixed**: the name now comes from the content, plus a visually hidden "home page". axe reports 0 violations at all viewports and modes (`after/*-report.json`). |
| P1-5 | **Reading/focus order differed from visual order.** The radio panel came first in the DOM, but CSS `order:-1` drew the shortcuts above it. Keyboard users jumped from the hero to "Listen to radio" and then back up to the tiles (WCAG 1.3.2 / 2.4.3). | [measured] `keyboardMobile` in `before/stories-report.json` vs `after/stories-report.json` | `app/page.tsx`, `home-client-refresh.css` | **Fixed**: the DOM order matches the visual order |
| P1-6 | **Discovery gaps and duplication.** Of the 6 tiles, "Latest news" repeated the hero CTA *and* the Latest News section directly below, and "Listen to radio" repeated the radio panel beside it. Meanwhile Tourism/places, Map and contribution routes (history accounts, business listings) had no entry in the page body, only in nav dropdowns and the footer. The site's own meta description promises "maps, local business, tourism…". | [observed] `before/stories-desktop-1440-full.jpg`; [judgement] | `app/page.tsx` | **Fixed**: the tiles are now Community history, Places to visit (`/tourism`), Find your way (`/map`), Local businesses, Community events and Join the conversation. The community panel gained "Share a local history" (`/itan-ilu-mi#contribute`) and "List your business" (`/business-directory/submit`). All of these routes exist in the app. |
| P1-7 | **Hero copy did not say what the site is.** "Your community, your stories, your Epe." is a sentiment, not an offer. A first-time visitor could not tell that the site holds news, history, places, businesses and a forum. | [judgement] Persona A/B walkthroughs below | `lib/i18n-messages.ts` | **Fixed**: lede is now "News, history, places, businesses and community voices from across Epe Division." The H1 is unchanged because owner tests pin it. |

### P2

| ID | Finding | Evidence | Status |
| --- | --- | --- | --- |
| P2-1 | Desktop nav dropdowns showed **two chevrons** each (the inline SVG plus the global `details > summary::after` from `native-controls.css`). | [observed] `before/stories-desktop-1366-fold.jpg` | **Fixed**: one scoped rule in `navigation-refinement.css` |
| P2-2 | **Boxed hero on wide screens, double gutter on phones.** The shared `.site-main` is capped at 1160px (≥1024) and padded 16px (<640). On the homepage, this boxed the hero photo on a dotted background between full-width header and footer, and inset phone content 32px. | [observed] `before/error-desktop-1440-full.jpg`, `before/stories-mobile-360-fold.jpg` | **Fixed**: homepage-scoped `.site-main:has(> .public-home)` override. The hero is full-bleed, and content still aligns to `.ep-container`. |
| P2-3 | **Empty band above the footer**, about 250px at desktop. The cause was the empty `.home-poll` wrapper (44px of padding when no poll is active, which is the live state) plus the storage-notice reserve placed between content and footer. | [measured] `probe.mjs`: `.home-poll h=44`, `.public-home padding-bottom 149px` | **Fixed**: `SitePoll` renders its own wrapper only when a poll exists, and the notice reserve moved into the footer's bottom padding |
| P2-4 | **Identical logo crops on every story without a cover**, which read as three banner adverts. | [observed] `before/stories-desktop-1440-full.jpg` | **Fixed**: a CSS-only contained placeholder on Cloud, keyed off `NewsImage`'s existing `data-news-fallback` |
| P2-5 | Support handle used the Braille glyph `⠿`. The test Chromium has no font for it, so it rendered as an empty circle, and AGENTS.md requires SVG icons. | [observed] `before/stories-mobile-390-fold.jpg` | **Fixed**: inline SVG grip (shared component, markup-only change) |
| P2-6 | `.reveal` sections start at `opacity:0`. Without JavaScript they stayed invisible, despite the component comment saying otherwise. The homepage reveal also animated `filter: blur()`, which Lighthouse flagged as a non-composited animation. | [measured] Lighthouse `non-composited-animations` (before) | **Fixed**: `@media (scripting: none)` fallback, and no blur on homepage reveals |
| P2-7 | Shortcut tiles touched the hero photo when no breaking strip is shown (4px gap). | [observed] intermediate screenshot (not kept); see `after/empty-mobile-390-fold.jpg` for the result | **Fixed**: 16px |
| P2-8 | Header and footer logo were **squashed** on phones: a 37×32 inline size was capped to 28px tall by `max-height`, giving Lighthouse `image-aspect-ratio` and Best Practices 96. | [measured] Lighthouse mobile (before) | **Fixed**: `object-fit: contain` on `.brand__mark img`, a one-declaration shared change. Best Practices on mobile is now 100. |
| P2-9 | `Home` awaited `readSiteLanguage()`, which always resolves `"en"`. That added a suspension point in front of the hero. The generic route loader ("Finding your page") is emitted in the initial HTML stream for `/`. | [measured] `curl /` shows the loader markup before the page payload | **Partly addressed**: `Home` no longer awaits. The loader markup is still emitted in the stream; it is replaced within the same response, but this needs follow-up. |

### P3 (documented, not changed)

| ID | Finding | Why not changed |
| --- | --- | --- |
| P3-1 | `home-client-refresh.css` restyles the same selectors 2–4 times. For example, the shortcut tiles go white, then multicolour, then white again. | Many node tests pin exact rule strings in this file. A safe consolidation needs coordinated test updates, so it is recorded as debt. |
| P3-2 | Breaking strip is fixed at 680px (the `.narrow` variant) while content is 1160px wide. On phones long headlines are clipped until they scroll. | The variant is shared with `/news` and is a deliberate prior decision. |
| P3-3 | Footer social buttons append a text `↗`, which renders as a box in the font-poor test Chromium. | Shared footer; the accessible name already says "opens in a new tab"; likely fine on real devices (unverified). |
| P3-4 | Radio panel eyebrow says "EPE LAWA RADIO" over "Radio Lagos 107.5 FM". This is accurate (the `/radio` page hosts Radio Lagos and Guts FM), but could read as if EPE LAWA owned the station. | Copy decision for the owner. |
| P3-5 | Small targets: the breaking-ticker link is 23px tall, and the desktop footer legal links are 20px tall. | Both meet WCAG 2.5.8 via the spacing exception (no other target within the 24px circle), and the footer already adds 44px hit areas on coarse pointers. |
| P3-6 | Hero `srcset` offers only 640/1280. A 412px@1.75× phone needs about 721px, so it downloads 1280 (~107 KB of avoidable bytes per Lighthouse). | Needs new image derivatives (an asset pipeline change), which is outside this task. |
| P3-7 | Newsletter form is shown but disabled ("Sign-up temporarily unavailable"). | Shared footer and an env-flag decision; the copy is honest. |
| P3-8 | Lighthouse SEO 69 locally is caused only by `noindex`. `isIndexingAllowed()` is false outside production. | Environment, not a defect. Production indexing could not be verified from the sandbox. |

---

## Information architecture

Section order after the change: Hero (H1, scope lede, News CTA, History CTA) → [Breaking strip, only when live] → **Explore tiles** (history, places, map, businesses, events, forum) → Radio panel → Latest News (3 stories, or honest empty/error state) → Community panel (join + guidelines + two contribution paths) → [Poll, only when active] → Footer.

- **Removed duplication**: the "Latest news" and "Listen to radio" tiles were removed. The hero CTA, Latest News heading and "View all news" cover news; the radio panel covers radio.
- **Added nothing synthetic**: no stats, testimonials, "featured businesses" or placeholder sections were added. Every new link goes to an existing route that shows its own real or empty state.
- **Not added**: a "Who is Who" tile. It stays in the Community menu and the footer; six tiles keep the existing grid and motion contract.

## Functional UX inventory (after)

| Control | Behaviour verified | How |
| --- | --- | --- |
| Skip link | First tab stop, moves to `#main` | [measured] keyboard sweep |
| Brand link | Name "EPE LAWA The Voice of Epe Division home page" | [measured] keyboard sweep + axe |
| Nav dropdowns | One chevron, open/close | [observed] screenshot |
| Drawer | Focus to close button, Esc returns focus to opener; all 4 groups populated (the earlier "empty EPE LAWA group" suspicion was disproved by DOM dump) | [measured] `menuFocus`, `menuAfterEscape`, `probe.mjs` |
| Hero CTAs | `/news`, `/itan-ilu-mi` | [measured] smoke `home-refresh` |
| Carousel | Rotates every 7.2s, pauses on focus/hover/hidden tab, off under reduced motion or save-data, no visible controls (owner-tested contract) | [measured] smoke `home-refresh` ×4 tests |
| Shortcut tiles ×6 | Real routes | [measured] keyboard sweep lists all 6 in order |
| Radio CTA | `/radio` | [measured] smoke |
| News states | stories / empty / error / slow skeleton | [measured] audit modes + smoke `public-shell`, `home-refresh` |
| Community links ×4 | `/auth`, `/guidelines`, `/itan-ilu-mi#contribute`, `/business-directory/submit` (the target explains that email-verified membership is required) | [measured] build + DOM |
| Storage notice | Got it (persists `epelawa_cookie_consent`), Privacy notice link | [measured] smoke `light-refresh` |
| Support pill | Opens dialog; no overlap with the notice at 320/360/375/390/414/767 | [measured] `docs/homepage-audit/pill.mjs` |

## Persona journeys

Each journey was walked through on the local build at 390px (stories and empty modes). The outcomes are judgement, informed by the screenshots.

| Persona | Goal | Before | After |
| --- | --- | --- | --- |
| A. Diaspora reader on a phone | Catch up on Epe news | Hero CTA works. The news list was partly under the notice. | Same path. The notice is shorter and full width, and the pill no longer covers it. |
| B. Visitor planning a trip | Find places to visit / directions | No body link: needed to know "Discover ▸ Tourism" in the menu. | "Places to visit" and "Find your way" tiles above the fold at 390. |
| C. Local business owner | Get listed | Only "Local businesses" (browse). The submit route was undiscoverable from home. | "List your business" in the community panel → `/business-directory/submit`. |
| D. Elder / historian | Contribute an account | "Explore community history" led to the archive; the contribution form was far down that page. | "Share a local history" deep-links to `#contribute`. |
| E. Radio listener | Listen now | Radio panel plus a duplicate tile. | Radio panel (single, clear CTA). |
| F. Keyboard / screen-reader user | Understand and navigate | axe serious issue on the brand link; tab order jumped. | 0 axe violations; tab order follows the visual order. |

## Accessibility (WCAG 2.2 AA)

**Automated** (axe-core, 7 viewports × 3 data modes): before, 1 serious violation (`label-content-name-mismatch`); after, **0 violations**. Lighthouse accessibility was 100 before and after; it uses a subset of axe.

**Manual checks performed**:

- keyboard order and visible focus on every tab stop (mobile and desktop sweep);
- drawer focus management and Esc;
- reduced-motion: hero text, photos and reveals are static (smoke test);
- 200%-equivalent narrow viewport (320 in the smoke suite) with no overflow;
- target sizes reviewed against 2.5.8;
- notice and pill obstruction (2.4.11 Focus Not Obscured): the notice is non-modal and does not trap focus. Focused elements behind it can still be partially obscured near the bottom edge until it is dismissed. This is reduced but not eliminated.

**Not done**: testing with real assistive technology (NVDA, VoiceOver, TalkBack), colour-contrast review of every hero photo frame (the overlay is a fixed dark gradient, and axe passed on the frames captured), and Yoruba review.

**This is not a WCAG conformance claim.**

## Performance

See `HOMEPAGE_TEST_REPORT.md` for the before/after table. In short, measured changes are:

- the late-LCP-candidate bug is gone;
- about 111–158 KB per rotation of duplicate WebP downloads is gone;
- wrong-width prefetches are gone.

Lighthouse in this sandbox shows a large unattributed main-thread task, even on `/privacy`, so absolute TBT and Performance scores here are environment-dominated and are not representative of real devices.
