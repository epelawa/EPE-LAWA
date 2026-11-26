# EPE LAWA homepage improvement plan

The plan was derived from `HOMEPAGE_AUDIT.md`. Its guiding constraints come from AGENTS.md and the brief:

- homepage only;
- the smallest safe change to shared components;
- no new dependencies;
- no invented content;
- owner palette and owner-pinned contracts (H1 text, carousel without controls, storage-notice text, test-pinned CSS) are preserved.

## Batch 1: P0/P1 (implemented)

| # | Change | Files | Risk control |
| --- | --- | --- | --- |
| 1 | Guard the poll read so that a failure hides the poll instead of blanking `/` | `components/site-poll.tsx` | `unstable_rethrow` keeps Next.js control-flow errors intact. The poll UI is unchanged when a poll exists. |
| 2 | Opacity-only slide entrance | `app/home-client-refresh.css` | Duration 600ms; still disabled under reduced motion |
| 3 | Key the whole `<picture>` per slide; prefetch by viewport width | `components/hero-carousel.tsx` | Keeps every string that the foundation tests pin (`key={slide.slug}`, `srcSet={responsiveSrcSet(slide.webp)}`, `image.fetchPriority = "low"`) |
| 4 | Compact storage notice; place the Support pill in the notice's action row on phones | `app/notice-refinement.css`, `components/floating-support.module.css` | Pinned selectors and the banner text are untouched. The pill rule applies only while the notice is present, the pill has not been dragged (`:not([style])`), and the viewport is under 768px. |
| 5 | Brand link accessible name from content | `components/site-header.tsx` | Visible output is unchanged; one sr-only span is added |
| 6 | DOM order = visual order for tiles and radio | `app/page.tsx`, `home-client-refresh.css` | `order:-1` removed |
| 7 | Re-target the tiles at missing destinations; add contribution links | `app/page.tsx`, `app/connection-panel.css`, `lib/i18n-messages.ts` | Real routes only. Six tiles keep the nth-child motion contract. |
| 8 | Scope-stating hero lede and an i18n key for the secondary CTA | `lib/i18n-messages.ts`, `app/page.tsx` | H1 unchanged. Yoruba keys were added for parity, but Yoruba is disabled site-wide, so they need native-speaker review before it is enabled. |

## Batch 2: P2 (implemented)

| # | Change | Files |
| --- | --- | --- |
| 9 | Suppress the generic `<details>` chevron in the nav | `components/navigation-refinement.css` |
| 10 | Full-bleed homepage main (no 1160px box, no double phone gutter) | `app/hero-logo.css` |
| 11 | Remove the empty poll band; move the notice reserve into the footer | `components/site-poll.tsx`, `app/page.tsx`, `app/notice-refinement.css` |
| 12 | Contained logo placeholder for stories without a cover | `app/home-client-refresh.css` |
| 13 | SVG grip on the Support handle | `components/floating-support.tsx`, `.module.css` |
| 14 | No-JS reveal fallback; no blur animation on homepage reveals | `app/globals.css` |
| 15 | 16px gap between the hero and the tiles when there is no breaking strip | `app/home-client-refresh.css` |

## Batch 3: P3 (deferred, with reasons, in `HOMEPAGE_AUDIT.md`)

- Consolidate `home-client-refresh.css`. This needs test-string updates, so it should be done as its own PR with the owner.
- Add a 960px hero derivative to the image pipeline.
- Decide whether the radio eyebrow copy needs changing (owner).
- Unify the breaking strip width with the content width (shared with `/news`).
- Replace the text `↗` in the footer social buttons with an SVG.

## Explicitly not done

- No popups, no forced sign-up, no new sections, no testimonial or statistics blocks, and no gradients or glass effects added.
- No change to the H1, the carousel control contract, the storage-notice wording, analytics, auth, payments, the database or env vars.
