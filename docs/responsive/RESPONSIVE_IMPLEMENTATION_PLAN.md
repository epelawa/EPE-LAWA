# Responsive implementation plan (turn 5)

Principles (owner brief): fix root causes; never `body { overflow-x: hidden }`; never disable zoom; never hide content to make it fit; no admin redesign; no schema or auth change for layout.

1. **Fluid containers:** sections use `width: min(100% - 2rem, 1200px)`, and full-bleed pages opt out of the 1160 px cap via `body:has(.page-full-bleed)`.
2. **Grids that shrink:** `repeat(auto-fit, minmax(min(100%, Npx), 1fr))` and `minmax(0, …)` tracks; `min-width: 0` on flex and grid children that hold long text (business names, Yorùbá).
3. **Fluid type:** `clamp()` for display and section headings, e.g. `clamp(1.5rem, 3vw, 2.5rem)`.
4. **Fixed chrome map:** one stacking order (mini-player 56 < bottom nav 58 < push prompt 80 < dialogs and drawer 90), with offsets driven by CSS variables (`--radio-mini-offset`, `--storage-notice-height`, `--mobile-nav-clearance`).
5. **Targets:** at least 44 px on primary controls (`--ep-touch-min`) and a 24 px floor on every labelled checkbox or radio.
6. **Tables:** public tables already scroll inside their own box (`.ui-table`, `display:block; overflow-x:auto` under 640 px). No public route currently renders a data table, so no stacked-card conversion was needed.
7. **Modals:** `.ui-dialog` becomes a bottom sheet at ≤600 px with internal scrolling, and the directory filters use the same sheet.
