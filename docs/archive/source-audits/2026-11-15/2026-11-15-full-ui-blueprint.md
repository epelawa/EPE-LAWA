# EPE LAWA — Full UI Blueprint & AI Implementation Directive

**Date:** 15 November 2026
**Repository:** `epelawa/EPE-LAWA`
**Design reference:** `wide_mockup_ui_design_image_showing_a_clean_profe.png` (concept mockup; not a screenshot of the deployed website)

---

## 1. The intended visual direction

Treat the generated desktop-and-mobile mockup as the visual north star. It represents a clean, confident, locally grounded editorial platform for Epe — not a generic SaaS template and not a clone of the current deployed site.

### Brand character

- Institutional, editorial, community-first, trustworthy and contemporary.
- A recognisable EPE LAWA identity with a strong wordmark and the existing local landmark/heritage mark where approved.
- Navy and cobalt as the primary brand colours; white and cool, very pale blue as the main surfaces.
- Real Epe photography as the dominant visual material: waterfront, streets, landmarks, people, cultural events and local businesses. Use only approved, accurately captioned/credited media.
- No neon, purple/pink glow, particle effects, glassmorphism overload, AI-generic gradients, fake testimonials, fake news, fabricated activity, or decorative dashboard clutter.

### Design tokens (starting proposal; reconcile with `docs/05-design-system.md`)

| Token | Value | Use |
|---|---|---|
| Brand navy | `#10264D` | Header text, footer, primary dark surfaces |
| Deep navy | `#0B1B38` | Footer and high-contrast sections |
| Brand cobalt | `#2457C5` | Primary actions, active states, links |
| Cobalt hover | `#1D49A8` | Hover/pressed action state |
| Pale blue | `#EAF1FC` | Alternating section surfaces |
| Cool white | `#F8FAFD` | Page background |
| White | `#FFFFFF` | Cards and navigation |
| Ink | `#17243A` | Main body text |
| Muted text | `#64748B` | Metadata and supporting copy |
| Border | `#DCE4F0` | Dividers and control borders |
| Success | `#18794E` | Confirmed success only |
| Warning | `#A65B12` | Caution and pending states |
| Error | `#B42318` | Validation and failure |

Use CSS variables and semantic tokens, not scattered hex literals. Confirm contrast against WCAG 2.2 AA. Do not treat these proposed values as permission to overwrite a documented, tested token without checking the existing design-system source.

### Typography and layout

- Use the existing approved font stack if already loaded. Otherwise use a modern sans-serif such as Plus Jakarta Sans for UI and body text; use an editorial serif only for selected long-form article headlines if it improves the publication character.
- Desktop content width: approximately 1180–1280px, centred; use consistent gutters and a 12-column grid where useful.
- Mobile: single-column content, readable 16px body text, comfortable 44px minimum interactive targets, no horizontal overflow at 320px.
- Use an 8px spacing rhythm. Establish clear page title, intro, section heading, content and metadata hierarchy.
- Cards should be used for discrete content units, not as wrappers around every paragraph. Prefer editorial rows, image-led story cards, section bands and clear whitespace.
- Radius should be restrained and consistent. Avoid huge pill-shaped panels and excessive rounded corners.
- Motion should be subtle and purposeful; respect `prefers-reduced-motion`; no autoplaying carousels.

---

## 2. Global public-site shell

### Desktop header

- White, compact, sticky or static according to existing accessibility/performance behaviour; do not create layout shift.
- Left: EPE LAWA logo and wordmark.
- Centre/right: grouped navigation with clear labels: News; Community; Discover; About.
- Right: search action and Sign in/account action.
- Dropdowns must be keyboard accessible, have visible focus, close predictably, and not rely on hover alone.
- Keep the header height controlled. Do not let the navigation become a large floating pill that consumes the first viewport.

### Mobile header

- Logo/wordmark left; search and menu controls right.
- Use an accessible drawer with grouped navigation, clear section labels, account access and close control.
- Avoid nested menus that trap users. All routes must remain reachable with touch and keyboard.

### Footer

