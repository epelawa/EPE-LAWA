# Responsive changelog (turn 5)

| File | Change |
|---|---|
| `components/news-footer.module.css` | `.listingInner` tracks changed to `minmax(0, …)` with a fluid gap (fixes 740×360 overflow). |
| `app/forum/forum.module.css` | FAB raised to `bottom: 148px` at ≥861 px so it clears Support. |
| `components/floating-support.module.css` | With the radio mini-player open on phones, the undragged Support button sits above it. |
| `app/globals.css` | Range inputs are excluded from the global input rule; full-bleed opt-out; footer and main padding while the mini-player is open; compact filter bar (one control height); `.fine-print` disclosure. |
| `app/native-controls.css` | 24 px minimum for labelled checkboxes and radios. |
| `app/who-is-who/page.tsx` | Community select label linked with `htmlFor`/`id`. |
| `app/business-directory/**`, `components/business/**` | Auto-fit 3/2/1 grid, wrapping long names, single-column profile when there is no main content, chips that scroll on mobile and wrap on desktop. |
| `app/radio/radio-page.module.css`, `components/radio-*.module.css` | Fluid two-column band that stacks below 900 px; safe-area-aware mini-player. |
| `app/map/map-search.tsx`, `app/itan-ilu-mi/page.tsx`, `app/gallery/page.tsx` | Compact filters and the disclosure (see the radio changelog for the content removals). |
