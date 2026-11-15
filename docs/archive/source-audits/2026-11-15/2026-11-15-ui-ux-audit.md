# EPE LAWA — Complete UI/UX Audit & Redesign Direction

**Review date:** 15 November 2026
**Repository:** [epelawa/EPE-LAWA](https://github.com/epelawa/EPE-LAWA)
**Reviewed source baseline:** `main` — `a6230fc3890be02f7ed2551a5af64ca5144bbc44`
**Public URL:** https://epelawa.vercel.app
**Purpose:** Page-by-page visual and experience review, including public routes, account flows, staff-only routes, dynamic detail pages, unavailable/empty states, and a coherent redesign direction.

---

## 1. Executive design verdict

EPE LAWA has a recognisable idea: a digital home for Epe's stories, heritage, people, places and businesses. The homepage already has a strong headline and a real local landmark image. The design system and shared page primitives are a useful foundation.

The problem is not that every page is ugly. The problem is **consistency, hierarchy, maturity and completeness across the whole product**.

The homepage, News, community modules, account pages and staff workspace need to feel like one institution. They should not feel like separate experiments assembled at different times. Some routes are genuine functional experiences; some are deliberately honest empty states; some are operational status pages; and some are protected workspaces. Each deserves a different visual treatment, but all must share the same design language.

### Overall design recommendation

Build EPE LAWA as a **premium community institution and editorial platform**, not as a generic SaaS dashboard and not as a glossy template.

- Brand: confident navy, cobalt, warm white and restrained pale blue.
- Editorial accent: a muted deep green may be used inside News only if it remains a deliberate secondary accent.
- Typography: Plus Jakarta Sans for interface and navigation; use a restrained editorial serif only for selected article display headings if the team wants a more newspaper-like voice.
- Layout: generous but disciplined spacing, clear content widths, fewer oversized empty cards, stronger information hierarchy.
- Imagery: real, locally relevant, properly credited photography. No generic AI people, fake news photography, invented testimonials or decorative stock photos.
- Motion: subtle transitions, no constant animation, no carousel autoplay by default, respect reduced motion.
- Interaction: every visible action must work, be disabled with a reason, or be labelled unavailable.
- Trust: no fabricated article cards, business listings, profile counts, activity feeds, radio schedules or success messages.

**Do not rewrite the entire UI from scratch.** Consolidate shared components, fix the design tokens, and redesign the weak page templates while preserving the useful server-side and security architecture.

---

## 2. Evidence, scope and screenshot limitations

### Source review performed

The route inventory was taken from the current `main` application tree. The review inspected the page source for the homepage, About, News, Business Directory, Forum, Ìtàn Ilú Mi, Map, Radio, Tourism, Who is Who, Contact, Advertise, Privacy, Terms, Guidelines, Photo Credits, Gallery, Login, Member Dashboard, Admin Dashboard, Admin Login, Newsroom, Staff Users and Roles.

The repository also contains a substantial screenshot/artifact archive. It includes homepage captures, News layout experiments, News responsive captures, Admin login and dashboard captures, staff role captures, auth mobile captures, Radio captures and theme captures.

**Important screenshot distinction:** the PNG files are present in GitHub, but the binary image-fetch interface available for this review rejected the PNG payloads. I therefore cannot honestly claim to have visually inspected every stored PNG in this session. The screenshots are indexed below as evidence to open, and the page-by-page findings distinguish code-confirmed observations from visual risks requiring fresh capture. The user-supplied mobile screenshots were visually inspected and are used as direct visual evidence for the current public shell, homepage, News empty state and drawer.

This is a source-backed UI audit, not a claim that every protected page was live-tested with a staff account. Admin pages require authorized preview credentials for a true visual and interaction audit.

### Current route inventory

#### Public routes

| Route | Page / purpose | Audit classification |
|---|---|---|
| `/` | Homepage | Core public landing |
| `/about` | About EPE LAWA | Institutional information |
| `/news` | News index | Editorial listing |
| `/news/[slug]` | Article detail | Dynamic editorial detail |
| `/advertise` | Advertising information | Commercial enquiry status |
| `/contact` | Contact availability | Operational status page |
| `/privacy` | Privacy notice | Legal/institutional |
| `/terms` | Terms of use | Legal/institutional |
| `/guidelines` | Community/editorial guidelines | Policy/institutional |
| `/photo-credits` | Image attribution | Trust/credits |
| `/gallery` | Visual archive | Empty-state archive |
| `/itan-ilu-mi` | Community history | Public records + contribution |
| `/forum` | Forum index | Community discussion |
| `/forum/new` | Create thread | Authenticated interaction |
| `/forum/category/[slug]` | Forum category | Dynamic category |
| `/forum/thread/[slug]` | Thread and replies | Dynamic discussion |
| `/map` | Map and navigation | Search/outbound directions |
| `/business-directory` | Directory | Search and listings |
| `/business-directory/[slug]` | Business detail | Dynamic listing |
| `/business-directory/submit` | Submit a listing | Contribution workflow |
| `/business-directory/orders` | Orders | Account/order workflow; scope must be confirmed |
| `/tourism` | Tourism index | Destination discovery |
| `/tourism/[slug]` | Destination detail | Dynamic destination |
| `/radio` | Radio | Player, schedule and archive |
| `/who-is-who` | People directory | Search and profiles |
| `/who-is-who/[slug]` | Person detail | Dynamic profile |

#### Account and authentication routes

| Route | Purpose |
|---|---|
| `/auth` | Registration / account entry |
| `/auth/complete` | Auth completion callback |
| `/auth/verify` | Email verification |
| `/auth/new-password` | Set new password |
| `/auth/link-expired` | Expired auth link |
| `/auth/link-problem` | Auth link error |
| `/login` | Member sign in |
| `/forgot-password` | Password recovery |
| `/dashboard` | Member account dashboard |

#### Admin routes

The repository contains both the canonical `frontend/apps/admin` application and same-origin Admin route files under `frontend/apps/main/app/admin`. Treat one as canonical and ensure the other is a deliberate compatibility layer, not two divergent implementations.

| Admin route | Purpose |
|---|---|
| `/admin/login` | Staff login |
| `/admin` | Staff overview |
| `/admin/newsroom` | Article workflow |
| `/admin/newsroom/new` | New article |
| `/admin/newsroom/[id]` | Edit/review article |
| `/admin/newsroom/settings` | Newsroom configuration |
| `/admin/roles` | Role/capability management |
| `/admin/users` | Staff user management |
| `/admin/people` | Who is Who administration |
| `/admin/tourism` | Tourism administration |
| `/admin/radio` | Radio administration |
| `/admin/moderation/forum` | Forum moderation |
| `/admin/itan-ilu-mi/review` | History contribution review |
| `/admin/business-review` | Business review |
| `/admin/business-review/moderation` | Business moderation |
| `/admin/orders` | Order administration |

A route existing in the tree does not prove it is linked, deployed, permission-accessible or fully operational.

---

## 3. Current visual issues confirmed by the supplied screenshots

### 3.1 Floating header competes with the page

The header is a large floating white capsule with logo, sign-in and hamburger. It looks polished in isolation, but on the supplied News screenshot it overlaps the heading (“Here’s the latest”) while the user scrolls. The capsule also consumes significant vertical space on a narrow mobile viewport.

**Change**
- Use a compact sticky header, 68–76px desktop and 60–68px mobile.
- Keep a small, clean logo lockup.
- Give the page a real top offset and use `scroll-margin-top` for anchored headings.
- Avoid a permanent oversized pill floating over content.
- Use a subtle border and very restrained shadow, not a heavy glass effect.
- On mobile, keep logo, search (where relevant) and menu aligned on one row.

### 3.2 Drawer is too dominant

The supplied drawer is a tall white panel that covers most of the viewport. The blurred background is visually noisy, and the navigation list feels like a long ungrouped list.

**Change**
Group destinations into clear sections:
- **Read:** News, Radio
- **Community:** Ìtàn Ilú Mi, Forum, Who is Who
- **Explore:** Map, Business Directory, Tourism
- **EPE LAWA:** About, Contact, Guidelines
- **Account:** Dashboard, Sign in, Create account

Use a compact top area, one clear close control, visible active item, and a separate account action area. Do not make every destination look equally important.

### 3.3 Homepage hero is strong but should become more editorial

The “Epe. Closer to home.” headline is the strongest brand asset. Keep it. The hero image should tell a local story rather than act as a generic decoration.

**Change**
- Use one strong landscape image with an editorial crop.
- Keep the headline large but avoid forcing the full hero into a single tall mobile viewport.
- Use one primary CTA (“Explore Epe”) and one secondary CTA (“Read the latest”).
- Add a concise location/identity line.
- If a carousel remains, provide manual controls, pause behavior and reduced-motion support. Do not autoplay by default.
- Add a clear latest-stories section immediately after the hero.

### 3.4 News empty state consumes too much space

The supplied screenshots show an oversized empty panel, with a large amount of whitespace and a generic symbol. The message is honest, which is good, but the panel feels like a placeholder card rather than an editorial publication.

**Change**
- Use a compact, newsroom-style empty state.
- Add a small editorial icon or no icon.
- Use a short heading and one sentence.
- Provide a “Visit the newsroom” link only if the destination is appropriate for the viewer; ordinary visitors should not be sent to a protected staff route.
- If there are no stories, remove “Trending” and “Breaking” sections entirely.
- Avoid large empty card borders and oversized decorative shapes.

**Critical:** never fabricate sample news cards to make the page look busy.

### 3.5 Too many oversized rounded panels

Several supplied views rely on large rounded cards and pale blue blocks. This can make the site feel like a component demo rather than a serious public institution.

**Change**
- Reserve large cards for important feature moments.
- Use simple editorial grids, thin dividers and restrained surfaces for ordinary content.
- Standardise radii: 10–14px for controls, 14–18px for cards, 20–24px only for major hero/feature surfaces.
- Reduce nested panels inside panels.
- Use whitespace to establish hierarchy, not to inflate empty content.

---

## 4. The new design system

### 4.1 Brand palette

Retain the existing EPE LAWA cobalt identity and make its application consistent.

| Token | HEX | Use |
|---|---|---|
| Midnight | `#0A1023` | Main text, footer, deep surfaces |
| Navy | `#17264A` | Brand surfaces, navigation, footer |
| Royal Steel | `#294B91` | Secondary brand and links |
| Cobalt | `#477FE0` | Primary actions, focus, active state |
| Ice Blue | `#A7C5F5` | Soft highlight, selected surfaces |
| Cloud | `#F1F4FA` | Main page background |
| White | `#FFFFFF` | Cards and content surfaces |
| Slate | `#65718A` | Secondary text |
| Border | `#DCE3EF` | Dividers and outlines |
| Success | `#287A58` | Verified/success states |
| Warning | `#94651D` | Pending/unavailable |
| Danger | `#B53A45` | Destructive/error |

Do not use cobalt for every icon and every heading. The brand accent should guide the eye, not colour every object.

### 4.2 News editorial accent

A restrained dark green can be used as a News-only editorial accent, but it must not create a second unrelated identity. The News section should still share:
- EPE LAWA logo and masthead rules
- header geometry
- body typography
- spacing scale
- buttons and focus states
- footer and policy links

If the client wants one single identity, remove the green accent and use navy/cobalt throughout.

### 4.3 Typography

- Interface/body: Plus Jakarta Sans.
- Display: Plus Jakarta Sans with controlled weight and letter spacing.
- Optional editorial serif: article headline only, if it materially improves the publication identity.
- Body copy: 16–18px desktop; never below 16px on mobile for primary reading.
- Body line-height: 1.55–1.7.
- Article line length: approximately 60–75 characters.
- Avoid all-caps long labels and excessive letter spacing.
- Avoid multiple font families competing across modules.

### 4.4 Layout scale

- Desktop content max width: 1200–1280px.
- Article reading width: 680–760px.
- Main gutters: 32–48px desktop, 20–24px tablet, 16–20px mobile.
- Section spacing: 64–88px desktop, 44–60px mobile.
- Card gap: 20–24px desktop, 14–16px mobile.
- Use a 12-column desktop grid, 6-column tablet grid and 4-column mobile grid where appropriate.

### 4.5 Components to standardise

Create/retain one source of truth for:
- PublicHeader and PublicFooter
- NewsMasthead and NewsFooter
- PageFrame, PageIntro and SectionHeading
- Button variants
- TextLink
- SearchField and FilterBar
- EmptyState, ErrorState, LoadingState and UnavailableState
- StatusBadge
- ArticleCard, ArticleMeta and ArticleBody
- DirectoryCard and PersonCard
- FormField, FormError and FormSuccess
- Modal/Drawer with focus handling
- Pagination
- Breadcrumbs
- Cookie/storage notice

Do not create slightly different versions of the same component in every module.

---

## 5. Page-by-page audit and redesign directions

The ratings below are design-review priorities, not measured Lighthouse scores.

### 5.1 Homepage — `/`

**Current direction:** memorable hero headline, local imagery, module links and community messaging.

**Problems / risks**
- Header collision on scroll is visible in the supplied screenshot.
- Hero carousel risks competing with the headline and calls to action.
- Large cards and repeated rounded surfaces can flatten visual hierarchy.
- The page needs a clear route from brand promise to useful content.
- The latest-stories empty state needs to be less dominant.

**Recommended layout**
1. Compact public header.
2. Hero with local documentary image, headline and two actions.
3. Latest stories: 1 lead story + 2 supporting stories when real content exists.
4. “Explore Epe” section: eight modules as a clean icon-and-label grid.
5. Community feature: Ìtàn Ilú Mi / people / local contributions.
6. Local business feature, only if approved listings exist.
7. A concise “About EPE LAWA” statement.
8. Professional footer with grouped navigation.

**Do not:** add fake article previews, fake business statistics, random testimonials or a large newsletter form that does not submit.

### 5.2 About — `/about`

**Current source direction:** shared PageFrame/PageIntro/Panel, institutional story and a link to contact availability.

**Problems / risks**
- A single large prose panel can feel like a placeholder.
- “The people behind it” is weak if it only says details will appear later.
- The page needs a clearer institutional voice and ownership transparency.

**Recommended layout**
- Page intro: “A shared home for Epe.”
- Short mission statement.
- Three principles: Local knowledge, responsible publishing, open community.
- What the platform contains, grouped by purpose.
- Who operates it, using only confirmed names/roles.
- How content is reviewed and how corrections are handled.
- Contact route that actually works.

**Do not:** invent founding dates, staff identities, partnerships or impact statistics.

### 5.3 News index — `/news`

**Current source direction:** published-only article query, search/category/pagination, breaking flags, editorial stylesheet and a dedicated footer.

**Problems / risks**
- Supplied mobile screenshot shows a large empty state.
- The supplied News screenshot shows the global header overlapping content.
- A page that technically loads but displays a database error is not a completed newsroom.
- The editorial palette can drift away from the main brand.

**Recommended layout**
- Compact masthead with EPE LAWA mark and “News”.
- Search icon/field with a clear expanded state.
- Category navigation that scrolls horizontally on mobile.
- Lead story layout: image, category, headline, short summary, date/byline.
- Supporting stories in a 2–3 column desktop grid and single-column mobile list.
- Clear pagination or load-more pattern.
- Compact empty/error state.
- No newsletter form until a real consent and delivery system exists.

**Content hierarchy:** story title first, then summary, then byline/date. Do not overemphasise category chips.

### 5.4 Article detail — `/news/[slug]`

**Recommended layout**
- Breadcrumb: Home → News → Category.
- Category label and headline.
- Summary/deck.
- Byline, publication date and updated date.
- Wide cover image with caption and credit.
- Article body with comfortable reading width.
- Source notes and correction note where applicable.
- Related stories based only on real published articles.
- Share controls with accessible labels.

**Must verify**
- The displayed body is the published version, not the latest draft.
- No private draft title, summary or cover metadata leaks into metadata/SEO.
- Image attribution is visible.
- Broken/missing cover has a deliberate fallback.
- Social share metadata uses the canonical article URL.

### 5.5 Ìtàn Ilú Mi — `/itan-ilu-mi`

**Current source direction:** approved public records, search/category filters and private contribution submission.

**Problems / risks**
- History pages need more trust and provenance than a generic content feed.
- Family lineage and oral-history material can be sensitive.
- A submission form must explain review and consent clearly.

**Recommended layout**
- Intro explaining the archive and its editorial care.
- Search and categories.
- Featured approved records only when available.
- Record cards with title, community/category, date and source status.
- A distinct “Contribute a history” action.
- Submission form separated from the public archive.
- Clear notice: submitted material is private until reviewed and approved.

**Record detail:** source notes, contributor attribution preferences, correction history and uncertainty should be visible where appropriate.

**Do not:** expose private family data, contributor email addresses or unreviewed claims.

### 5.6 Forum — `/forum`

**Current source direction:** categories, thread list and moderated discussion workflow.

**Problems / risks**
- Forum UI can look like an abandoned empty database if there are no real discussions.
- Thread creation and reply actions must clearly explain member requirements.
- Moderation rules need to be discoverable before posting.

**Recommended layout**
- Community title and short rules summary.
- Category list with descriptions.
- Recent discussions only when real threads exist.
- Search and sort controls.
- Clear “Start a discussion” CTA.
- Empty state that invites a first contribution without inventing activity.

**Category page:** category intro, rules, thread list, pagination.

**Thread page:** title, author/time, post body, reply count, reply form, report action and moderation state. Keep reply controls visually subordinate to the original post.

**New thread page:** title, category, body, optional poll builder. Explain limits and community rules inline.

**Do not:** fake online-user counts, post counts or “trending” discussions.

### 5.7 Map & Navigation — `/map`

**Current source direction:** published directory businesses plus outbound Google Maps search/directions; device location is not requested automatically.

**Problems / risks**
- Users may expect a full embedded map or turn-by-turn navigation.
- The current implementation direction is safer but needs expectation-setting.
- Empty directory data can make the page appear broken.

**Recommended layout**
- Clear page intro: “Find a place in Epe.”
- One prominent search field.
- Search modes: business, landmark, street/address.
- Results list with name, category, area and address.
- “Open directions” action.
- Optional “Use my location” button, only after user action.
- Explain that directions open in Google Maps.

**Do not:** imply live traffic, exact in-app routing, verified opening hours or full Places search unless those integrations exist.

### 5.8 Business Directory — `/business-directory`

**Current source direction:** published listings, search, area/category filters, verification state and business details.

**Problems / risks**
- Directory cards can become visually repetitive.
- Verification needs a precise meaning.
- Marketplace language may imply checkout/order functionality beyond current approved scope.

**Recommended layout**
- Search-first intro.
- Category and area filters.
- Featured/verified listings only if the distinction is operationally defined.
- Clean listing cards with business name, category, area and one contact action.
- Business submission CTA.
- Clear note explaining what “Verified” means.

**For Phase 1:** if the agreed scope is listings-only, keep it a directory. Do not promote cart, checkout, delivery, payments or order tracking as live functionality.

### 5.9 Business detail — `/business-directory/[slug]`

**Recommended layout**
- Business name, category and verification status.
- Area/address and optional landmark.
- Short description.
- Contact actions: phone, WhatsApp, website, only when valid.
- Map directions link.
- Last reviewed date if the process supports it.
- Report incorrect listing action if a real report channel exists.

**Do not:** show fake ratings, fake opening hours, fake reviews or unverified ownership claims.

### 5.10 Submit a business — `/business-directory/submit`

**Recommended layout**
- Explain who can submit and what evidence is needed.
- Group form fields into Business details, Location, Contact and Ownership/permission.
- Show validation beside fields.
- Explain that submission is reviewed and not immediately public.
- Confirm submission only after the server has persisted it.
- Give the user a reference or clear next step only if the system truly creates one.

### 5.11 Business orders — `/business-directory/orders`

**High scope risk:** this route implies transactional marketplace capability.

**Recommended action**
- Confirm that this is approved for the current phase.
- If not, keep it out of public navigation and mark it as a later-phase route.
- If active, provide order state, items, payer, recipient, delivery status and support path with strict ownership checks.
- Never expose another customer's order through URL guessing.

### 5.12 Tourism index — `/tourism`

**Current source direction:** searchable approved destinations with source citations and visitor context.

**Problems / risks**
- A tourism directory without verified images/details may look sparse.
- Visitor information becomes misleading quickly if not maintained.

**Recommended layout**
- Strong local heritage intro.
- Search/filter by area or type only if supported.
- Destination cards with real licensed image, name, location and concise context.
- Source-backed visitor information.
- Clear “Suggest a place” route if contribution review exists.

**Do not:** invent opening times, admission fees, safety claims or accessibility details.

### 5.13 Tourism detail — `/tourism/[slug]`

**Recommended layout**
- Real hero image and credit.
- Destination title and location.
- Historical/visitor context with source citations.
- Practical information separated from historical narrative.
- Directions action.
- Last reviewed date if verified.
- Related destinations only when real.

### 5.14 Radio — `/radio`

**Current source direction:** player, active programmes, schedule and published episodes.

**Problems / risks**
- Radio pages often look broken when the stream URL is unavailable.
- A static player without clear status can create false expectations.
- Schedules should not be fabricated.

**Recommended layout**
- One clear player card with station identity, status and play/pause.
- Current programme only when a verified schedule says it is current.
- Weekly schedule table/list.
- Recent episodes only when published.
- Clear stream-unavailable state with no fake waveform or false “LIVE” badge.

**Do not:** claim live broadcasting unless the stream is actually playing and the station relationship/rights are confirmed.

### 5.15 Who is Who — `/who-is-who`

**Current source direction:** searchable people/public office directory with verification and source-backed profile data.

**Problems / risks**
- People data is sensitive to errors and outdated office terms.
- Profile cards can feel like a social network when this is a reference directory.
- Verification labels need a documented process.

**Recommended layout**
- Search by name, office or community.
- Filter controls only where data exists.
- Person cards with name, public role and community.
- Avoid portrait placeholders that look like real photos.
- Show “Verified” only where evidence and review are recorded.
- Explain profile correction/report route.

### 5.16 Person detail — `/who-is-who/[slug]`

**Recommended layout**
- Name and preferred public name.
- Portrait only with appropriate permission/licence.
- Current and former public roles with term dates.
- Short sourced biography.
- Source references and last reviewed date.
- Correction/report link.

**Do not:** infer personal details, publish private contact information or imply official endorsement.

### 5.17 Gallery — `/gallery`

**Current source direction:** deliberate empty state; only licensed and credited photos should appear.

**Problem**
The empty state is honest, but a visual archive should explain what will be collected and how credits are handled.

**Recommended layout**
- Editorial intro and a compact grid only when images exist.
- If empty, show a restrained empty state with a link to Photo Credits and an approved contribution route.
- Do not fill it with unrelated stock images.

### 5.18 Photo Credits — `/photo-credits`

**Current source direction:** image labels, author, source and licence.

**Recommended improvements**
- Group credits by page or image collection.
- Use a consistent citation pattern.
- Include image thumbnail only if it helps identify the asset.
- Make source and licence links keyboard accessible.
- Keep attribution data in sync with actual deployed images.

### 5.19 Contact — `/contact`

**Current source direction:** explicitly says contact intake is not configured and that no message is received.

**Design issue**
This is an operational limitation, not a normal marketing page. It should not look like a broken contact form.

**Recommended layout**
- Plain heading: “Contact channels are being set up.”
- Clearly state no message is received through this page.
- Provide verified public contact details if approved.
- Show the date this status was last checked.
- Do not include an inert form or false success state.

**Launch blocker:** provide a real monitored contact route before presenting EPE LAWA as a fully operating company platform.

### 5.20 Advertise — `/advertise`

**Current source direction:** placements are being prepared; enquiries unavailable.

**Recommended layout**
- Explain future placement types only if actually planned.
- Clearly label enquiries unavailable.
- No fake media kit download or fake “request a quote” form.
- When operational, provide audience/placement details only from real analytics and signed-off inventory.
- Distinguish paid placement from editorial coverage.

### 5.21 Privacy — `/privacy`

**Current source direction:** long-form InformationPage, account/session and storage explanations, current request-channel limitations.

**UI improvements**
- Add a compact “At a glance” section.
- Add a contents list for long policies.
- Use readable line length and consistent heading spacing.
- Make the privacy contact/request process prominent.
- Display the last-updated date.
- Do not use decorative cards around every paragraph.

**Content dependency:** do not publish a promise about request handling until a real channel exists.

### 5.22 Terms — `/terms`

**UI improvements**
- Use the same legal page template as Privacy and Guidelines.
- Add contents navigation if the document grows.
- Keep headings descriptive.
- Put effective date and version near the top.
- Use clear links to Privacy and Community Guidelines.

### 5.23 Community and Editorial Guidelines — `/guidelines`

**Recommended structure**
- Editorial standards.
- Corrections and right of reply.
- Community history consent.
- Forum conduct and moderation.
- Business verification.
- Prohibited content and reporting.
- Enforcement and appeal process, only where implemented.

Keep it scannable with short sections and anchored contents navigation.

### 5.24 Member sign-in — `/login`

**Current source direction:** AccountShell, sign-in form and account options.

**Recommended improvements**
- Calm, narrow form layout.
- Clear brand lockup and one-line explanation.
- Email and password fields with visible labels.
- Show/hide password.
- Inline validation and clear server error states.
- Password recovery link adjacent to password field.
- Create-account link below.
- Do not force a full-screen decorative illustration on mobile.

### 5.25 Registration — `/auth`

**Recommended improvements**
- Explain what a member account enables.
- Ask only for required fields.
- Explain email verification before submission.
- Keep password requirements visible.
- Avoid a long legal wall; link to terms/privacy with consent wording.
- Distinguish account creation from email verification.

### 5.26 Auth verification and callback routes

Routes: `/auth/complete`, `/auth/verify`, `/auth/new-password`, `/auth/link-expired`, `/auth/link-problem`, `/forgot-password`.

**Recommended visual treatment**
- Use one shared account shell.
- One clear status icon/heading.
- Plain explanation of what happened.
- One next action.
- No generic stack traces or raw provider errors.
- Expired link: “This link has expired” + resend action if supported.
- Link problem: explain safe next step.
- Password reset: confirm only after password update succeeds.
- Completion route: avoid a blank spinner that never resolves.

### 5.27 Member dashboard — `/dashboard`

**Current source direction:** authenticated profile lookup and profile editor; private route.

**Recommended layout**
- Simple member header with avatar/initials, name and account status.
- Profile details as a focused form.
- Account security and sign-out actions.
- Only show saved items, forum activity or contributions if those features are actually implemented and populated.
- Mobile: single column; no tiny dashboard cards.
- Use a distinct unavailable state when the member profile service cannot connect.

**Do not:** show fake engagement metrics or empty dashboard widgets simply to fill space.

---

## 6. Staff/Admin workspace audit

Admin is not a public-facing page. It should be quieter, denser and more operational than the public website. It must still feel like EPE LAWA.

### Admin-wide direction

- Keep a persistent left sidebar on desktop.
- On mobile use a compact top bar and accessible navigation drawer.
- Use a neutral light workspace with navy text and cobalt actions.
- Use green only for genuine success/approved states.
- Use warning amber for pending/review and red for destructive/error.
- Keep tables readable and responsive; use contained horizontal scroll only where unavoidable.
- Put page title, one-line purpose and primary action at the top.
- Keep destructive actions behind confirmation and permission checks.
- Never show sample metrics or pretend activity.

### 6.1 Admin login — `/admin/login`

**Required**
- Distinguish staff login from member login.
- State “Staff access” clearly.
- Use a compact form with clear errors.
- Avoid exposing whether an email exists.
- Keep session/security explanation concise.
- On mobile, no horizontal overflow or oversized empty margins.

### 6.2 Admin dashboard — `/admin`

**Current source direction:** capability-gated metrics for publishing, moderation and orders; unavailable values are distinct from zero.

**Recommended layout**
- Greeting and role/capability summary.
- “Needs attention” queue with actionable items.
- Newsroom status: drafts awaiting review, approved stories awaiting publish.
- Moderation queue only for users with the relevant capability.
- Business review queue only when authorised.
- Radio/tourism/people maintenance shortcuts only when relevant.
- Recent audit activity only if access is permitted and data is real.

**Do not:** add generic graphs, fake traffic charts, invented visitor counts or arbitrary percentage cards.

### 6.3 Newsroom list — `/admin/newsroom`

**Recommended layout**
- Page title and “New article”.
- Tabs/filters: Draft, In review, Approved, Published, Rejected.
- Table columns: Title, Author, Status, Updated, Actions.
- Mobile: each row becomes a compact article card with status and one action.
- Clear empty state.
- Show revision/version state where it matters.
- Never use colour alone to communicate workflow status.

### 6.4 New article — `/admin/newsroom/new`

**Recommended editor**
- Main column: headline, summary, body editor.
- Side panel: category, byline, cover image, alt text, source/credit, SEO.
- Sticky bottom action bar: Save draft, Submit for review, Preview.
- Autosave only if it is genuinely implemented and the save state is visible.
- Warn before leaving with unsaved changes.
- Do not make Publish available to users lacking the capability.

### 6.5 Edit/review article — `/admin/newsroom/[id]`

**Required**
- Display current revision and published revision clearly.
- Show review comments and workflow state.
- Preview published output.
- Handle stale revision conflict without overwriting newer work.
- Make publish/unpublish actions explicit and audited.
- Keep rejection reason and return-to-author path clear.

### 6.6 Newsroom settings — `/admin/newsroom/settings`

**Recommended**
- Group category/byline/configuration settings.
- Explain the effect of each setting.
- Avoid exposing raw database values or technical identifiers unless needed by an administrator.
- Confirm changes and show actual save result.

### 6.7 Staff users — `/admin/users`

**Current source direction:** restricted staff directory and invite/active-state controls.

**Recommended**
- Search field and staff table.
- Name/email, role, active state, last relevant activity only if reliable.
- Invite staff action.
- Deactivate with confirmation and clear consequences.
- Show permissions through role names rather than dumping capability keys in the main list.

### 6.8 Roles — `/admin/roles`

**Recommended**
- Role list on left, role details/capabilities on right.
- Clear explanation of what each capability allows.
- Warn when changing high-privilege roles.
- Prevent accidental removal of the only primary administrator.
- Show assignment count only when the query succeeds.
- Audit all changes.

### 6.9 People — `/admin/people`

**Recommended**
- Searchable people/profile table.
- Status and verification evidence.
- Edit profile, review source and publish state.
- Clear distinction between deceased/current public office status where applicable.
- Avoid displaying private personal data in the table.

### 6.10 Tourism — `/admin/tourism`

**Recommended**
- Destination list with Draft/Review/Published.
- Source citation and visitor information completeness.
- Image/credit validation.
- Preview before publish.
- Show last reviewed date.

### 6.11 Radio — `/admin/radio`

**Recommended**
- Separate Programme, Schedule and Episode tabs.
- Schedule editor with timezone clarity.
- Episode publication state.
- Stream URL validation and test playback.
- No fake “live” status.
- Make rights/source details available to authorised staff.

### 6.12 Forum moderation — `/admin/moderation/forum`

**Recommended**
- Queue grouped by report state.
- Context preview of reported post/thread.
- Reporter reason and timestamp.
- Actions: dismiss, hide, lock, remove, escalate, according to actual permissions.
- Confirmation for irreversible actions.
- Record moderator reason.
- Avoid a dense wall of report cards.

### 6.13 History review — `/admin/itan-ilu-mi/review`

**Recommended**
- Private submission queue.
- Review source/provenance and consent.
- Compare submitted text and edited version.
- Approve, request clarification or reject.
- Keep contributor identity private from public pages.
- Show consent and publication scope clearly.

### 6.14 Business review — `/admin/business-review`

**Recommended**
- Submission queue with business name, category, area and status.
- Review contact and ownership evidence.
- Publish/return/reject with reason.
- Verification badge must map to a real verification procedure.

### 6.15 Business moderation — `/admin/business-review/moderation`

**Recommended**
- Separate reports/edits from new submissions.
- Show listing history and previous decisions.
- Keep report identity private.
- Record action and moderator.

### 6.16 Orders — `/admin/orders`

**Scope gate:** keep this hidden or unavailable if marketplace order management is not approved for the current phase.

If active:
- Search/order status filters.
- Order detail with payer/recipient and delivery state.
- Payment state read from trusted server/provider records.
- Never let staff UI imply a payment has cleared based only on a client-submitted status.
- Restrict access by explicit capability.
- Audit status transitions.

---

## 7. Hidden and non-obvious UX states that must be designed

A full UI audit cannot stop at the happy path. Each module needs the following states:

1. First visit / no data.
2. Loading.
3. Slow network.
4. Network failure.
5. Database unavailable.
6. No search results.
7. Invalid filter or query.
8. Unauthenticated visitor.
9. Authenticated member without required permission.
10. Suspended/disabled account.
11. Expired email link.
12. Expired staff session.
13. Stale edit/revision conflict.
14. Form validation error.
15. Form server error.
16. Successful persisted submission.
17. Upload failure.
18. Missing or invalid image.
19. Empty category.
20. Pagination end.
21. Mobile keyboard open.
22. Long text/long names.
23. 200% browser zoom.
24. Reduced motion.
25. Dark theme, where supported.
26. Direct URL access to protected detail.
27. Back/forward browser navigation.
28. Session timeout during editing.

Every state must explain what happened and what the user can do next. Never show a green success state before the server confirms persistence.

---

## 8. Responsive and accessibility acceptance matrix

Test every important page at these viewport widths:

| Device class | Width |
|---|---:|
| Narrow mobile | 320px |
| Common Android | 360px |
| Mobile | 375px |
| Larger mobile | 390px |
| Large mobile | 430px |
| Tablet portrait | 768px |
| Small laptop | 1024px |
| Desktop | 1280px |
| Large desktop | 1440px |

Acceptance:
- No horizontal document overflow.
- Sticky header never obscures page headings or anchor targets.
- Touch targets at least 44×44px.
- Focus indicator visible on all interactive controls.
- Menus and dialogs work with keyboard and touch.
- Labels are programmatically associated with fields.
- Error text is announced and tied to the relevant input.
- Contrast meets WCAG 2.2 AA.
- Images have meaningful alt text or empty alt where decorative.
- Reduced-motion setting is respected.
- Content reflows at 200% zoom.
- Tables have accessible headers and a mobile strategy.
- No status is communicated by colour alone.

---

## 9. Screenshot evidence inventory in the repository

These are existing screenshot artifacts committed to the repository. Open them at the exact paths below to compare the current implementation with the proposed direction. They are not newly captured in this review.

### Homepage and theme
- [Homepage desktop 1440](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/hero-followup/home-1440.png)
- [Homepage mobile 375](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/hero-followup/home-375.png)
- [Homepage mobile 320](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/hero-followup/home-320.png)
- [Photo credits mobile 375](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/hero-followup/photo-credits-375.png)
- [Homepage dark desktop](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/theme-toast/home-desktop-dark.png)
- [Homepage dark mobile](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/theme-toast/home-mobile-dark.png)

### News
- [News desktop 1440×900](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/news-layout/news-desktop-1440x900.png)
- [News current mobile 375](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/news-layout/current-news-375.png)
- [Editorial rail desktop 1440](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/news-layout/editorial-rail-desktop-1440.png)
- [Editorial rail mobile 375](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/news-layout/editorial-rail-mobile-375.png)
- [Breaking/ranked desktop 1440](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/news-layout/breaking-ranked-1440.png)
- [Compact/topical desktop 1440](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/news-layout/compact-topical-1440.png)
- [Magazine sections desktop 1440](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/news-layout/magazine-sections-1440.png)
- [News search expanded mobile](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/news-layout/news-search-expanded-375x667.png)
- [Reader saved mobile 375](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/news-layout/reader-saved-375.png)

### Admin
- [Admin login desktop 1440](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/chrome-2026-11-14/admin-login-1440.png)
- [Admin login mobile 320](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/chrome-2026-11-14/admin-login-320.png)
- [Admin login tablet 768](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/chrome-2026-11-14/admin-login-768.png)
- [Admin dashboard desktop 1440](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/chrome-2026-11-14/dashboard-1440.png)
- [Admin dashboard mobile 320](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/chrome-2026-11-14/dashboard-320.png)
- [Admin dashboard tablet 768](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/chrome-2026-11-14/dashboard-768.png)
- [Admin roles desktop](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/admin-roles/roles-desktop.png)
- [Admin roles mobile](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/admin-roles/roles-mobile.png)
- [Admin login roles desktop](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/admin-roles/admin-login-desktop.png)
- [Admin login roles mobile](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/admin-roles/admin-login-mobile.png)

### Radio and authentication
- [Radio desktop](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/radio/radio-desktop.png)
- [Radio mobile 320](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/radio/radio-mobile-320.png)
- [Radio mobile](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/radio/radio-mobile.png)
- [Member login mobile 320](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/auth-mobile/login-320.png)
- [Member signup mobile 320](https://github.com/epelawa/EPE-LAWA/blob/main/artifacts/auth-mobile/signup-320.png)

**Missing screenshot coverage:** there are no committed screenshot paths in the inspected artifact inventory for every individual public module, dynamic detail page, contact/legal page, business submission, forum thread, tourism detail, Who is Who detail, member dashboard, or every protected Admin subpage. Capture those before declaring a complete visual QA pass.

---

## 10. Proposed screenshot capture plan

Capture real screenshots from a Vercel preview deployment of the exact commit under review. Do not use synthetic HTML or local-only data and label it production.

### Public desktop and mobile
For each route:
- 1440px wide desktop, full page and first viewport.
- 390px mobile, first viewport and full page.
- 320px mobile for layout stress on high-traffic and form pages.
- One screenshot with navigation open.
- One screenshot of each empty/error/loading state that is relevant.

### Protected Admin
Use a dedicated non-production staff test account with least-privilege roles.
- Anonymous `/admin` redirect.
- Admin login.
- Dashboard with limited role.
- Dashboard with full permitted role.
- Newsroom list, create, edit/review and settings.
- Users and Roles.
- Forum moderation.
- History review.
- Business review and moderation.
- Tourism, Radio, People and Orders.
- Permission-denied states.

### Screenshot naming convention

`artifacts/ui-audit/<release-sha>/<route>/<viewport>-<state>.png`

Examples:
- `home/desktop-1440-default.png`
- `news/mobile-390-empty.png`
- `forum/mobile-390-no-results.png`
- `admin-newsroom/desktop-1440-review-queue.png`
- `admin-roles/mobile-390-permission-denied.png`

Each screenshot set should include a short README with commit SHA, deployment URL, viewport, account role (never credentials), data fixture source and capture date.

---

## 11. Implementation order

### Sprint 1 — Visual consistency and public shell
1. Lock the palette and typography.
2. Fix header overlap and scroll offsets.
3. Redesign mobile navigation hierarchy.
4. Standardise public header/footer.
5. Standardise PageIntro, PageFrame, buttons, panels and empty states.
6. Reduce excessive card radius and oversized blank surfaces.

### Sprint 2 — Core public pages
1. Homepage.
2. News index and article detail.
3. About.
4. Business Directory and business detail.
5. Contact and legal pages.
6. Gallery and Photo Credits.

### Sprint 3 — Community and discovery
1. Ìtàn Ilú Mi.
2. Forum index/category/thread/new.
3. Map.
4. Tourism index/detail.
5. Radio.
6. Who is Who index/detail.

### Sprint 4 — Account and Admin
1. Member auth and recovery.
2. Member dashboard.
3. Admin shell/sidebar.
4. Admin dashboard.
5. Newsroom workflows.
6. Staff users and roles.
7. Moderation/review pages.
8. All permission-denied and error states.

### Sprint 5 — Evidence and release
1. Capture all screenshot matrix entries.
2. Run accessibility checks.
3. Run Playwright visual and functional tests.
4. Check all routes at required viewports.
5. Verify all CTA destinations.
6. Confirm no dead-end forms or false success states.
7. Record exact commit and preview URL.

---

## 12. Final design direction

The strongest EPE LAWA direction is:

**A calm, premium local institution with an editorial heart.**

It should feel:
- More like a credible regional publication and community portal.
- Less like a collection of rounded demo cards.
- More typographically disciplined.
- More confident in its use of real local photography.
- Easier to navigate on mobile.
- More transparent about what is available and what is still being prepared.
- Consistent from the homepage through member account and Admin.

The visual goal is not to make every page look expensive through gradients, glass effects or animation. It is to make the product feel trustworthy through hierarchy, spacing, typography, imagery, content quality and predictable interactions.

**The client-facing test:** a first-time visitor should understand what EPE LAWA is, find News or a local service quickly, know whether information is verified, and never be tricked into thinking an unavailable feature works. A staff member should be able to manage content without fighting the interface or risking accidental publication.

---

## 13. Audit limitations and completion status

- Route inventory and page source were reviewed from the current GitHub `main` tree.
- User-supplied screenshots were visually inspected.
- Repository screenshot paths were inventoried, but PNG binary payloads could not be opened in this session.
- The live website was inaccessible through the browser inspection interface.
- Protected Admin pages were not tested with an authenticated staff session.
- No new browser screenshots, Playwright run, accessibility scan or live deployment interaction was performed.
- The redesign direction is a recommendation, not an already implemented change.

**Status:** comprehensive source-level UI/UX review and redesign specification prepared. A true screenshot-by-screenshot visual sign-off still requires opening the indexed PNG artifacts or capturing a fresh preview session with browser access and authorized test accounts.
