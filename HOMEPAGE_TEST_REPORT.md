# EPE LAWA homepage: test report

Date: 2026-11-26. Branch `arena/1a336494-epe-lawa`, base `7f6bdcf`.
Every number below comes from a command that was run in this session. The logs were in `/tmp` (not committed). Summaries and reports are in `docs/homepage-audit/`.

## Test environment (read this first)

- **Build**: `next build --webpack`, served with `next start` (production mode) on `0.0.0.0:3100`.
- **Data**: the repo's own Supabase fixture (`frontend/tests/browser-smoke/supabase-stub.mjs`) in modes `stories`, `empty`, `error`, `slow-stories` and others. Because production mode rejects `http://` Supabase URLs, the fixture was put behind a local self-signed TLS proxy (`https://localhost:54322`), with `NODE_TLS_REJECT_UNAUTHORIZED=0` for the server process only.
- **Browser**: headless Chromium 158 (`@sparticuz/chromium`). The Playwright-bundled browser could not be downloaded in the sandbox.
- **Production** (`epelawa.vercel.app`) was **not reachable** for tooling (TLS blocked), so no live Lighthouse, axe or screenshots.
- **Lighthouse caveat**: in this sandbox even `/privacy` shows a ~2.1s unattributed main-thread task, and the homepage ~5–7s. A direct CDP trace with 4× CPU throttling showed no such task. Absolute TBT and Performance scores are therefore dominated by the environment. Compare before against after (same machine, same flags), and do not read them as field values.

## Final verification before merge (owner follow-up, 2026-11-26)

All commands were run from a clean environment (`env -i PATH HOME CI=true`), matching `.github/workflows/ci.yml`.

| Check | Result |
| --- | --- |
| `pnpm typecheck` (5 packages) | **pass** |
| `pnpm build` (main + admin) | **pass** |
| `pnpm test:node` | **448 pass, 0 fail, 1 skip** of 449. The skip is the schema test's documented PGlite exclusion-constraint limitation. |
| `pnpm test:unit` (vitest) | **152/152 pass** (49 files) |
| `pnpm audit --audit-level=high` | **No known vulnerabilities** |
| `git diff --check` | **clean** |
| `pnpm test:browser-smoke`, full suite, `CI=true` with retries as in CI (run before the last change, a one-line ≤420px CSS fix letting the brand shrink; the GitHub "Browser smoke" check reruns it on the final commit) | **67/67 pass** (65 first try, 2 flaky that passed on retry). Both first-try failures came from the `next dev` server restarting at its memory threshold mid-run ("approaching the used memory threshold, restarting"): one `ERR_CONNECTION_REFUSED`, one missing `og:image` during recompilation. |

The test count went from 423 to 449 because `schema.test.mjs` now runs its 28 sub-tests instead of crashing at migration time. **The 18 pre-existing failures listed further down are all resolved.** The changelog has the details. In short, 4 were real code defects (2 migrations, 1 dead admin link, the theme script), and 14 were tests left behind by deliberate changes already on `main`. Those tests now assert the current behaviour.

### Owner design changes: browser checks (production build, `stories` fixture, Chromium)

Widths 320/375/768/1024/1440. Screenshots are in `docs/homepage-audit/screenshots/turn2/`.

| Check | Result |
| --- | --- |
| Horizontal overflow | **0** at all 5 widths |
| Scroll-progress bar present | **no** |
| Hamburger background / line colour | `transparent` / `rgb(255,255,255)` |
| Brand or tagline italic | **no** |
| Brand overlaps menu, search or bell; search overlaps bell | **none** at any width (a 22px brand/search overlap at 320px was found and fixed by letting the brand shrink so the tagline wraps) |
| Search button size | 48×48 (<961px), 44×44 (desktop), links to `/search` |
| Drawer "Search news" / "Search the whole site" links | **0** ("Search news" remains in the footer quick links, which was not part of the request) |
| Support bubble | Appears about 4s after load, hides after about 2.6s, varied text, fully inside the viewport at every width. Measured over 20s at 1440: shown 4.0→7.1s, then again at 16.1s. |
| Bubble under `prefers-reduced-motion: reduce` | **not shown** |
| Console errors / page errors | **0** |

