# EPE LAWA — Page Specifications and Low-Fidelity Wireframes

**Document:** 04 — Workstream 0.4\
**Status:** Workstream 0.4 approved by the owner on 2 November 2026; layouts and interaction details still require real-world validation, not production authorisation.\
**Prepared:** 2 November 2026\
**Inputs:** [Product requirements](01-product-requirements.md), [user journeys](02-user-journeys.md), [sitemap](03-sitemap.md) and the companion [design system](05-design-system.md).\
**Gate:** Workstream 0.4 is approved; proceed to technical architecture. No production code until the full Phase 0 exit condition is approved.

## 1. Specification conventions

- **P1:** first-release scope; **conditional:** show only with real approved content/capability. **Future:** not an active Phase 1 feature. Routes and domains follow the approved sitemap but remain subject to detailed technical and content validation.
- Text wireframes convey hierarchy, not final copy or a claim that content already exists. [ ] denotes a component/region, not real content. Use no public-facing dummy data.
- Shared rules: semantic headings, keyboard operation, visible focus, readable contrast, meaningful image descriptions, responsive layouts, honest loading/empty/error/success states and actual authorised data. See document 05.
- Public visitors do not need accounts. Admin pages require server-side authorisation and appropriate database controls. Private previews, drafts and review notes must never be accessible through public routes, metadata, caches or search.
- Radio must be functional at launch: an official direct stream, compatible format and embedding rights must be supplied and tested. During outages show the actual unavailable/error state and recordings, not an invented LIVE label. Contact is a general form plus WhatsApp, not Speak Up Epe or an emergency channel.
- Field-level validation, legal text, exact copy, permissions, availability thresholds, technical contracts, and any unresolved editorial decisions are **not** silently specified here; later workstreams and owner review must resolve them.

## 2. Shared page patterns

### Public shell

```text
Desktop: [Logo] [Primary navigation: Listen & Watch | News | About | Contact]
         [Page title / context]
         [Primary content                     ] [Optional supporting rail]
         [Footer: approved links | social | privacy | terms]

Mobile:  [Logo]                                      [Menu]
         [Page title / context]
         [Primary content — one column]
         [Supporting content — below main content]
         [Footer]
```

- News has its own publication masthead and editorial hierarchy; main and news clearly identify cross-site links. Footer links point to actual approved destinations only. Mobile menu exposes the same available destinations and can be opened, traversed and closed by keyboard.
- Approved team information is conditional. Future feature previews must not act like operating services. Loading indicators may reserve layout space but must not simulate content or real counts.
- Long lists paginate; no-result views explain the situation and offer navigation or search adjustment. Failed loads offer a retry where meaningful, without exposing internals. Not-found experiences return an appropriate status rather than a fake page.

### Admin shell

```text
Desktop: [Brand / account]
         [Role-appropriate navigation] | [Page title + permitted primary action]
                                      | [filters / real records / work area]
Mobile:  [Brand] [Navigation control] [Account]
         [Page title + permitted action]
         [Filters and records; preserve labels and actions]
```

Keep authoring tools usable on small screens without assuming every editorial task is optimal there. Do not rely on hidden buttons as security; show only actions the user may attempt, then enforce those permissions server-side. Confirm destructive actions, describe consequences and record audit events according to later security policy. Tables must not lose row relationships at narrow widths.

## 3. Main website specifications

### 3.1 Homepage — `/`

**Goal / journeys:** Introduce the platform and direct visitors to news, radio, media and about/contact (J01–J03, J05–J06).\
**Layout:**

```text
[Main navigation]
[Hero: approved heading + short purpose | available actions]
[Radio player: verified state, controls, available programme]
[Latest published news: lead + recent → news site]
[Curated media → archive]
[About EPE LAWA → About]
[Approved informational previews only if genuinely available]
[Footer]
```

Mobile uses that same meaningful order in one column, with actions reachable without horizontal scroll. Desktop may place hero text and authentic licensed imagery side by side. If the radio is temporarily unavailable after launch, show a clear error/offline message and recordings. Omit or truthfully label empty news/media sections. No newsletter control, fictional metrics or active links to future modules. “Explore Epe” must not lead to an unimplemented Phase 4 service.

**Acceptance:** Visitor can identify purpose and enter news/media/radio/contact; content is real, published and responsive; live radio meets the launch prerequisite.\
**Dependencies:** Approved copy, brand and licensed Epe imagery, published content, working stream and programme details.

### 3.2 About and team — `/about/`, `/team/`

