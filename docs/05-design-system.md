# EPE LAWA — Proposed Design System

**Document:** 05 — Workstream 0.4\
**Status:** Workstream 0.4 approved by the owner on 2 November 2026; final assets and component details still require real-device validation.\
**Prepared:** 2 November 2026\
**Inputs:** [Product requirements](01-product-requirements.md), [journeys](02-user-journeys.md), [sitemap](03-sitemap.md) and [page specifications](04-page-specifications.md).\
**Gate:** Workstream 0.4 is approved; proceed to technical architecture. This is not production implementation or a WCAG conformance claim.

## 1. Design intent and principles

**Modern Riverine Editorial:** a contemporary civic, cultural and broadcasting identity rooted in Epe, paired with professional editorial reading and a focused operations workspace. Show authentic Epe only through approved, licensed material; do not substitute generic African stock and present it as Epe. Cultural interpretation needs local review and must respect distinct Eko Epe and Ijebu Epe histories.

1. **Useful before decorative:** every control has a purpose and a real destination or data source. No fake testimonials, statistics or content.
2. **Trust and clarity:** distinguish editorial copy, verified status, attribution and private staff information. Never present future features as active.
3. **Mobile and data conscious:** design first for small screens, affordable Android devices and constrained connections; progressively enhance on larger screens.
4. **Accessible by default:** legible hierarchy, semantic structure, keyboard operation, visible focus, meaningful names and non-colour state cues.
5. **Consistent, not identical:** share tokens and interaction patterns across products while keeping their visual and operational roles distinct.
6. **Restraint:** purposeful imagery, typography and geometry; avoid neon, purple/pink glow, excessive gradients, glass effects, particle backgrounds, gratuitous animation, decorative emoji and generic repeated cards.

## 2. Three visual experiences

| Experience | Character | Layout and content priority |
| --- | --- | --- |
| Main website | Welcoming civic/cultural identity, premium but practical, image-led where authentic assets exist. | Clear introductory hero, restrained radio player, real news and media paths; spacious without wasting mobile bandwidth. |
| News publication | Professional editorial publication with strong headline hierarchy and readable text. | Masthead, clear sections, compact news summaries and a comfortable article reading measure. Avoid turning the paper into a corporate homepage. |
| Admin dashboard | Functional, efficient and information-focused. | Clear navigation, status and permitted actions; legible lists, forms and audit data. Avoid decorative imagery. |

No logo treatment, actual photograph, pattern, cultural motif or finished page design is approved by this document. Use approved logo files without distortion; licence and credit assets, and provide meaningful descriptions where appropriate.

## 3. Proposed colour tokens and contrast

All colours are proposed and require brand approval and testing in context. Contrast ratios below were calculated from the specified sRGB hex values using WCAG relative luminance, rounded to two decimals; they are checks of **individual flat colour pairs**, not proof of an accessible interface. Actual colours, opacity, imagery, focus indicators and final component sizes must be retested.

| Token | Hex | Intended role |
| --- | --- | --- |
| Riverine Teal | `#0B5A60` | Primary brand surfaces, links or emphasis where contrast allows. |
| Palm Green | `#2E7D32` | Secondary emphasis or positive state with an additional non-colour cue. |
| Ochre Gold | `#E5A93C` | Accent or highlight, sparingly; pair with dark text. |
| Deep Charcoal | `#1C1E21` | Primary text and dark neutral. |
| Warm Ivory | `#F9F8F6` | Main light background. |
| White | `#FFFFFF` | Functional surface/contrast partner; not a replacement for brand approval. |

### Checked examples

| Foreground / background | Ratio | Proposed use |
| --- | ---: | --- |
| Deep Charcoal / Warm Ivory | 15.74:1 | Body text and headings. |
| Riverine Teal / Warm Ivory | 7.48:1 | Links and headings when otherwise distinguishable. |
| White / Riverine Teal | 7.94:1 | Text on primary teal actions. |
| Palm Green / Warm Ivory | 4.83:1 | Normal text only at the exact flat colours shown; retest variants. |
| White / Palm Green | 5.13:1 | Text on the exact green surface; retest variants. |
| Deep Charcoal / Ochre Gold | 8.01:1 | Text on gold highlights/actions when needed. |
| Ochre Gold / Warm Ivory | 1.96:1 | **Not suitable for normal text**; also below 3:1 for large text and essential UI/graphical indicators. |

Normal text generally needs at least 4.5:1 and qualifying large text at least 3:1 for WCAG AA; meaningful UI boundaries and focus indicators generally need at least 3:1 against adjacent colours where applicable. Check the actual WCAG 2.2 criteria and exceptions for each component. Never rely on colour alone to convey status; give text labels and/or appropriate icons. Exact error, warning, disabled, hover and focus colours are **not yet selected** and must be designed and measured against their actual backgrounds.