Not tested: real phones, screen readers, Safari and Firefox. The "looking around" animation was judged visually only.

## Summary (original audit, turn 1)

| Check | Before | After | Notes |
| --- | --- | --- | --- |
| TypeScript `tsc --noEmit` (main app) | pass | **pass** | |
| `next build --webpack` | pass | **pass** | |
| Lint | — | — | **No lint script or ESLint config exists in the repo**; nothing to run |
| `pnpm test:node` | 409/423 pass, 14 fail | **409/423 pass, 14 fail** | Failing set is **identical** (diffed by test name); all pre-existing, listed below |
| `pnpm test:unit` (vitest) | 149/153 pass, 4 fail | **149/153 pass, 4 fail** | Same 4 pre-existing failures. One new failure appeared mid-way (i18n parity) and was fixed by adding the Yoruba keys. |
| Playwright smoke, homepage specs (`home-refresh`, `light-refresh`, `public-shell`, `public-routes-audit`) | not run on baseline | **43/43 pass** (final build) | Covers 320/375/768/1024/1440, reduced motion, carousel contract, skeleton, error state, storage notice, and 320px overflow on all public routes |
| Playwright smoke, full suite (67 tests) | not run on baseline | **65 pass, 2 fail** (run on the build just before the last change, a CSS-only Support-pill breakpoint move from 360 to 372px; the homepage specs were re-run on the final build) | Both failures are `dashboard-tabs.spec.ts` assertions that Supabase requests use `http://localhost:54321`. Under this harness they use the TLS proxy `https://localhost:54322`. This is environmental and does not touch homepage code. |
| axe-core, 7 viewports × 3 modes (21 runs) | 21 × 1 serious (`label-content-name-mismatch`) | **0 violations** | `screenshots/{before,after}/*-report.json` |
| Horizontal overflow, 21 runs | 0 | **0** | |
| Console errors / failed requests, 21 runs | 0 / 0 | **0 / 0** | |
| Keyboard order (mobile) | radio CTA before tiles (mismatch) | **matches visual order** | `keyboardMobile` in reports |
| Drawer focus + Esc | pass | **pass** | |

### Pre-existing failures at the time of the audit (all fixed since; see the final verification above)

**node**:

- `backend/tests/schema.test.mjs`
- admin navigation links resolve to existing app routes
- admin route links keep normal navigation…
- admin dashboard is protected and login is noindex…
- member auth routes use a centered branded shell…
- digest auto-send is capability-gated…
- the digest page mounts the send form…
- main has honest indexable metadata… (it expects `https://epelawa.vercel.app`, but gets the locally configured `http://127.0.0.1:3100`)
- Terms and Privacy pages expose a current last-updated date
- the map panel embeds OpenStreetMap…
- public route manifest matches the Next page tree
- public site always starts light…
- storage notice is homepage-only and contact/policy pages… (`ui-rebuild`: expects banner text "optional tracking is off", which contradicts the `auth-shell` test that pins the current text)
- live queue counts cover every pending-work queue

**vitest**:

- `newsroom-cover-validation`
- `newsroom-session-recovery` ×2
- `progressive-forms` ×1

## GitHub checks on PR #273 (commit 8c177a5)

- Passing: CodeQL and the Vercel preview deployment.
- `CI / verify` **failed at the "Test" step**. The same workflow also fails on `main` for the base commit `7f6bdcf` and the two merges before it, which is consistent with the pre-existing failures above. The job log could not be downloaded from the sandbox (the log host is blocked), so I could not compare it test by test.
- `Browser smoke / public shell` was still pending when this report was written.

## Performance

### Lighthouse 13, homepage, `stories` fixture, same machine and flags

| Metric | Mobile before | Mobile after | Desktop before | Desktop after |
| --- | --- | --- | --- | --- |
| Performance | 37 | **54** | 60 | **59** |
| Accessibility | 100 | 100 | 100 | 100 |
| Best Practices | 96 | **100** | 100 | 100 |
| SEO | 69 | 69 | 69 | 69 |
| FCP | 1.8 s | 1.3 s | 0.3 s | 0.3 s |
| LCP | **7.9 s** | **3.5 s** | 0.8 s | 0.8 s |
| TBT | 6,600 ms | 5,530 ms | 2,810 ms | 2,470 ms |
| CLS | 0 | 0 | 0 | 0 |
| Speed Index | 7.6 s | 7.4 s | 5.8 s | 5.8 s |
| Total transfer | **1,886 KiB** | **1,081 KiB** | 1,918 KiB | 1,114 KiB |

