# Homepage hero gallery — visual QA

**Checked:** 2026-11-13 WAT. **Base:** `origin/main` at `2ab88be1b8ee644e9237ff732af545f1d4976cb9`.

These captures come from a local production build. It used synthetic Supabase placeholders only; no production records, credentials or writes were used. They are local visual evidence, not screenshots of the hosted site or a Vercel preview.

## Screenshots

- Mobile, 375 CSS px: [homepage hero gallery](homepage-hero-gallery-mobile-375.png) — 375×1051.
- Desktop, 1440 CSS px: [homepage hero gallery](homepage-hero-gallery-desktop-1440.png) — 1440×755.

## What was checked

The responsive browser run covered 320, 375, 768, 1024 and 1440 CSS px; each viewport had no horizontal overflow. The official EPE-LAWA mark is above the hero copy, with no location subline beneath the mark. The exact “Epe · Lagos State” location label, map-pin icon and photo credit/license links sit after the hero image. The gallery has 52 individually attributed Epe photos in 206 local AVIF/WebP variants (16 MB total); the first image is eagerly loaded at high priority, while only a small upcoming window is prefetched.

The image changes automatically after 6.5 seconds without a user click, confirmed in Chromium by observing both the image URL and caption change. A separate Save-Data run waited 7.2 seconds and confirmed the slide did not advance and no pause control appeared. The reduced-motion run also disabled automatic movement. Keyboard pause/resume, descriptive image text, readable author/source/license links and the single 44px pause control were checked. Source-level regression tests cover the Save-Data, constrained-network and reduced-motion conditions; no production or third-party image service was contacted by the local app.

This evidence covers the hero/gallery fix only. Moving the theme control into the hamburger menu and showing the one-time system-theme notice remain separate homepage work.

## Exact local gates

Pinned Node 22.23.4 and pnpm 10.34.9:

- `pnpm typecheck` — 5/5 tasks passed.
- `pnpm build` — 2/2 production builds passed.
- `pnpm test` — 167 tests: 166 passed, 0 failed, 1 documented PGlite skip.
- `git diff --check` — passed.