## 4. Typography and language

- **Proposed:** Plus Jakarta Sans for headings, Inter for body and interface text, and a carefully selected editorial serif for news headlines where it improves hierarchy. Font licences, download cost and actual language/diacritic coverage require evaluation; provide appropriate local/system fallbacks. Do not assume an additional supported product language.
- Use consistent semantic heading order rather than selecting headings solely for size. Give news headlines clear weight and an article body a comfortable measure and line height. Avoid fixed heights that clip longer titles, translations or resized text.
- Starting design suggestion: body text around 16 CSS px, line-height around 1.5; larger article body may be appropriate after testing. These are starting points, not fixed requirements or verified performance budgets.
- Design for browser zoom, increased text size and 200% text resizing without loss of content/function; verify reflow against WCAG 2.2 AA at applicable dimensions. Do not lock browser zoom.
- Render approved names and accents correctly, including Àmitítí. Final copy and pronunciation references require owner confirmation. Use plain language for status, form feedback and privacy notices.

## 5. Spacing, layout and responsive behaviour

### Proposed spacing scale

| Token | Suggested value | Typical use |
| --- | ---: | --- |
| `space-1` | 4 px | Compact icon/text gap. |
| `space-2` | 8 px | Related control or metadata gap. |
| `space-3` | 12 px | Small component padding. |
| `space-4` | 16 px | Standard mobile content gutter / element gap. |
| `space-6` | 24 px | Section-internal separation. |
| `space-8` | 32 px | Larger grouping. |
| `space-12` | 48 px | Section separation. |
| `space-16` | 64 px | Large-screen section separation where appropriate. |

These are proposed design tokens, not a commitment to code. Allow content and font size to determine actual spacing; use logical direction/relative units where helpful. Borders, radii and shadows should be restrained and measured for sufficient separation, not applied uniformly as decorative rounded cards.

### Layout guidance

- Begin with a single-column layout at small phone widths, including 320 CSS px, with comfortable gutters and no page-level horizontal scrolling. Preserve content order when columns stack.
- Test small/standard mobile, tablet, desktop and large desktop; indicative planning widths are 320, 375, 768, 1024 and 1440 CSS px. These are **test points**, not approved framework breakpoints. Choose breakpoints based on content, not device labels.
- Main pages may use multi-column content and authentic imagery at sufficient width; news may use an editorial grid; admin may use navigation plus workspace. Collapse sidebars and convert dense tables to accessible labelled rows or allow an intentional accessible local scroll container when necessary.
- Keep public article text comfortably readable on large screens; do not stretch it across the viewport. Use fluid content widths and avoid fixed dimensions that cause clipping. No exact container width is locked before prototypes are tested.
- Respect 400% zoom and applicable WCAG reflow criteria; test actual components instead of assuming viewport widths alone prove conformance.

## 6. Component inventory and state behaviour

All components require appropriate default, hover (where supported), visible focus, active, disabled, loading, error and success states **where applicable**. A noninteractive element does not need button states; do not create a misleading success state. States must be distinguishable without colour alone and accessible to assistive technology.

| Component | Purpose and proposed behaviour | Required safeguards / relevant states |
| --- | --- | --- |
| Brand header and navigation | Identify the current application; expose available destinations. Mobile menu has a labelled trigger and close control. | Keyboard-operable with visible focus, correct expanded state, logical focus order and escape/close behaviour. No links to unimplemented services. |
| Link / button | Links navigate; buttons perform actions. Primary, secondary and text styles establish priority. | Text labels; distinct hover/focus/active; disabled state only when genuinely unavailable; communicate external WhatsApp/social navigation. Do not rely on colour alone. |
| Form field and validation | Clearly labelled inputs with associated help, privacy information and errors. | Required/optional status agreed per form; errors identify field and remedy; submission progress, genuine success and failure are announced. Do not invent contact fields. |
| Search, filter and pagination | Find real published material and navigate result pages. | Keyboard-accessible labels and current page; loading, no-result and error states; no leaked draft data. Trending requires real approved data. |
| Article summary / editorial listing | Communicate headline, available metadata and link to canonical article. | No fake counts; approved images and credits; maintain order and tap target when responsive. |
| Rich article content | Readable body, images, captions, accessible embeds, public corrections and related stories. | Sanitise content per future security design; no private review notes; preserve heading semantics and accessible media. |
| Radio player | Intentional play/pause, buffering/status and volume where supported. | Idle, loading, playing, paused, buffering, offline/error and retry where possible; LIVE only if verifiable; stream required for launch. Do not autoplay. |
| Video/episode item and embed | Browse approved recordings with title, thumbnail, available metadata and intentional playback. | Lazy load third-party player; unavailable/removed state and useful external link; transcripts/captions only when supplied. |
| Notice, alert and status | Explain success, warning, failure, review or publication state with clear language. | Meaning is conveyed in text; use suitable live-region behaviour only when needed; don't overwhelm screen readers with repeated updates. |
| Dialog / confirmation | Confirm consequential staff actions. | Describe action and consequences, offer cancel, manage focus, support keyboard close where appropriate, and restore focus on dismissal. Exact implementation and destructive actions require review. |
| Data list / table | Present real admin records and permitted actions. | Preserve headers and row relationships at narrow widths; loading, empty, error, denied and pagination states; never expose restricted records. |
| Editorial editor and private preview | Create, save, review and inspect content. | Accessible controls, validation, save/failure and unsaved-change handling; preview is private and authorised. Rich-text tool evaluation is pending. |
| Upload / media picker | Select permitted media and show provenance. | File type/size limits to be agreed, progress and failure handling, credits, server-side validation and storage permissions; don't trust client-side checks. |
| Empty / not-found / error | Explain absence or failure and next useful action. | No sample data, false success or internal error details; support a meaningful retry or navigation path where applicable. |