**Goal:** Explain organisation, mission, vision, purpose and approved background; optionally present approved team information (J01).\
**Layout:** `[Title + introduction] → [Mission / vision] → [Approved background] → [Optional team link] → [Contact]`. On narrow screens stack sections and avoid decorative sidebars.\
**States:** Omit team link/page when no approved information exists; do not invent biographies. Missing/unavailable content should not appear as real.\
**Acceptance / dependency:** Approved text, names, images and permissions; accessible contact link. Team display is conditional, not a fabricated launch requirement.

### 3.3 Contact — `/contact/`

**Goal:** Allow a visitor to reach EPE LAWA through an approved general contact form or WhatsApp (J02).\
**Layout:** `[Heading and purpose] → [General form + privacy link] → [Approved WhatsApp action] → [Response expectations only if agreed]`. Desktop may use two columns; mobile stacks form before WhatsApp.

**Flow:** Explain general purpose and data use; user completes fields after the owner approves their exact names, required/optional status and validation. Validate accessibly, then submit to the agreed recipient. A success message is shown only after the delivery mechanism confirms the agreed success condition; failures identify a retry or alternative without revealing private details. WhatsApp is an external action; identify that the user is leaving and use only the owner-approved number.

**States:** Default, focus, disabled only when appropriate, validation errors associated with their fields, submitting, confirmed success, delivery failure and rate-limit/abuse feedback. Never auto-publish messages or promise anonymity, confidentiality, emergency response or a response time not established by policy.\
**Acceptance / dependencies:** Real delivery, meaningful status, keyboard use and verified WhatsApp destination. Recipient, fields, privacy notice, retention, abuse controls, provider and operational ownership remain open. Formal external story intake and confidential civic reporting are not part of this page.

### 3.4 Media hub, programmes and archive — `/media/`, `/media/programmes/`, `/media/archive/`

**Goal:** Help users find live radio and approved programme recordings (J03, J05–J06).\
**Layout:** Hub `[Title] → [Radio entry] → [Programmes] → [Curated video / archive links]`; lists `[Title] → [Available categories or pagination] → [Real records]`. Mobile stacks records and prioritises text over heavy embeds.\
**States:** Real empty state when no records exist; loading and retry on failure. No invented schedule, programme or availability. Media archive may link to the canonical video/episode detail rather than duplicate a full record.\
**Acceptance / dependencies:** A published record opens its intended detail or valid external source; approved programme information and permitted media required. Filters beyond approved scope remain design decisions.

### 3.5 Radio — `/media/radio/` and homepage player

**Goal:** Make the authorised live broadcast usable without an account (J05).\
**Layout:** `[Player name and verified status] → [Play/pause] [Volume where supported] → [Available programme information] → [Recording alternatives]`.

**States:** Idle; loading; playing; paused; buffering; unavailable/offline when verifiable; playback failure; volume unsupported. Play starts only on intentional interaction. Provide accessible names, status announcements without excessive interruption, and retry when useful. Do not claim LIVE simply because a URL is configured.\
**Acceptance / dependencies:** Official direct stream, confirmed embedding rights and compatible browser/mobile playback are required for launch; test actual audio and controls. A truthful outage fallback does not replace that launch requirement. Programme and station wording need owner/rights-holder confirmation.

### 3.6 Videos and episode detail — `/media/videos/`, `/media/episodes/[slug]/`

**Goal:** Discover and watch an approved recorded broadcast (J06).\
**List:** `[Title] → [Approved categories] → [Thumbnail + title + available date/description] → [Pagination if needed]`.\
**Detail:** `[Title + available metadata / credits] → [User-initiated playback or external link] → [Description] → [Related approved recordings]`. On mobile keep one column and do not load heavy third-party players until needed.

**States:** Empty archive; thumbnail unavailable with accessible fallback; loading; unavailable/deleted/restricted embed; external link where useful; captions/transcripts only where supplied.\
**Acceptance / dependencies:** Records are curated and published by authorised staff, rights/credit are recorded and unavailable content does not falsely appear playable. Exact record fields and supported embeds remain for later specifications.

### 3.7 Policies and not-found — `/privacy/`, `/terms/`, unmatched paths

**Goal:** Make approved policies accessible and help a visitor recover from an invalid destination.\
**Layout:** Policy `[Title] → [Effective/update information if supplied] → [Readable sections] → [Contact]`; not-found `[Clear status] → [Home / relevant navigation]`.\
**States:** Unpublished policy text must not be represented as reviewed; unmatched route returns appropriate not-found status.\
**Dependencies:** Owner and appropriate legal review of actual policy content; not-found handling and archived content rules require technical/editorial decisions.

## 4. News publication specifications

