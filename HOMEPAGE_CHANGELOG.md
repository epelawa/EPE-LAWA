# Homepage changelog

## 2026-11-26: owner design follow-up and test-suite repair (before merge)

### Changed (owner requests)
- **Scroll-progress bar removed.** `components/scroll-progress.tsx` is deleted, and its usage in `app/layout.tsx` and its CSS in `app/globals.css` are removed.
- **Map shortcut icon** is now a road (`RoadIcon` in `components/icons.tsx`) instead of a folded map.
- **Support button redesigned** (`components/floating-support.tsx`, `floating-support.module.css`):
  - A cobalt pill with Midnight text and a small headset avatar (inline SVG) that glances around and blinks.
  - A short speech bubble ("Need support?", "Need a human? We’re here.", and 3 others) shows for about 2.6s, at most 3 times per browser session.
  - The bubble is skipped under `prefers-reduced-motion`, while the dialog is open, while the storage notice covers it on phones, and after any interaction with the widget.
  - The bubble is `aria-hidden`; the button keeps its accessible name.
  - Below 768px the button shrinks to the avatar, and the "Support" label stays visually hidden.
- **Hamburger**: transparent background, two white lines (`components/navigation-refinement.css`).
- **Logo lockup**: the chip/rectangle behind the logo is removed. The name and tagline sit in one left-aligned column, upright (no italics).
- **Search** is now an icon button beside the notification bell (`/search`, labelled "Search EPE LAWA"). The "Search news" and "Search the whole site" drawer links are removed.

### Fixed (the 14 node + 4 vitest failures that already existed on `main`)
All but one were tests left behind by intentional changes already on `main`. Where the code was right, the test was updated, with a comment naming the commit. Where the code was wrong, the code was fixed.
- **Code fixes**:
  - `20261126000000_cron_job_history.sql`: `cron_job_start` used an undeclared `result` variable, so the migration failed on a fresh database. It now declares it and enables RLS. Both changes match the Production function and table, which were read-only checked via the Supabase connector.
  - `20261127000000_primary_admin_immutability.sql`: removed a `create policy` on a **view**, which Postgres rejects. It is absent in Production.
  - Admin nav: removed the dead "Gallery" link to `/gallery`, which had no page. Gallery photos are managed under Media library.
  - `lib/theme.ts`: the light-only theme script clears the stale `epelawa-theme` key again.
- **Test updates for deliberate changes**:
  - Digest, events, poll and song-request admin pages were removed in `43835ed`. Their route-manifest entries are dropped too.
  - Full-reload sidebar links (`43835ed`).
  - Browser recovery was withdrawn (`0eef5db`).
  - Cover credit, source and licence fields were removed (`1a1b7c9`).
  - The Privacy date is now 26 November.
  - The admin app runs under the `/admin` basePath.
  - The cookie notice no longer claims "optional tracking is off", because Plerdy loads. The test now forbids that claim.
  - The map iframe uses multi-line JSX.
- `backend/tests/schema.test.mjs` gains a `supabase_realtime` publication shim, which Supabase provides and PGlite does not.

## 2026-11-26: audit batch 1 (P0/P1) and batch 2 (P2)

Branch `arena/1a336494-epe-lawa`. This batch adds no dependencies and makes no database, env, auth or payment changes.

### Fixed
- **Homepage no longer crashes when the poll read fails** (P0). `components/site-poll.tsx` catches errors, re-throws Next control-flow errors (`unstable_rethrow`), and renders nothing.
- **No more late LCP from the carousel** (P1). The slide entrance is now opacity-only (`home-photo-fade-in`, 600ms) instead of translate and scale (`app/home-client-refresh.css`).
- **No duplicate image downloads on rotation** (P1). `<picture>` is keyed per slide, and prefetch width follows the viewport (`components/hero-carousel.tsx`).
- **Storage notice and Support pill no longer stack over content or each other on phones** (P1).
  - The notice is now a full-width bottom bar below 768px, with title and copy in a single paragraph.
  - The Support pill sits in the notice's empty action row (≥372px) or above it (<372px).
  - Files: `app/notice-refinement.css`, `components/floating-support.module.css`.