- Deep navy background with high-contrast text.
- Four logical groups: brand/about; Quick Links; Discover; About/Legal; plus a compact Stay Connected area if real social destinations exist.
- Newsletter form only if subscription backend, consent language, validation and confirmation are actually implemented. Otherwise omit it or show a truthful disabled/unavailable state.
- Include copyright and direct links to Privacy, Terms and Community Guidelines.
- Do not invent social accounts or contact details.

### Shared page pattern

Most public pages should use: breadcrumb where useful → page title → concise intro → primary content → related links/action → footer. Editorial and directory pages may diverge when a more useful information architecture is required.

---

## 3. Full public UI overview

### `/` — Homepage

1. Global header.
2. Hero: wide real Epe waterfront/landmark photograph, strong left-aligned headline “Epe. Closer to home.”, concise value proposition, primary “Explore Epe” action and secondary “Read the latest” link. Add a gradient/overlay only as needed for text contrast.
3. Latest stories: editorial grid with image, category label, headline, short summary, date and author/source. Never show fabricated stories or dates.
4. Discover Epe: visually distinct module links for News, Ìtàn Ilú Mi, Community/Forum, Business Directory, Tourism, Radio, Who is Who, and Map & Navigation. Use consistent iconography and short descriptions.
5. Optional community/local highlight only when backed by real content.
6. Footer.

The hero must not become a text-on-random-stock-photo template. The local image and headline are the signature.

### `/news` — News index

- Publication-style masthead/title and concise editorial introduction.
- Featured lead story with large landscape image and a clear headline/summary.
- Secondary story grid/list with consistent image ratios, category, date, byline and excerpt.
- Category filters/search only if backed by functioning query state and accessible controls.
- Pagination or load-more with real pagination state; show a deliberate empty state when there are no published stories.
- Empty state: explain that no stories are currently published; provide a useful return/explore action. Do not use a fake article card to fill space.

### `/news/[slug]` — Article detail

- Breadcrumb and category; strong headline; dek/summary; author, publication date and updated date when real.
- Lead image with credit/caption; comfortable reading column; clear headings, lists and inline media.
- Share controls only when functional; related stories only from real published records.
- Include accessible back-to-news navigation. Handle missing/unpublished slugs with a real not-found state.

### `/about` — About EPE LAWA

- Institutional introduction and mission.
- Explain the platform’s purpose and the communities/areas it serves using approved facts.
- Use real local imagery and a concise set of principles/areas of work.
- Do not invent founders, staff, legal status, statistics or partnerships.

### `/business-directory` — Business directory

- Search-first page with clear title, purpose and filters only for supported fields.
- Business cards/list rows: verified name, category, location, approved logo/photo, short description and contact/action if available.
- Clear verified/unverified status based on actual moderation data.
- Honest empty, no-results and loading states.
- Do not imply checkout/marketplace purchasing if the approved release is listings-only or payment integration is not ready.

### `/business-directory/[slug]` — Business detail

- Business name, category, verification state, location, description, approved images, operating hours/contact only if recorded.
- Primary contact action (call/WhatsApp/website) only when a valid destination exists.
- Related businesses only when real and relevant.

### `/business-directory/submit` — Submit a listing

- Explain review/moderation before form submission.
- Group fields logically; labels always visible; inline validation; clear privacy/consent notice.
- Confirmation must correspond to a successful server response. Preserve safe user input after validation errors.

### `/business-directory/orders`

- Treat this as a scope-sensitive route. Confirm approved phase and payment/order implementation before designing a commerce workflow.
- If no live order functionality is approved, show a clear unavailable/not-in-this-release state; do not invent carts, orders or payment success.

### `/forum` — Forum index

- Community landing with category/topic navigation and recent threads only from real records.
- Show author, timestamp, category and reply count only when those values are real.
- Sign-in prompt for gated actions.
- Strong moderation/reporting affordances without visual clutter.

### `/forum/category/[slug]` — Forum category

- Category title/description; thread list; sorting/filtering only when implemented; pagination.
- Clear empty state and create-thread action according to permission.

### `/forum/thread/[slug]` — Thread detail

