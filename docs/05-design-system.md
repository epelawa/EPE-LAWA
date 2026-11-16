# EPE-LAWA — Design System

**Scope:** All eight web modules, account/support pages and staff workflows. Native mobile apps remain deferred.

## A new visual system, not a reskin

The owner superseded the earlier Fig & Limestone palette with EPE-LAWA’s cobalt system. Use the colors below with original EPE-LAWA branding; the palette reference contributes colors only, never its copy, logos or product language. The interface uses locally bundled Plus Jakarta Sans under the SIL Open Font License as a legally usable, close alternative to Codec Pro; it is not the commercial Codec Pro font. The homepage uses the supplied official logo in its hero, followed by concise entry points, genuine reporting and a complete footer; do not add a separate eight-section community index or “Explore Sections” block/pills.

[Sckooly](https://sckooly.app/) remains the primary structure reference. [GetQuant](https://getquant.app/) informs restraint, spacing and clear product hierarchy; [JĀSĀB](https://jasab.vercel.app/) informs editorial rhythm and calm navigation. All three were inspected in the browser before designing. Do not copy their content, logos, code or assets. Use the supplied EPE-LAWA brand mark, project-root reference images and original art. The generated lagoon illustration is editorial artwork, not a documentary photograph or evidence about a real location.

## Palette

| Token | Value | Role |
| --- | --- | --- |
| Midnight | `#0A1023` | Primary text and high-contrast labels on light surfaces |
| Navy | `#17264A` | Deep text and emphasis on light cards |
| Royal Steel | `#294B91` | Readable links and secondary emphasis on light surfaces |
| Cobalt | `#477FE0` | Primary actions and active navigation |
| Ice Blue | `#A7C5F5` | Focus and non-text accents on light surfaces |
| Cloud | `#F1F4FA` | Main light canvas and near-white surfaces |
| Silver | `#A6B2C5` | Non-text secondary accents; not small text on Cloud |
| Border | `#293650` | Visible outlines and separators on light surfaces |

Use one fixed light visual treatment on every route. Cloud is the canvas; use Midnight text, near-white cards, cobalt actions with Midnight labels, and Royal Steel for small links; use Navy as deep text/emphasis on light surfaces. Keep Ice Blue and Silver to non-text accents/focus only where contrast is verified, and never use them for small text on Cloud. Use the Border token for clear outlines and separators on light surfaces. Cobalt with white text is only 3.9:1; Midnight on cobalt is 4.84:1. Success, warning and danger colors remain reserved for real statuses, which must also include text. Check rendered contrast, including hover and focus states.

## Compact, readable typography

Scale the previous display hierarchy to approximately 90%, rather than shrinking the entire document with CSS zoom. Keep the desktop hero close to the confirmed 56px/61.6px GetQuant reference and policy body text at 16px/26px. Retain at least 16px for ordinary body text and form controls, 14px for ordinary controls/metadata, and 12px for short labels. Article content remains comfortably measured at about 62–72ch. Native browser zoom stays intact; never describe Plus Jakarta Sans as Codec Pro.

## Account and authentication screens

Use the owner-provided `266649.jpg` as a composition reference only: a soft textured light canvas, cobalt abstract art panel with the EPE-LAWA mark and heading, an overlapping rounded white form card, compact pill fields, clear password visibility control, strong rounded action, legal links and an account-switch link. Replace all source-brand wording with original EPE-LAWA copy and retain the approved cobalt palette. Keep Google sign-in disabled and labeled Coming Soon until its provider is configured. Preserve validation, step order, callback/recovery actions and Supabase-backed server actions.

Focused auth cards, the member dashboard, staff screens and error screens omit the public footer and use the same light visual treatment; do not add theme controls or persist a theme preference. At 320/375px and short viewport heights, cards fit without page scroll and the fixed storage notice remains visible without intersecting form controls. Use the line-grid texture on the light canvas only.

## Layout and interaction

Use a compact floating masthead, complete desktop navigation with a clear More menu, an accessible mobile drawer and a useful footer. Staff navigation exposes each real workflow in the same tab. Cards, lists, filters, detail pages, forms and empty states use shared editorial primitives, not legacy page markup. Layouts reflow at 320, 375, 768, 1024 and 1440 CSS px. Table overflow stays within its own region.

Use SVG icons only; no emoji. Controls have at least 44px target height. Keyboard focus is visible; drawers trap focus, close with Escape/outside taps and close on navigation. Motion is brief and respects reduced-motion preferences. Account forms have meaningful pending, validation, error and unavailable states.

## Owner-provided motion references: scope, not implementation


Do not describe nearby hover, drawer, disclosure, retry, numeric ordering or text-success behavior as the referenced animation. The acceptance evidence, tested surfaces, keyboard/touch alternatives, reduced-motion boundaries, state/persistence and exact gaps are recorded in [Testing and Acceptance](11-testing-acceptance.md). Any future change must be tied to an existing or separately approved surface and verified there; this note does not mark planned behavior as current.

Use the same fixed light appearance on every route, independent of `prefers-color-scheme`. Do not persist a system or user color-theme preference, render an Appearance/theme toggle anywhere (including the public drawer), or show a first-visit theme-selection toast.

## Truthful content and unchanged security

All eight areas remain in scope: News, History, Forum, Map, Business Directory/Marketplace, Tourism, Radio and Who is Who. Render approved records only. Do not invent articles, activity, reviews, people, prices, counts, map locations or service status. Distinguish loading, unavailable, empty and denied states. Show Coming Soon for provider-dependent features that are not ready.

Keep verified staff sessions, capability gates, form/action contracts, revision guards and private evidence boundaries intact. Map location is requested only after explicit consent and used only to prepare a directions link. Contact drafts are not delivered or stored by the unavailable delivery form; the UI must say so.

Target WCAG 2.2 AA. Automated axe scans and keyboard checks are useful gates, not a claim of complete accessibility certification or assistive-technology coverage. Database-backed publish/member journeys still require a genuinely isolated configured test environment; production data remains read-only.
