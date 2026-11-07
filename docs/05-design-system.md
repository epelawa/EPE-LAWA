# EPE-LAWA — Design System

**Status:** Active.
**Scope:** All eight approved web modules and cross-cutting member/staff experiences.
**Reference:** Sckooly public-site structure, adapted to original EPE-LAWA branding; owner-provided red/coral/navy/ivory direction.

## Direction

Use clear brand/navigation and primary action, a strong hero, concise audience framing, ordered product sections, useful support content, repeated calls to action and a substantial footer. Navigation covers all eight modules: Trending News; It also covers Itan Ilu Mi / My Community History, Chat Forum / Digital Village Square, Map & Navigation, Epe Business Directory & Marketplace, Historical Sites & Tourism, EPE LAWA Radio, and Who is Who in Epe. Do not copy Sckooly’s protected wording, logo or assets. Use original EPE-LAWA content and only licensed/credited imagery. SVG icons only; no emoji. Sponsored content, if present, is unmistakably labelled and supported by real records.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| Red | `#DA251C` | Primary actions and emphasis after contrast check |
| Deep red | `#B51F18` | Focus/high-contrast red text |
| Coral | `#FF4A3D` | Accent; not normal-size text on ivory |
| Navy | `#17253A` | Headings, dark surfaces and footer |
| Light blue | `#EAF3FB` | Secondary panels |
| Warm ivory | `#FCFAF7` | Main light surface |
| White | `#FFFFFF` | Cards and inputs |
| Charcoal | `#1C1E21` | Main text |
| Secondary text | `#4A4F57` | Supporting copy |

Use semantic CSS tokens. Color is never the only status indicator. WCAG contrast must be checked for final rendered pairs, including focus, hover and disabled states.

## Type, layout and interaction

Use readable sans-serif typography, 16px minimum body text, article measure around 62–72ch, centered content and mobile gutters. Touch targets are at least 44×44px. Keep radii and shadows restrained; glass surfaces never reduce legibility. Motion is brief and respects `prefers-reduced-motion`. At 320/375/768/1024/1440 CSS px, content must reflow without horizontal overflow.

## Content and component rules

- News: published records only; sourced articles, visible corrections; no invented trends or breaking claims.
- History: provenance- and consent-aware; private contributions remain private until approved.
- Forum: no fake activity; authenticated participation and reasoned moderation.
- Map: manual search and safe outbound directions; no default GPS, private address exposure or claim of a Maps API integration.
- Directory/Marketplace: approved public fields, human-evidenced verification, real prices/stock; payment-dependent actions only after provider gates pass.
- Tourism: sourced destination content; no invented locations, hours or history.
- Radio: truthful stream state; no invented programmes or episodes.
- Who is Who: approved profiles and human-evidenced role verification.
- Admin: real analytics; query failure is not zero; secure session and capability checks.
- Every data view distinguishes loading, empty, error and denied states.

Target WCAG 2.2 AA. Use semantic headings, keyboard access, visible focus, accessible names, associated form errors, reduced motion, zoom/reflow checks and manual assistive-technology review. A successful build alone does not prove accessibility.