- Thread title, author and date; readable post body; replies in chronological hierarchy.
- Reply form gated by actual authentication/permission; report action; deleted/locked states handled honestly.

### `/forum/new` — Create thread

- Simple focused editor with title, category and body; validation; submission status; safe draft preservation where supported.
- Never display a success state until server confirms creation.

### `/itan-ilu-mi` — Ìtàn Ilú Mi / community history

- Editorial archive feel: history introduction, topic/story groupings, timelines or featured contributions only where source data exists.
- Clear source/author/date attribution and contribution route if supported.
- Respect spelling/diacritics and local naming conventions.

### `/map` — Map & Navigation

- Explain the current capability honestly: safe outbound map search/directions if no verified Places/geocoding integration exists.
- Search and destination cards should work on mobile; outbound links must be valid and clearly labelled.
- Do not show fake pins, distances, opening hours or live location claims.

### `/tourism` and `/tourism/[slug]`

- Destination discovery with real images, concise descriptions, location and practical visitor information only when verified.
- Detail page: image gallery, story/context, location/directions action, accessibility/contact details only when available.
- No invented opening hours, fees or visitor statistics.

### `/radio` — EPE LAWA Radio

- Prominent, accessible player with explicit play/pause and playback status.
- Station identity, now-playing only if actual metadata exists, schedule only if maintained, and archive only if real recordings exist.
- Clear offline/unavailable/error state; no fake live badge or fabricated schedule.
- Test at 320px and 375px widths; no overflow.

### `/who-is-who` and `/who-is-who/[slug]`

- Search/listing page with approved public profiles only.
- Profile card: portrait, name, role/description and location/affiliation only if approved.
- Detail: biography, public achievements and links with consent/verification process.
- No fabricated people, titles, affiliations or profile counts.

### `/gallery`

- Real approved image archive with captions, credits, responsive grid and accessible lightbox if implemented.
- Honest empty state when no approved media exists.

### `/contact`

- Show only verified contact channels and actual enquiry workflow.
- If no backend exists, provide real contact information if approved; do not display a form that silently drops submissions.

### `/advertise`

- Explain genuine advertising opportunities and enquiry process.
- No invented reach, audience statistics, rates or guaranteed outcomes.
- Clearly label sponsored placements wherever they appear.

### `/privacy`, `/terms`, `/guidelines`, `/photo-credits`

- Legal/policy pages should be plain, readable documents, not marketing cards.
- Narrow reading column, clear hierarchy, effective date/version and meaningful section anchors.
- Content must match actual data collection, moderation, retention, attribution and operational practices. Legal text requires client/legal approval.

---

## 4. Authentication and member experience

Routes include `/auth`, `/auth/complete`, `/auth/verify`, `/auth/new-password`, `/auth/link-expired`, `/auth/link-problem`, `/login`, `/forgot-password` and `/dashboard`.

- Use a calm, focused auth layout with EPE LAWA identity and no distracting public navigation overload.
- Forms need visible labels, password visibility control, clear validation, pending state and server-confirmed result state.
- Verification, expired link, callback failure and password reset states each need a specific explanation and next action.
- Do not reveal whether an arbitrary email address has an account where that would enable account enumeration.
- Member dashboard should prioritise account status, profile, contributions and available actions that actually exist.
- Empty dashboard modules should be omitted or explained; do not invent activity, points, notifications or contribution counts.

---

## 5. Staff/admin workspace

The repository contains `frontend/apps/admin` and admin route files under the main app. Establish one canonical implementation and make any same-origin routes a deliberate, tested compatibility layer. Do not allow two divergent dashboards.

### Admin shell

- Separate workspace identity from public site while retaining EPE LAWA branding.
- Desktop: fixed/collapsible sidebar, compact top bar, page title, breadcrumbs, account/session menu.
- Mobile: accessible navigation drawer; tables become responsive cards or horizontally scrollable with clear affordance.
- Use neutral surfaces, clear status colours and dense-but-readable information architecture. This is an operational workspace, not a public marketing page.

### Admin dashboard

- Only show metrics that are computed from actual authorized data and label their time range.
- Useful overview areas: editorial queue, recent moderation, pending listing reviews, operational notices, system health where implemented.
- Do not invent charts, counts, trends or activity.