Sources: `docs/homepage-audit/lighthouse/before-stories-summary.json`, `after-stories-summary.json`. After, empty mode, mobile: Performance 51, LCP 3.4 s, CLS 0, 1,074 KiB (`after-empty-mobile-summary.json`).

- **SEO 69** comes only from `is-crawlable`: `noindex` is emitted because `isIndexingAllowed()` is false outside production. This is environmental.
- **Byte reduction**: the drop is mostly the removed duplicate WebP downloads and wrong-width prefetches during Lighthouse's long observation window.
- **Mobile LCP**: the improvement is mostly that Lighthouse no longer picks up a late carousel slide as LCP (see below).
- **Targets**: Performance ≥90 and TBT targets were **not met in this environment**. Accessibility 100, Best Practices 100 and CLS 0 were met. LCP ≤2.5 s was met on desktop, and in the direct Playwright measurement (0.21–0.28 s unthrottled), but not under Lighthouse mobile throttling (3.5 s).
- **INP**: not measured (no field data, and no scripted interaction trace).

### Direct measurements (Playwright + PerformanceObserver)

| Measurement | Before | After | Script |
| --- | --- | --- | --- |
| LCP entries in a 52 s idle session (412×823 @1.75) | 0.22 s, **36.4 s, 43.6 s** | **0.21 s only** | `docs/homepage-audit/lcp2.mjs` |
| Hero image requests in the first 16 s (390 @2×) | 8 (incl. 2 WebP re-downloads, 2 unused 640 AVIFs) | **6, AVIF only, correct widths** | `docs/homepage-audit/rot.mjs` |
| Layout shift (1350 desktop / 412 mobile, 11 s) | not recorded | 0.0016 / 0.0048 total | `docs/homepage-audit/cls.mjs` |

During the work, a desktop CLS of 0.07 appeared after the full-bleed change. It was reproduced twice: `main#main` changed geometry when the route-level loader (`app/loading.tsx`, emitted in the initial stream before the page) was swapped for the homepage. After making `Home` synchronous and sizing the logo placeholder, Lighthouse desktop CLS returned to 0 across 3 later runs. **Open item:** the generic loader markup is still present in the initial HTML stream for `/`. The homepage replaces it within the same response, and it was not seen painted in screenshots, but this was not fully investigated.

## Visual and responsive

Before and after screenshots, JPEG, curated:

- `docs/homepage-audit/screenshots/before/`
- `docs/homepage-audit/screenshots/after/`
- `before-supabase-unavailable/` (the P0 crash)

The full 7-viewport × 3-mode set can be regenerated with `node docs/homepage-audit/audit.mjs <label> <mode>`. Narrative review: `HOMEPAGE_VISUAL_REVIEW.md`.

| Viewport | Notice height before → after | Hero height before → after (stories) |
| --- | --- | --- |
| 1440 | 133 → 124 | 480 → 480 |
| 1024 | 133 → 124 | 373 → 398 |
| 768 | 133 → 124 | 360 → 382 |
| 390 | 133 → 124 (full-width bar) | 403 → 454 (longer lede; full-bleed photo) |
| 360 | 133 → 124 | 426 → 451 |

## Links

All new homepage hrefs point at existing App Router pages, checked against `app/**/page.tsx` and the build route table:

- `/tourism`
- `/map`
- `/business-directory`
- `/events`
- `/forum`
- `/itan-ilu-mi`, and the `#contribute` anchor (`id="contribute"` exists in `app/itan-ilu-mi/page.tsx`)
- `/business-directory/submit`

`public-routes-audit.spec.ts` (in the full smoke run) passed.

## Not tested

- Real devices
- Real assistive technology (NVDA, VoiceOver, TalkBack)
- Safari and Firefox
- Production data and production Lighthouse
- Yoruba copy (disabled site-wide)
- The poll UI with an active poll: the fixture has none, and only the failure path was exercised
