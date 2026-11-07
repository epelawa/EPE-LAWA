# EPE-LAWA — Design System

**Scope:** All eight web modules, account/support pages and staff workflows. Native mobile apps remain deferred.

## A new visual system, not a reskin

The owner rejected the former UI and authorised a complete rebuild, including a new palette. The new direction is **Fig & Limestone**: warm off-white, deep fig, pale lilac and a restrained lime accent. Inter provides one consistent interface voice. The homepage is an original split editorial hero followed by clear entry points, the eight-section community index, genuine reporting and a complete footer.

[Sckooly](https://sckooly.app/) remains the primary structure reference. [GetQuant](https://getquant.app/) informs restraint, spacing and clear product hierarchy; [JĀSĀB](https://jasab.vercel.app/) informs editorial rhythm and calm navigation. All three were inspected in the browser before designing. Do not copy their content, logos, code or assets. Use the supplied EPE-LAWA brand mark, project-root reference images and original art. The generated lagoon illustration is editorial artwork, not a documentary photograph or evidence about a real location.

## Palette

| Token | Value | Role |
| --- | --- | --- |
| Limestone | `#FAF9F6` | Main light surface |
| Fig | `#60436D` | Primary actions and emphasis |
| Deep fig | `#3F2B49` | Strong emphasis |
| Lilac | `#EDE7F1` | Secondary panels |
| Lime | `#DBE8AD` | Restrained accent, with dark text |
| Ink | `#29242D` | Main text |
| Muted | `#665F6B` | Supporting text |
| Border | `#DED9E1` | Decorative separation; controls use stronger borders |
| White | `#FFFFFF` | Cards and fields |

Use semantic tokens and explicit dark-mode variants. Status always includes text, not color alone. Check rendered contrast, including feedback, hover and focus states.

## Compact, readable typography

Scale the previous display hierarchy to approximately 90%, rather than shrinking the entire document with CSS zoom. The desktop hero is capped at 57.6px instead of 64px; page titles and section roles follow the same compact direction. Retain at least 16px for body text and form controls, 14px for ordinary controls/metadata, and 12px for short labels. Article content remains comfortably measured at about 62–72ch. Native browser zoom stays intact.

## Layout and interaction

Use a compact floating masthead, complete desktop navigation with a clear More menu, an accessible mobile drawer and a useful footer. Staff navigation exposes each real workflow in the same tab. Cards, lists, filters, detail pages, forms and empty states use shared editorial primitives, not legacy page markup. Layouts reflow at 320, 375, 768, 1024 and 1440 CSS px. Table overflow stays within its own region.

Use SVG icons only; no emoji. Controls have at least 44px target height. Keyboard focus is visible; drawers trap focus, close with Escape/outside taps and close on navigation. Motion is brief and respects reduced-motion preferences. Account forms have meaningful pending, validation, error and unavailable states.

## Truthful content and unchanged security

All eight areas remain in scope: News, History, Forum, Map, Business Directory/Marketplace, Tourism, Radio and Who is Who. Render approved records only. Do not invent articles, activity, reviews, people, prices, counts, map locations or service status. Distinguish loading, unavailable, empty and denied states. Show Coming Soon for provider-dependent features that are not ready.

Keep verified staff sessions, capability gates, form/action contracts, revision guards and private evidence boundaries intact. Map location is requested only after explicit consent and used only to prepare a directions link. Contact drafts are not delivered or stored by the unavailable delivery form; the UI must say so.

Target WCAG 2.2 AA. Automated axe scans and keyboard checks are useful gates, not a claim of complete accessibility certification or assistive-technology coverage. Database-backed publish/member journeys still require a genuinely isolated configured test environment; production data remains read-only.