- **Brand link passes WCAG 2.5.3** (P1). The accessible name now comes from the visible text plus a visually hidden "home page" (`components/site-header.tsx`).
- **Tab order matches what is on screen** (P1). The shortcut tiles now come before the radio panel in the DOM, and the CSS `order:-1` is removed.
- **Desktop nav shows one chevron per menu** (P2) (`components/navigation-refinement.css`).
- **Logo no longer squashed on phones** (P2). `object-fit: contain` on `.brand__mark img`.
- **No empty band above the footer** (P2). The poll wrapper renders only with an active poll, and the storage-notice reserve moved into the footer padding.
- **Revealed sections stay visible without JavaScript** (P2), via `@media (scripting: none)`. Homepage reveals no longer animate `filter: blur()`.

### Changed
- **Hero lede**: "Your community, your stories, your Epe." is now "News, history, places, businesses and community voices from across Epe Division." The H1 and both CTA destinations are unchanged. The secondary CTA label moved to the i18n key `home.cta.history`.
- **Explore tiles**: removed "Latest news" and "Listen to radio", which duplicated the hero CTA, the Latest News section and the radio panel. Added "Places to visit" (`/tourism`) and "Find your way" (`/map`). The tile order is now history, places, map, businesses, events, forum.
- **Community panel**: adds "Share a local history" (`/itan-ilu-mi#contribute`) and "List your business" (`/business-directory/submit`).
- **Full-bleed hero**: the homepage `main` is no longer boxed at 1160px or double-padded on phones (`app/hero-logo.css`, scoped with `.site-main:has(> .public-home)`).
- **Stories without a cover photo** show a contained brand-mark placeholder on Cloud instead of a full-bleed logo crop.
- **Support handle**: inline SVG grip replaces the `⠿` glyph.
- **`Home` no longer awaits** `readSiteLanguage()`, which always resolves `"en"`. A comment explains how to reintroduce Yoruba without suspending the hero.
- **i18n**: new English keys plus matching Yoruba keys, to satisfy the parity test. The Yoruba was composed largely from existing translated terms and **needs native-speaker review** before Yoruba is re-enabled. It is currently never shown.

### Files
- `frontend/apps/main/app/page.tsx`
- `frontend/apps/main/app/home-client-refresh.css`
- `frontend/apps/main/app/hero-logo.css`
- `frontend/apps/main/app/connection-panel.css`
- `frontend/apps/main/app/notice-refinement.css`
- `frontend/apps/main/app/globals.css` (3 lines, reveal only)
- `frontend/apps/main/components/hero-carousel.tsx`
- `frontend/apps/main/components/site-poll.tsx`
- `frontend/apps/main/components/site-header.tsx` (brand link only, shared)
- `frontend/apps/main/components/navigation-refinement.css` (chevron + logo fit, shared)
- `frontend/apps/main/components/floating-support.tsx`, `.module.css` (glyph + homepage-notice offset, shared)
- `frontend/apps/main/lib/i18n-messages.ts`
- Docs:
  - `AUDIT_BASELINE.md`
  - `HOMEPAGE_AUDIT.md`
  - `HOMEPAGE_IMPROVEMENT_PLAN.md`
  - `HOMEPAGE_TEST_REPORT.md`
  - `HOMEPAGE_VISUAL_REVIEW.md`
  - `HOMEPAGE_CHANGELOG.md`
  - `docs/homepage-audit/**`

### Shared-component impact on other pages
- Brand link: only the accessible name changes; the visual output is the same.
- Nav: one chevron instead of two on every page with the desktop header. This is intended.
- Logo: aspect ratio preserved wherever `max-height` applies.
- Support pill: the SVG glyph shows everywhere. The position rule applies only when the homepage notice is present.
- Reveal: the no-JS fallback applies everywhere `Reveal` is used, which is strictly more visible content.