For target size, aim for at least 44 × 44 CSS px where practical, while meeting WCAG 2.2 AA's 24 × 24 CSS px minimum target-size criterion or its applicable exceptions. This is not a substitute for actual touch testing.

## 7. Page-specific design application

- **Homepage:** clear brand introduction, authentic approved imagery, radio player and actual news/media highlights. Only approved and available future-area previews; no fictional content or newsletter entry.
- **News:** strong masthead and headline hierarchy, dates/authors/credits near stories, restrained category distinctions; keep correction information discoverable and private review history private.
- **Contact:** general form and approved WhatsApp; show privacy information and honest submission outcomes. It is neither Speak Up Epe nor an emergency service. The number and form operations remain unknown.
- **Admin:** real counts and statuses, clear role-appropriate actions, readable edit/review surfaces and explicit feedback. Server-side access controls remain essential regardless of presentation.
- **Radio and media:** do not claim a live state or playable embed without verification. Distinguish loading, buffering, offline and failure; provide available recorded content on outages. Radio must work at launch.

Low-fidelity page layouts and acceptance conditions are in [04-page-specifications.md](04-page-specifications.md); that document is the page-level source of truth, while this document defines shared visual and interaction principles.

## 8. Accessibility, performance and verification

**Target:** WCAG 2.2 AA where practical, with documented review and exceptions; no conformance claim is made before testing. Requirements include semantic HTML, logical landmarks and headings, keyboard-only navigation, visible focus, accessible names, errors associated with fields, sufficiently contrasting content and controls, non-colour cues, meaningful alt text, and captions/transcripts where available.

**Proposed verification before release:**

1. Run automated accessibility checks on representative public and admin pages, then manually test keyboard flows, focus visibility/order, menu/dialog behaviour and form error announcements. Automated tools alone cannot establish conformance.
2. Test with a screen reader on supported desktop and mobile combinations, with real participants where appropriate; record environment and unresolved issues.
3. Check text resize, zoom/reflow, narrow widths and target sizes; test labels and statuses rather than colour alone. Recalculate contrast on final state colours, images and overlays.
4. Test low-bandwidth/slow-device paths: responsive images, sensible font loading, user-initiated embeds, media errors and data usage. Agree measurable budgets later rather than inventing targets.
5. Verify approved asset licences and credits; avoid loading large third-party scripts on pages where they are unnecessary. Respect reduced-motion preferences; keep motion functional and optional where possible.

## 9. Review, decisions and dependencies

- The owner approved the proposed visual direction and page layouts as part of Workstream 0.4; exact logo, brand assets, authentic Epe images and image permissions remain unavailable or unverified. Final component choices still require validation.
- The direct radio stream and permission are launch blockers; WhatsApp number and form recipient/handling remain open. Third-party embed functionality and legal notices require verification.
- Font licensing, language coverage, component state colours, final breakpoints, responsive prototypes and quantitative performance/accessibility test plans need further validation. Later technical, security and acceptance workstreams define implementation specifics.
- Research has not yet been conducted; this design is an informed hypothesis, not a user-validated design. Preserve findings and request approval for material changes.

**Approval record:** Owner approved Workstream 0.4 (documents 04 and 05) on 2 November 2026. Approval of this workstream is not approval of all Phase 0 or permission to begin production coding.