### 4.1 News homepage — `/`

**Goal:** Offer an editorially distinct, trustworthy starting point (J04).\
**Layout:**

```text
[Publication masthead + navigation / search]
[Breaking banner ONLY for a real designated story]
[Lead published story] [Other real latest stories]
[Published category coverage]
[Video coverage → approved media]
[Trending ONLY if approved real-data ranking exists]
[Editorial footer / main-site contact and policy links]
```

Mobile prioritises lead story and a clear single-column reading order; desktop can use an editorial grid. No fabricated lead, banner, trending list, engagement figure or article count. Empty and error states remain useful.\
**Acceptance:** Real published stories navigate to canonical news article pages; discovery and cross-site links work. **Dependencies:** Published stories, approved category labels and editorial controls.

### 4.2 Discovery pages — `/latest/`, `/category/[slug]/`, `/author/[slug]/`, `/tag/[slug]/`, `/search/`, conditional `/trending/`

**Goal:** Help readers locate published articles by recency, topic, author, tag or search (J04).\
**Layout:** `[Page context / title] → [Search or relevant context] → [Article summaries] → [Pagination]`. Author information appears only when approved. Mobile cards/rows retain title and metadata without excessive imagery.

**States:** Loading, actual results, no results with adjustment/navigation option, invalid or unavailable category/author/tag, and retryable failure. Never return draft/private information. Trending is visible only when real engagement data and an agreed method exist; otherwise it is not an active destination.\
**Acceptance:** Every result resolves to a published article; pagination and search are operable by keyboard. **Dependencies:** Search approach, pagination size, ranking/privacy method and category management require later decisions.

### 4.3 Article — `/article/[slug]/`

**Goal:** Provide a readable published story, source context and shareable canonical URL (J04).\
**Layout:**

```text
[Category] [Headline] [Summary]
[Author | Published date | Updated date when applicable]
[Featured image + credit/caption when present]
[Accessible rich text / inline images and allowed embeds]
[Public correction information when relevant]
[Tags | Share action]
[Related published stories]
```

Desktop uses a comfortable reading measure; mobile preserves reading order and avoids horizontal scroll. Appropriate public article metadata is distinct from private editorial history.\
**States:** Normal, no related results, unavailable embedded content, unpublished/archived/not-found per approved policy, load error. A private or unapproved version cannot be retrieved via a guessed slug, cache, share link or metadata.\
**Acceptance:** Published article displays its approved content, credits and available correction history; sharing resolves to the public canonical URL. **Dependencies:** Editorial review, versioning, corrections policy, permitted embeds and sanitisation.

### 4.4 News videos, about and contact — `/videos/`, `/about/`, `/contact/`

**Goal:** Provide publication-specific context and route users to the shared media/contact experiences.\
**Layout:** `[Page title] → [Approved description or relevant published video coverage] → [Main-site archive/contact link]`; news contact must not create a second unexplained intake route.\
**States:** Empty/failed video content is honest; external embeds and links are identified appropriately.\
**Acceptance / dependencies:** Approved publication copy, working cross-site links and one general contact destination. Opinion and dedicated submit-story routes remain pending rather than silently implemented.

## 5. Administration specifications

### 5.1 Login and recovery — `/login/`

**Goal:** Admit only authorised staff (J07–J09).\
**Layout:** `[Brand] → [Sign-in form] → [Recovery entry] → [Accessible support information if approved]`. Keep the page usable at small widths.\
**States:** Default, field validation, submitting, generic authentication failure, expired session and recovery confirmation/error without disclosing account existence.\
**Acceptance / dependencies:** Authorised access succeeds; unauthorised access fails; session, recovery, MFA and cookie/redirect policies remain security decisions. Do not expose secrets or tokens in links.

### 5.2 Dashboard — `/dashboard/`

**Goal:** Orient authorised staff to actual newsroom and media work.\
**Layout:** `[Title] → [Actual operational summaries] → [Review queue / recent permitted activity] → [Relevant system messages]`.\
**States:** Real zero/empty counts, loading, unavailable data and error. Do not substitute demo counts.\
**Acceptance / dependencies:** Information is role-appropriate and sourced from real records; what each role may view is pending the permission matrix.

### 5.3 Article list, drafts and review — `/newsroom/articles/`, `/newsroom/drafts/`, `/newsroom/review/`

**Goal:** Find and manage permitted articles by state.\
**Layout:** `[Title + permitted create action] → [Agreed filters/search] → [Real records with status and permitted actions] → [Pagination]`. Lists can become labelled rows or cards on mobile without losing status/action context.\
**States:** No records, no filter matches, loading, permission denied and query failure.\
**Acceptance:** Role-appropriate records and actions are accurate; direct requests for unauthorised data/actions are denied. **Dependencies:** Role matrix, article states and filter specifications.