### Newsroom

- Article list with status, author, updated date and permitted actions.
- Editor: title, slug, summary, body, category, lead image/credit, preview, save draft and publish controls.
- Respect the repository’s actual capability model: publishing requires verified staff session and `article.publish`; stale revisions must be rejected and transitions audited. Do not add an invented mandatory second reviewer if the product rules do not require one.
- Clear autosave/save result and conflict/error handling.

### Staff users and roles

- Staff list with role/capability summary and status; no secrets or sensitive tokens.
- Role editor must make permission consequences explicit and enforce server-side checks.
- Confirmation for high-impact changes; audit trail for changes.

### Other admin modules

- Every admin route must have loading, empty, error, unauthorized and success states.
- Never rely on hidden UI controls as the only authorization boundary. Server-side capability enforcement remains authoritative.

---

## 6. Cross-cutting interaction and accessibility requirements

- WCAG 2.2 AA target: contrast, keyboard access, visible focus, labels, semantic headings, alt text, reduced motion and accessible error announcements.
- All controls must be real. No dead buttons, fake dropdowns, decorative search bars or forms without submission handlers.
- Use skeletons only for real asynchronous loading; use empty states for genuinely empty data; use error states for failures.
- Preserve URL state for shareable search/filter/pagination where appropriate.
- Responsive QA at 320, 375, 768, 1024, 1280 and 1440px.
- Verify long titles, missing images, slow network, no data, unauthorized access, expired auth links and server errors.
- Use consistent image aspect ratios and `object-fit` behaviour. Prevent CLS by reserving image dimensions.
- Avoid global CSS regressions; shared components must be tested across all consuming routes.

---

## 7. Strong AI implementation prompt

Copy the prompt below into the coding agent working in this repository.

