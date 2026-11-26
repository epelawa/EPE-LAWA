# Homepage visual review (before → after)

All images are in `docs/homepage-audit/screenshots/`. They come from a local production build with fixture data ("Smoke fixture: …" headlines are synthetic test stories, not real news).

In full-page captures the fixed storage notice and Support pill appear at the position they occupied in the viewport when the capture started. That is a capture artefact, not where they sit on the page.

## Desktop 1440 / 1366

`before/stories-desktop-1440-full.jpg` → `after/stories-desktop-1440-full.jpg`; `before/stories-desktop-1366-fold.jpg` → `after/stories-desktop-1366-fold.jpg`

- **Hero**: was a 1160px box floating on a dotted background between full-width header and footer. It is now full-bleed, so the photograph carries the page like a magazine cover. Text block, H1 and CTAs are unchanged in position and size.
- **Lede**: now states the offer in one sentence, and the line length stays within about 65 characters.
- **Nav**: "Community ⌄⌄" became "Community ⌄", and the same for Discover and About.
- **Tiles**: the same six-tile white card grid, but every tile now goes somewhere new (no repeats of the hero CTA or the radio panel).
- **Stories without covers**: the three full-bleed logo crops are replaced by a small contained mark on a Cloud panel. The cards now read as editorial cards awaiting photography, not adverts.
- **Community panel**: a hairline rule and two underlined contribution links in Royal Steel sit under the main actions. The illustration remains at the bottom-right.
- **Footer**: the empty ~250px band above it is gone (`probe.mjs`; visually in `after/empty-desktop-1440-full.jpg`).
- **Residual**: at 1366×768 the storage-notice card still covers the first tile until "Got it" is pressed. The breaking strip (680px) is narrower than the tile row (1160px), which is a deliberate shared variant (P3-2).

## Tablet 768 / 1024

`before/stories-tablet-768-fold.jpg` → `after/stories-tablet-768-fold.jpg`

- Full-bleed hero; the lede wraps to two lines.
- The notice is shorter (124px vs 133px). It still overlaps the Latest News heading at 768 until dismissed.
- The Support pill keeps its original position at ≥768. The notice is a left-aligned card there and does not collide with it.

## Phones 390 / 375 / 360

`before/stories-mobile-390-fold.jpg` → `after/stories-mobile-390-fold.jpg`; `before/stories-mobile-360-fold.jpg` → `after/stories-mobile-360-fold.jpg`; `after/empty-mobile-390-fold.jpg`

- **Hero**: the photograph runs edge to edge (previously inset 16px with dotted gutters). The hero is about 50px taller because the lede is now a real sentence (3 lines at 360, 2 at 390).
- **Gutters**: tile and section gutters went from 32px to 16px, so tiles are wider and labels wrap less.
- **Storage notice**: a full-width bar with a single text paragraph. In the empty state (the current live state) at 390, **all six tiles are visible above it** (before: the notice covered the second tile row and the radio panel).
- **Support pill**: before, it sat *on top of* the notice's title text at every phone width. Now:
  - At 372px and wider, it sits in the notice's empty action row, to the right of "Got it" and "Privacy notice" (measured gap ≥13px at 375, 28px at 390; `pill.mjs`).
  - Under 372px (360 and 320), the row has no room, so the pill lifts above the notice. There it still covers part of the third tile until the notice is dismissed (`after/stories-mobile-360-fold.jpg`). It no longer overlaps the notice at any width.
- **Support handle**: an SVG dot grip replaces a glyph that rendered as an empty circle in the test browser.
- **Logo**: no longer vertically squashed (37×32 forced to 37×28 before).
- **Drawer** (`after/stories-mobile-390-menu.jpg`): unchanged apart from the logo. The earlier suspicion of an empty "EPE LAWA" group was checked against the DOM and is unfounded (7 links).

## Empty and error states

`after/empty-desktop-1440-full.jpg`, `after/error-desktop-1440-full.jpg`, `after/error-mobile-390-fold.jpg`

- Copy is unchanged ("No stories published yet" / "The newsroom is unavailable right now"). The surrounding page now has more working entry points (places, map, contribution links), so an empty newsroom is no longer most of the page's value.
- If Supabase is completely unavailable to the poll, the page renders normally instead of the full-page error in `before-supabase-unavailable/*.jpg`. This was verified at code level and through the error-mode audit. The exact misconfiguration crash was not re-staged after the fix.

## Brand and design rules check (AGENTS.md)

- **Palette**: only owner tokens were used in new CSS (Midnight, Royal Steel, Cloud). No new colours, gradients or glass effects.
- **Contrast**: midnight text on cobalt and ice actions is unchanged.
- **Icons**: SVG icons only; the `⠿` glyph was removed. No emoji.
- **Touch targets**: new links are 44px tall. The notice buttons stay at 44px.
- **Focus**: all new controls use existing focus styles, and the keyboard sweep shows a solid outline on every stop.
- **Motion**: the hero photo motion was reduced (fade only). The reduced-motion paths are unchanged and covered by the smoke tests.

## What still does not look finished

- Story cards depend on real cover photography. The placeholder is calmer, but a newsroom with photos will look much better.
- `home-client-refresh.css` still carries layered overrides (P3-1). It does not show visually, but it makes future styling fragile.
- The storage notice will always cover some content until dismissed. That is inherent in a non-modal bottom notice.