### 5.4 Create, edit, preview and history — `/newsroom/create/`, `/newsroom/articles/[id]/`

**Goal:** Enable authorised authoring, review and corrections (J07–J08).\
**Layout:**

```text
[Title + status]
[Headline / summary / rich-text editor]
[Category, tags, author, featured asset and credits]
[Additional supported metadata / inline media]
[Save draft] [Private preview] [Submit / review / publish as permitted]
[Private version / review history for permitted roles]
```

On mobile place controls in document order, preserve labels and provide usable editing without horizontal clipping. Confirmation dialogs state what will change; do not label a failed action successful.

**States:** Unsaved changes, validation errors, saving/saved, upload errors, private preview unavailable or expired, submitted, returned for revision, approved, published, update/correction and archived as allowed; failures must not leak draft material. Include recoverable navigation away from unsaved changes where feasible.\
**Acceptance / dependencies:** Save, preview, submit, approve, publish and version retention operate only for authorised roles; public viewers see only the approved published version. Required fields, revision/approval rules, version display, concurrency and exact preview mechanism remain open for security and contract design.

### 5.5 Categories, tags and authors — newsroom management routes

**Goal:** Maintain controlled editorial metadata used in discovery.\
**Layout:** `[Title + permitted add action] → [Actual records] → [Edit / archive actions as authorised]`.\
**States:** Empty, validation/duplicate conflict, saved, failure and permission denied.\
**Acceptance / dependencies:** Authorised changes are reflected correctly without exposing private content; slug conflict and changing/deleting referenced records need later editorial/data policy.

### 5.6 Media library, videos, programmes and episodes — `/media/*` admin routes

**Goal:** Manage permitted assets and curated records (J09).\
**Layout:** `[Title + permitted add/upload] → [Actual items / metadata] → [Edit / feature / publication controls]`. A record editor includes approved title, description, category, source and rights/credit details as applicable.\
**States:** Empty, upload progress/failure, invalid file/link, unavailable external embed, saved, publication failure and permission denied.\
**Acceptance / dependencies:** Only allowed users can upload/edit/publish; file type/size limits, permissions, media rights, sanitisation and storage design require later decisions. Lazy public embeds and external fallback apply.

### 5.7 Radio, settings, staff and audit — `/radio/`, `/settings/`, `/staff/`, `/permissions/`, `/audit-logs/`

**Goal:** Support secure, traceable operations.\
**Layout:** `[Title] → [Permitted configuration/list] → [Explicit save or action]`; audit is a read-only view unless a later policy expressly allows otherwise. Privileged controls are grouped and labelled clearly.

**States:** Unconfigured, validation/permission error, saving, saved, unavailable service and audit/list empty. Show no secrets in logs or public UI. Do not suggest a configured stream is live until status is verifiable.\
**Acceptance / dependencies:** Actions are authorised and audited; configuration errors and access revocation are handled according to the later security/operations model. Radio source, role-to-action mapping, audit retention and ownership are open.

## 6. Future-phase page boundaries

Phase 2 includes Speak Up, forum and events; Phase 3 governance and evidence records; Phase 4 heritage, community, tourism and reviewed business directories; Phase 5 dedicated diaspora and newsletter experiences. These are described in the approved [sitemap](03-sitemap.md) and [journeys](02-user-journeys.md), not specified here as active pages. Each needs separate product, safety, data, moderation and design decisions. No newsletter signup, forum, civic-report form or marketplace appears as operational in Phase 1.

## 7. Review, handoff and outstanding decisions

- **Design validation:** Test navigation, hierarchy, contact expectations, radio playback and editorial tasks with actual participants; journeys remain hypotheses. High-fidelity visual assets and final responsive component behaviour are not yet approved.
- **Launch blockers:** Official stream and embedding permission, verified WhatsApp number and a functioning form delivery process; legal/privacy text, domain access, real content and licensed assets are still needed.
- **Later specifications:** Role matrix, preview protection, editorial transition rules, form fields/retention, SEO/cache behaviour, actual APIs and performance budgets belong to subsequent Phase 0 documents.
- **Owner review:** The wireframes and page behaviours were approved together with [05-design-system.md](05-design-system.md), subject to outstanding validation. Approval of Workstream 0.4 is not permission to build.

**Approval record:** Owner approved Workstream 0.4 on 2 November 2026; no changes to these page specifications requested.