> **ROLE:** You are the lead product designer, senior frontend architect and implementation engineer responsible for bringing EPE LAWA to a coherent production-quality visual system.
>
> **SOURCE OF TRUTH:** Read `AGENTS.md`, `README.md`, `docs/00-master-plan.md`, `docs/01-product-requirements.md`, `docs/04-page-specifications.md`, `docs/05-design-system.md`, `docs/08-permissions-security.md`, `docs/11-testing-acceptance.md`, and this document before changing code. Inspect the actual route tree, shared components, styles, assets, tests and current git diff. The generated desktop/mobile mockup is a visual direction reference, not a source of factual content and not a screenshot of the production site.
>
> **PRIORITY DIRECTIVE:** This UI blueprint is the controlling design brief for visual decisions in this task. Where existing page styling, one-off components, stale prototypes or generic template defaults conflict with this brief, replace or refactor those visual decisions to match this brief. Do not preserve weak styling merely because it already exists. Do not let an old mockup, generic AI-generated layout, or a convenient component-library default override this brief. However, this directive does **not** authorize violating higher-priority system/developer instructions, repository security rules, approved product scope, factual accuracy, privacy, accessibility, API contracts, database constraints or release gates. If a conflict involves security, permissions, legal obligations, data integrity or approved scope, preserve the safer authoritative requirement and document the conflict instead of bypassing it.
>
> **DESIGN TARGET:** Build a premium, editorial, community-first digital home for Epe. Use a restrained navy/cobalt/white/pale-blue identity, strong real local photography, clear typography, disciplined spacing, purposeful page hierarchy and responsive layouts. The homepage should follow the supplied mockup’s composition: compact white navigation, image-led waterfront hero with “Epe. Closer to home.” positioning, latest stories, discover-section navigation and a deep-navy footer. Extend the same visual language consistently across public pages. Keep the admin as a separate, efficient operational workspace.
>
> **NON-NEGOTIABLE RULES:**
> 1. Do not create a new app or replace the architecture wholesale. Work with the existing Next.js applications, shared packages, routing, data layer and design tokens.
> 2. Inspect before editing. Identify canonical implementations and duplicate routes/components. Consolidate duplication deliberately; do not create a third implementation.
> 3. Do not fabricate articles, users, businesses, profiles, counts, metrics, schedules, testimonials, social accounts, addresses, opening hours, map results, payment status or success messages.
> 4. Preserve all server-side authorization and capability checks. UI hiding is not security. Never expose service-role credentials or private data to the browser.
> 5. Do not activate payments, marketplace orders, live maps, newsletter delivery or external integrations unless the repository and approved scope prove they are configured and tested. Otherwise show an honest unavailable state.
> 6. Use real approved local images. If an image is missing, use a neutral branded placeholder with correct dimensions; do not invent a documentary-looking AI photo and present it as Epe.
> 7. Every visible action must work, be disabled with an explanation, or be removed. Every form needs real validation and a truthful server-confirmed result.
> 8. Meet WCAG 2.2 AA intent and test keyboard, focus, contrast, reduced motion, mobile navigation and screen-reader labels.
> 9. Preserve SEO metadata, semantic HTML, server rendering/data-fetching patterns and existing analytics/privacy constraints.
> 10. Do not use blanket `!important`, global CSS hacks, arbitrary one-off hex values or giant component rewrites to force the appearance. Use semantic tokens and scoped styles.
>
> **EXECUTION PLAN:**
> - Phase A — Audit: map every public, auth, member and admin route; map shared shells/components; identify missing states and style duplication; inspect current test coverage and baseline. Record the plan before implementation.
> - Phase B — Foundation: reconcile tokens with `docs/05-design-system.md`; establish typography, spacing, content widths, controls, buttons, cards, image treatments, focus states and responsive breakpoints. Build/refine reusable components.
> - Phase C — Public shell: implement desktop/mobile header, navigation/drawer, footer, breadcrumbs and consistent page container.
> - Phase D — Public pages: redesign homepage, News index/detail, About, directory/listing/detail/submit, Forum/category/thread/new, Ìtàn Ilú Mi, Map, Tourism/index/detail, Radio, Who-is-Who/index/detail, Gallery, Contact, Advertise and legal/policy pages. Keep each page’s information architecture appropriate; do not turn every page into the same card grid.
> - Phase E — Account: refine sign-in, registration, verification, callback, recovery, expired/error and member dashboard states.
> - Phase F — Admin: consolidate canonical staff shell and redesign dashboard, newsroom, users and roles with capability-aware actions and clear operational states.
> - Phase G — Verification: run formatter/linter, typecheck, unit/integration tests, production build and Playwright flows available in the repo. Capture desktop and mobile screenshots for every route, including empty/error/unauthorized states. Test 320px and 375px widths and confirm no horizontal overflow. Fix regressions before completion.
>
> **DELIVERABLES:** Implement the UI, not merely describe it. Provide a route-by-route completion matrix, changed-file summary, design-token summary, screenshot locations, commands run and actual test results. Clearly list anything blocked by missing data, credentials, approved copy or integration. Do not claim a route or test is complete without evidence. Do not deploy or write production data unless separately authorized.
>
> **DONE MEANS:** The site feels like one deliberate EPE LAWA product; the homepage resembles the supplied design direction; all routes have consistent quality and correct states; mobile layouts work; admin remains secure and usable; no fake data or dead interactions are introduced; and build/tests/screenshot evidence are reported accurately.

---

## 8. Acceptance checklist

- [ ] Homepage desktop and mobile align with the supplied visual direction.
- [ ] Header, drawer, footer and page containers are consistent.
- [ ] Every public route has an intentional layout and real content/empty/error state.
- [ ] Dynamic detail routes handle missing and unpublished records correctly.
- [ ] Auth and member flows are visually coherent and security-preserving.
- [ ] Admin routes share one canonical shell and enforce server-side capabilities.
- [ ] No fake records, metrics, social links, schedules or success states.
- [ ] No dead controls or non-submitting forms.
- [ ] Keyboard, focus, contrast, reduced motion and mobile touch targets are verified.
- [ ] No horizontal overflow at 320px/375px.
- [ ] Screenshots exist for all routes and important states.
- [ ] Lint, typecheck, tests and production build results are recorded honestly.
- [ ] Any remaining blockers are explicit and assigned.
