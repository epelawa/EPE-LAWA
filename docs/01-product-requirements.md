# EPE LAWA — Product Requirements

**Document:** 01 — Workstream 0.1, Product Discovery and Scope Definition\
**Status:** Workstream 0.1 approved by the owner on 2 November 2026; outstanding dependencies and later Phase 0 decisions remain open.\
**Prepared:** 2 November 2026\
**Current project stage:** Phase 0; no production development is authorised.\
**Product:** EPE LAWA — The Voice of Epe Division\
**Project delivery:** Brave Hx Technology\
**Founder/lead:** Akanji Mus'ab Ayomide

## 1. Purpose and decision status

This document records the product baseline supplied by the project owner and the first-release boundary approved with changes. It is the first Phase 0 deliverable; its approval is not approval to build. It makes product requirements reviewable by developers and future agents while explicitly identifying decisions that remain open. All project-supplied statements below are requirements or claims from the brief, not independently verified facts about the organisation.

**Approval gate:** The owner must review and explicitly approve or amend Workstream 0.1, including the proposed Phase 1 scope. After that approval, proceed to Workstream 0.2 (user research and journeys), not production implementation. Phase 1 still requires approval of the complete Phase 0 requirements, design, architecture, security model and development instructions. Changes to approved scope require recorded owner approval; preserve the reasons and date in this document or a linked decision record.

This repository contained only an initial README at inspection; there is no existing application or approved project specification to rely on. The brief is the source for the proposed requirements below. The remaining Phase 0 documents and technical decisions require their own review and approval.

## 2. Product definition

EPE LAWA is envisioned as a website-first civic, cultural, multimedia and community platform for Epe Division in Lagos State, Nigeria. It should inform, connect, represent and empower residents, indigenes, visitors and the diaspora. It is not solely a news blog, radio website, forum or generic SaaS product.

- **Positioning:** EPE LAWA — The Voice of Epe Division.
- **Supporting statement:** Connecting grassroots governance, culture, and community.
- **Mission:** Inform, connect, empower and represent Epe Division through community journalism, broadcasting, civic participation, cultural preservation and local development.
- **Long-term vision:** A trusted digital destination for verified local news, broadcasting, cultural heritage, community participation, public-interest information and local discovery, accessible from Epe and abroad.
- **Delivery principle:** Deliver useful, complete increments; inclusion in the long-term vision does not authorise building a later-phase feature now.

### Product goals and pillars

| Pillar | User problem and intended outcome | First-release expression |
| --- | --- | --- |
| Journalism and editorial trust | Readers need discoverable, reliable local reporting and transparent corrections. | Independent news experience and controlled publishing workflow. |
| Radio and media | Listeners and viewers need a dependable route to programmes and recorded reports. | Curated archive; live audio only when the official stream is supplied and verified. |
| Organisational identity | Visitors need to understand EPE LAWA and how to contact it. | Main website, about and approved contact information. |
| Community and civic participation | Residents need safe ways to share concerns and participate. | Future vision only; confidential reporting and discussions are Phase 2. |
| Governance and accountability | People need traceable, evidence-based public information. | Later Phase 3; news reporting is not itself a development tracker. |
| Heritage and local discovery | Communities and visitors need responsibly attributed cultural and local information. | Later Phase 4; no invented or unverified previews. |
| Diaspora connection | People outside Epe need access to credible local information. | The Phase 1 public sites and archives must be usable internationally; dedicated expansion and newsletter are later. |

Business outcomes are to establish a credible public presence and a sustainable editorial operation. No financial model, target audience size, revenue target or operating budget has been established.

## 3. Audiences and core needs

| Audience | Needs and proposed value | Release relevance |
| --- | --- | --- |
| Residents of Epe Division | Local news, broadcasts and trustworthy community information on mobile connections. | Phase 1 readers and listeners; submissions and discussions later. |
| Indigenes in the diaspora | Follow local events, news and recorded programmes from abroad. | Phase 1 access; dedicated experience later. |
| General news readers | Search, browse and read understandable reporting by subject and author. | Phase 1. |
| Radio listeners and video viewers | Find programme information, listen when available and view recordings. | Phase 1, subject to source availability. |
| Visitors and tourists | Understand Epe and discover local culture and places. | General organisational information in Phase 1; structured discovery later. |
| Local businesses and entrepreneurs | Be discovered and share contact details. | Business directory in Phase 4, not a launch marketplace. |
| Journalists and contributors | Prepare accurate stories and submit them for editorial review. | Authorised newsroom staff in Phase 1; external intake is undecided. |
| Editors and administrators | Review, approve and publish content; manage media, access and settings. | Private Phase 1 administration. |
| Moderators and civic staff | Handle reports, discussions and sensitive submissions safely. | Phase 2 onward; not a Phase 1 module. |

Public browsing must not require an account. Needs are inferred from the brief, not validated user research. Research methods and actual journey maps belong to Workstream 0.2.

## 4. Product boundaries and applications

Three connected web applications are proposed, subject to domain ownership, architecture and deployment validation:

1. **Main website — `epelawa.ng`:** public identity, organisational information and entry point to news and broadcasting. It must not become an ordinary news blog.
2. **Digital newspaper — `news.epelawa.ng`:** a distinct editorial publication for reading and discovering approved news.
3. **Admin dashboard — `admin.epelawa.ng`:** private staff workspace for content and platform operations across both public sites.

The applications should share a backend, identity strategy and design foundations where appropriate, without treating cross-subdomain session sharing as automatic. Names and routes are proposed, not evidence that domains are owned or services deployed. Phase 0 architecture work must validate the preferred Next.js/TypeScript, Supabase, pnpm/Turborepo and Vercel stack rather than assume it is final.

## 5. Phase 1 scope baseline — approved with changes

**Owner decision (2 November 2026):** The owner approved the proposed Phase 1 scope and deferrals, with live radio required for launch and contact through a form and WhatsApp. Detailed technical decisions and Phase 0 as a whole are not yet approved; scope approval does not authorise implementation.

### 5.1 Included

- Main corporate website, including an honest homepage, about and contact pages, a contact form and WhatsApp contact, and links into the news and media experiences.
- Dedicated news publication, article discovery and the editorial publishing system.
- Private admin dashboard for the Phase 1 newsroom, media, radio configuration, site settings, staff access and audit functions.
- Media and broadcasting centre, manually curated YouTube archive and supported Facebook links/embeds.
- Live radio at launch, requiring an authorised, compatible official direct audio stream to be supplied and tested. During outages, show an honest unavailable state and recorded-content alternatives; that fallback does not waive the launch requirement.
- Foundational security, editorial controls, responsive design, accessibility, SEO, deployment readiness and relevant documentation for those features.

These are functional scope, not a promise of live content before approved materials exist. The homepage must suppress empty or future-only sections or clearly state availability; it must not imply content or services exist when they do not. Team content, programme schedules, stories, media, breaking banners and other editorial highlights depend on approved material. No invented stories, users, usage counts, testimonials, streams or public records.

**Owner direction — no demo or seeded content:** Do not preload invented or demo articles, users, videos, statistics, programmes, events, businesses or other application records, and do not add data-seeding scripts. For available features with no records, show an honest, useful empty state rather than a blank interface; distinguish loading and errors from a genuinely empty result. Future-phase functionality must not be presented as active. Approved real content and legitimate staff accounts may be added by authorised operators; initial category labels are proposals, not automatically seeded records. Isolated automated tests may use clearly synthetic, temporary in-memory fixtures that are never deployed or loaded into application databases.

### 5.2 Deferred, not silently removed

| Phase | Proposed capabilities | Dependency or constraint |
| --- | --- | --- |
| 2 — Community and civic engagement | Speak Up Epe, moderated digital village square, community events and town halls. | Confidential submissions need privacy, retention, escalation and moderation capacity; no automatic publication. Speak Up is not an emergency service. |
| 3 — Governance and development | Reviewed Who Is Who profiles and an evidence-based development tracker. | Sources, verification, correction and update history; no unsupported accusations or rankings. |
| 4 — Heritage, tourism and business | Heritage archive; community and tourism profiles; reviewed business directory. | Local verification, permissions and attribution; respect distinct Eko Epe and Ijebu Epe histories. Directory is discovery/contact, not commerce. |
| 5 — Diaspora and expansion | Dedicated diaspora experience, consent-based newsletter, advanced archive and evaluation of further services. | Operational capacity, consent, email provider and approved demand. |

Cross-site access for diaspora readers is included in Phase 1; a dedicated diaspora programme or newsletter is not. The general contact form and WhatsApp channel are not substitutes for Speak Up Epe, a confidential reporting system or an emergency service. Formal external story intake and a dedicated diary/calendar are not approved. Form fields, recipient, handling, retention and privacy requirements remain to be decided before implementation.

### 5.3 Out of scope for Phase 1 and not otherwise authorised

- Public account registration, profiles, forum, private messaging, real-time chat, polls or community moderation.
- Citizen reporting, confidential submission reference numbers, town hall registration or event management.
- Public officeholder directory, project-status tracker, heritage/community/tourism catalogues and business listings.
- Newsletter signup, subscriber management, campaigns or marketing emails.
- Payments, checkout, inventory, orders or a marketplace; native mobile apps.
- Automated YouTube imports without a later API, quota and operational review; unofficial Facebook scraping or unsupported private endpoints.
- Unverified live labels, invented analytics or trending rankings, public access to drafts, and future modules presented as functional.

Potential future functionality does not constitute an approved commitment to implement it. Release ordering, dates, costs and staffing are not yet agreed.

## 6. Proposed Phase 1 functional requirements

These are product-level requirements, not a completed design, schema or API contract. Page-level routes and interactions will be refined in later Phase 0 workstreams. Requirements apply only after the relevant approval gates.

### 6.1 Main public website

- **P1-MAIN-01:** Introduce the organisation, mission and broadcasting presence with approved copy and authentic, licensed imagery. Proposed hero: “The Voice of Epe Division”; supporting copy: “Connecting Our People, Culture and Future.” Final copy and brand assets require approval.
- **P1-MAIN-02:** Provide responsive navigation and clear routes to news, listen/watch, about and contact. Suggested homepage order is navigation, hero, radio, latest news, media, introduction, then available future-area previews and footer. Show only genuinely available destinations or accurately labelled information, not nonfunctional promises.
- **P1-MAIN-03:** Display real approved articles and curated media when available, with honest empty/error states when not. Link readers to the dedicated publication.
- **P1-MAIN-04:** Provide a general contact form and an approved WhatsApp contact link, plus privacy and terms information and official social links. The form must deliver real submissions to an agreed recipient and show accessible validation, success and failure states; it must not promise confidentiality or emergency response. Define and approve fields, recipient, handling, anti-spam controls, retention and privacy notice before implementation. Obtain and verify the WhatsApp number and decide how its use is communicated; do not invent one.
- **P1-MAIN-05:** Include programme and radio information only when supplied and approved. Do not imply an official affiliation beyond the relationship confirmed by the owner and rights holders.

### 6.2 Dedicated news publication

- **P1-NEWS-01:** Offer a distinct newspaper-style home, latest and category browsing, search, pagination, article, author and tag discovery, plus relevant about/contact and video links. Full routes are proposed in the brief and will be confirmed in information architecture.
- **P1-NEWS-02:** Provide a lead story and category highlights from actually published content. A breaking banner requires a real designated breaking story; trending requires real engagement data and an agreed measurement method. Suppress these when unavailable rather than manufacture rankings.
- **P1-NEWS-03:** Articles support headline, summary, readable slug, featured image and credit, author, category, tags, publication and update dates, rich text, inline images and captions, supported video embeds, related coverage, sharing, SEO metadata, correction information, status and editorial history. Fields and publication validation are to be resolved in later specifications.
- **P1-NEWS-04:** Initial editable categories proposed: Politics & Governance; Community Development; Security; Education; Business & Economy; Culture & Tradition; Environment; Infrastructure; Events; General News. An Events news category is not an event calendar.
- **P1-NEWS-05:** Only approved published content is public. Drafts, review material, unpublished versions and internal editorial history must not appear in public pages, search, metadata, cached responses or indexes. Public correction information must not reveal private review notes.
- **P1-NEWS-06:** Editors can correct and update a published article without losing prior versions. Approval and review requirements for post-publication changes, correction display and archive/unpublish behaviour need owner confirmation before implementation.

### 6.3 Newsroom and administration

- **P1-ADMIN-01:** Only authorised staff can enter the dashboard; public users cannot access private operations or records. Authorisation must be enforced beyond the interface, including server and database controls.
- **P1-ADMIN-02:** Provide overview, newsroom, articles, drafts, editorial review, categories, tags, authors, media library, videos, programmes, radio settings, website settings, staff/permissions and audit logs. Do not expose later-phase modules as active.
- **P1-ADMIN-03:** Authorised staff can create, edit and preview drafts, manage metadata and images, submit for review, approve, publish, unpublish and archive according to assigned permissions. Show actual counts and activity, not sample metrics.
- **P1-ADMIN-04:** Proposed workflow: `Draft → In Review → Approved → Published → Updated / Archived`. State transitions must be authorised, recorded and recoverable as appropriate. Define returns for revision, unpublishing, reapproval and ownership in the security and editorial workstreams; the diagram is not a complete transition specification.
- **P1-ADMIN-05:** Keep article version history and auditable administrative actions. Specify access, retention and restoration procedures before building; internal records are private.
- **P1-ADMIN-06:** Manage permissible assets, credits, descriptions, video links, thumbnails, categories, programme data and featured selections. Upload validation, storage permissions and rights must be defined before deployment.
- **P1-ADMIN-07:** Candidate roles include super admin, administrator, editor-in-chief, editor, journalist and radio manager; enable only needed roles. Role-to-action mapping, approval separation, staff onboarding and recovery are unresolved. Community moderator and directory manager belong to later phases unless explicitly approved otherwise.

### 6.4 Broadcasting and third-party media

- **P1-MEDIA-01:** The brief identifies Radio Lagos 107.5 FM Àmitítí as the broadcasting presence. Confirm the exact station/programme relationship, naming and permission with the owner and rights holders before publication.
- **P1-MEDIA-02:** Live radio is required for launch. Playback requires an official direct stream URL, compatible format, embedding rights and actual browser/mobile testing; the absence of a verified working stream blocks launch unless the owner revises this decision. A social page or channel URL is not a direct stream. The player supports play, pause, loading, buffering, error and volume where supported. Show “LIVE” only when availability or status is verifiable; show an honest unavailable state during outages.
- **P1-MEDIA-03:** Curate approved YouTube videos manually at launch. Provide titles, thumbnails, descriptions, available dates, categories, accessible playback and external links; lazy-load embeds. Automatic importing is not required for Phase 1.
- **P1-MEDIA-04:** Link to the supplied Facebook page and support permitted embeds where technically and legally supported. Handle removed or unavailable content and avoid unnecessary third-party scripts. Do not scrape.
- **P1-MEDIA-05:** Record media rights and credits. Avoid assuming access to transcripts, captions, schedules or video uploads that have not been supplied.

## 7. Non-functional and operational requirements

- **Accessibility:** Aim for WCAG 2.2 AA. Keyboard access, visible focus, semantic structure, accessible names, usable forms and contrast are requirements; captions/transcripts where available. Later testing must define conformance evidence and any exceptions.
- **Performance and reach:** Prioritise affordable Android phones, slow connections and constrained data while supporting international users. Use appropriately sized images, pagination, efficient queries, caching, restrained JavaScript and lazy third-party media. Quantitative budgets await agreement and a measurement plan.
- **Responsive design:** Support small and standard phones, tablets, desktop and large screens. Test actual layouts; do not simply shrink desktop navigation.
- **Visual direction:** Proposed “Modern Riverine Editorial”: civic, cultural and image-led main site; readable newspaper identity; functional admin. Proposed tokens are teal `#0B5A60`, green `#2E7D32`, ochre `#E5A93C`, charcoal `#1C1E21` and ivory `#F9F8F6`; proposed type is Plus Jakarta Sans, Inter and a considered editorial serif. Verify contrast and brand approval. Avoid generic stock presented as Epe, decorative fake data and unnecessary effects.
- **Trust and content:** Separate verified information, attributed claims, opinion and unverified reports. Verify public claims and record sources; maintain corrections and copyright/media credits. Historical claims must be attributed, reviewed locally and not flatten distinct identities or settle disputed accounts by assertion.
- **Security and privacy:** Secure staff authentication and session lifecycle; least-privilege authorisation on server and database; RLS on exposed Supabase tables if that architecture is approved; private draft and administrative data; secret management; validation, sanitisation, upload restrictions, rate limiting, audit, backups and recovery. Never expose privileged keys in client code. Security design and testing must precede implementation.
- **SEO and discoverability:** Appropriate canonical URLs, metadata, social previews, sitemaps, robots rules and structured data for published content; exclude private and draft content. Publishing and corrections must refresh relevant public caches without exposing drafts.
- **Operations:** Provide environment, deployment, monitoring, rollback, backup/recovery and incident procedures during Phase 0. Separate development, preview and production access. Scheduled jobs require independent authentication, logging, failure handling and retries if introduced.
- **Legal:** Privacy, terms, editorial/corrections, copyright and retention policies require owner and appropriate legal review, including applicable Nigerian data protection requirements. Do not treat this document as legal advice.

## 8. Assumptions and dependencies

| ID | Assumption or dependency | Status / action |
| --- | --- | --- |
| A1 | The first release includes all three applications and shared editorial operations. | Scope confirmed by owner; staffing capacity and budget remain unconfirmed. |
| A2 | `epelawa.ng`, `news.epelawa.ng` and `admin.epelawa.ng` can be used. | Unverified; confirm ownership, DNS access, certificates and deployment authority. |
| A3 | Staff can supply and review launch content, credits, approved authors and editorial policies. | Owner identifies the owner and developer as responsible; allocation of editorial approval, corrections and staff access, plus capacity and content supply, remains unconfirmed. |
| A4 | Direct official radio stream, programme details and embedding permission will be supplied. | Missing/unverified; validate format, rights, availability and browser playback. A working stream is a launch prerequisite; never fabricate a player or live status. |
| A5 | Owner-supplied YouTube and Facebook URLs represent official channels. | Brief claims official status; ownership and permission need confirmation. Embed availability and rights remain untested. |
| A6 | Approved logo, brand guidelines, licensed authentic Epe images, organisational/team information and contact channels will be supplied. | Missing/unverified; do not substitute invented materials. |
| A7 | The organisation can review legal notices, data handling, corrections and access policies. | Unconfirmed; identify responsible owner and appropriate legal reviewer. |
| A8 | Supabase/Vercel and the proposed monorepo meet security, budget and operational requirements. | Not validated; evaluate architecture, costs, data location, recovery and provider access during Phase 0. |
| A9 | Email for staff auth/recovery and contact operations can be provisioned. | Owner reports using Resend (2 November 2026); configuration, verified sender/domain, delivery, ownership and budget remain unverified. Newsletter is separately deferred. |
| A10 | Analytics can support trending without unnecessary personal data. | Method, consent/legal basis, thresholds and provider undecided; omit trending if no trustworthy data exists. |
| A11 | A working contact form and WhatsApp channel are available at launch. | Owner requested both; WhatsApp number, submission fields, recipient, provider, retention, privacy and abuse handling remain unconfirmed. |
| A12 | Media storage can be provisioned securely. | Owner reports using Cloudflare R2 (2 November 2026); account, bucket access, public/private separation, pricing, backup and integration remain unverified. |

## 9. Key risks and mitigations

| Risk | Impact | Proposed mitigation / unresolved owner action |
| --- | --- | --- |
| Scope expands before foundations are approved | Delays and partial features. | Preserve the approved Phase 1 baseline; phase-gate changes and omit future-only UI. |
| Stream unavailable, incompatible or unauthorised | Live player cannot operate; launch is blocked or misleading claims result. | Verify rights and test the direct stream before launch; offer an honest unavailable state and recordings during outages. Any change to the live-radio launch requirement needs owner approval. |
| Weak editorial staffing, rights or initial content | Empty publication or unreliable information. | Owner and developer are identified; allocate editorial and access responsibilities, obtain licensed launch material and a correction policy, and use truthful empty states. |
| Staff access, unpublished versions or secrets leak | Harm to sources and operations. | Design least privilege, RLS, audit, authentication, preview isolation, security tests and recovery before build. |
| Historical/civic information is disputed or misrepresented | Community harm and loss of trust. | Attribute and verify claims with credible local sources and relevant authorities; document disputes and corrections. |
| Privacy and moderation obligations are underestimated | Sensitive submissions may expose residents. | Defer Speak Up and forum; define privacy, consent, escalation and moderation before Phase 2. |
| Unverified third-party dependencies or platform changes | Broken embeds, costs and degraded performance. | Test supported integrations, rights and failure states; link externally when embedding fails; monitor dependency costs. |
| Brand/domain/hosting ownership is unclear | Deployment delays, lock-in or impersonation. | Verify ownership and accountable operators; document access, DNS and recovery. |
| Low bandwidth and inaccessible interactions | Users cannot access content equitably. | Establish mobile performance budgets and test assistive technology and low-bandwidth conditions. |

## 10. Measurement and proposed release acceptance

Success must be measured using real operational records and an agreed privacy-conscious measurement plan, not fabricated data or arbitrary numerical targets. The owner must agree on quantitative targets, baseline, measurement owner, tools, reporting period and privacy approach before they become commitments.

| Indicator | Proposed evidence / acceptance condition |
| --- | --- |
| Public availability | Main and news sites render approved content at their confirmed domains, navigate between each other, and handle empty and error states. |
| Editorial delivery | Authorised staff create a draft, submit, review, approve and publish it; published content appears publicly; private drafts and versions remain inaccessible. Corrections retain history. |
| Discoverability | Readers find published articles through category browsing and search, open an article and use a share link; published SEO metadata is present and private content is excluded. |
| Staff access | Authorised and unauthorised access, account revocation and role boundaries pass agreed security tests; audit entries reflect real actions. |
| Media operations | Staff can curate and publish an approved media record; readers can access available recordings; unavailable embeds fail gracefully. |
| Radio | An authorised official direct stream must pass agreed desktop/mobile playback checks for launch. During outages, show a truthful fallback and recordings; no unverified “LIVE” label. |
| Contact | A validated general contact form delivers to the agreed recipient, shows success and failure states, and applies agreed privacy and abuse controls; the approved WhatsApp link opens the intended contact. |
| Accessibility and mobile | Agreed WCAG 2.2 AA checks and real viewport/keyboard/assistive-technology tests pass or documented exceptions are approved; mobile performance is measured against agreed budgets. |
| Security and release readiness | Relevant unit, integration and end-to-end checks, RLS/permission tests, backup and recovery, deployment, monitoring and legal/content review pass or have explicitly accepted exceptions. |

Tests, test environments, specific thresholds, ownership and release sign-off will be defined in later Phase 0 documents. An interface alone is not completion; real data flow, authorised behaviour, failures, documentation and tests must all be demonstrated. For later phases, measure reviewed submissions and response times, verified records and subscriber engagement only after definitions, consent and realistic targets are agreed.

## 11. Source review and evidence limits

Reviewed on **2 November 2026**, using the available page retrieval tool. “Observed” means the returned page or metadata contained the stated material; it does not independently verify claims, media rights, current status or ownership. No videos were independently watched or stream tested. Do not republish retrieved material without editorial verification and permission.

| Reference | Observed / access result | Limits and follow-up |
| --- | --- | --- |
| [EPE LAWA YouTube channel](https://www.youtube.com/@EPE_LAWA) | Retrieved page identifies “EPE LAWA” and lists videos; the returned page also contained an error message and inconsistent relative dates. | Channel ownership and official status are owner-supplied, not independently proven; confirm access, curation rights and reliable metadata. |
| [Broadcast reference](https://www.youtube.com/watch?v=22NVG42Ib9k) | Returned metadata identifies an EPE LAWA upload about an interview on riverine communities; its description calls EPE LAWA a weekly radio programme. | This is the uploader's description, not independent verification of the interview's claims, schedule or station affiliation. Transcript returned was unreliable; no playback or rights test. |
| [Facebook page](https://www.facebook.com/100092630340226) | Retrieval returned HTTP 403. | Content, ownership, embedding rights and functionality unverified; request owner-provided evidence. |
| [Facebook reference post](https://www.facebook.com/100092630340226/posts/latest-updates-from-epe-division-on-epe-lawa/974876665610003/) | Retrieval returned HTTP 403. | Post contents and availability unverified; request an accessible copy or permission. |
| [Epe Local Government](https://epelga.lg.gov.ng/) | Retrieved site presents local-government, governance, news and tourism navigation and describes local context. | A government site's statements are attributed institutional claims, not independent verification; coverage of Epe LGA must not be assumed to describe all of Epe Division. Confirm current claims and rights separately. |
| [Wikivoyage: Epe](https://en.wikivoyage.org/wiki/Epe_(Nigeria)) | Retrieved a travel overview with location, history and visitor information. | User-edited, potentially stale and not an authority for historical claims, boundaries, prices or permissions; independently verify before use. |
| [Wikipedia: Epe, Lagos State](https://en.wikipedia.org/wiki/Epe,_Lagos_State) | Retrieved an overview of Epe town/LGA and references to Eko Epe and Ijebu Epe. | User-edited and potentially internally inconsistent; not a definitive source for histories, institutions, geography or current officeholders. Review cited primary and local sources. |
| [Instagram reel](https://www.instagram.com/reel/DV_lqS6iMab/?hl=en) | Retrieval returned HTTP 403. | Content, context and rights unverified; ask the owner for an accessible reference. |
| [X post](https://x.com/Advsola/status/1906321425767522777) | Retrieved a user's discussion of Eko Epe and Ijebu Epe, with additional thread claims. | Individual social-media statements, not authoritative historical evidence. Do not adopt contested assertions without attributed local and primary-source review. |

The source review supports investigating an editorial and broadcasting platform and respecting distinct community identities; it does **not** verify specific historical narratives, public figures, projects, statistics, radio availability or any entitlement to reuse third-party content.

## 12. Decisions needed and next gate

### Decisions recorded

1. **Phase 1 scope:** Owner approved the proposed baseline and deferrals, with the changes below; Speak Up Epe remains in Phase 2.
2. **Live radio:** Owner wants live radio at launch. A verified, authorised working direct stream is a launch prerequisite, not an optional enhancement.
3. **Responsibility:** Owner and developer will be responsible. The split of editorial approval, corrections, technical operations and access management is still to be agreed; no named editor or specific assignment has been supplied.
4. **Contact:** Owner requested a general form and WhatsApp. The number, recipient, fields and handling requirements remain open; no confidential reporting workflow is implied.

### Outstanding questions and dependencies

- What is the official direct audio stream URL, its format and the permission to embed it? Confirm the station relationship, programme details and schedule. Until supplied and tested, live radio is a launch blocker.
- What WhatsApp number should be used, and who receives and handles form submissions? Agree the form fields, privacy notice, retention and abuse controls before implementation.
- Confirm domain ownership/DNS access, social-account ownership, and availability of approved launch content, licensed imagery and logo. Divide editorial and technical responsibilities between owner and developer.

Other open decisions — technical stack, authentication/session design, editorial role matrix and revision rules, measurable targets, legal review, budgets, analytics, copy and routes — belong to the relevant later Phase 0 workstreams and must not be silently guessed.

### Review record

- **Owner-supplied direction:** mission, vision, three proposed applications, phased platform vision, website-first approach, proposed stack and visual direction, and no production coding during Phase 0.
- **2 November 2026 — owner:** Approved the Phase 1 scope baseline with live radio required at launch; identified owner and developer as responsible; requested contact form and WhatsApp. Details and dependencies above remain unresolved.
- **2 November 2026 — owner:** Approved the updated Workstream 0.1 document. Open dependencies remain open; this is not approval of all Phase 0 deliverables or permission to build.
- **2 November 2026 — owner:** Reported using Resend and Cloudflare R2; account configuration, integration and operational readiness remain unverified. Evaluate their use in subsequent Phase 0 workstreams without recording credentials.
- **2 November 2026 — owner:** Approved Workstream 0.5 and directed three top-level folders: `frontend/`, `backend/` and `docs/`, plus necessary root files. Child layout and infrastructure still require validation; see [system architecture](06-system-architecture.md).
- **2 November 2026 — owner:** Directed no demo or seeded data and useful empty states. No demo data or seeding scripts; isolated temporary in-memory test fixtures are not public content. Full Phase 0 approval remains a separate checkpoint.
- **Follow-on work:** Workstream 0.2 user research and user journeys. Do not start Phase 1 until the full Phase 0 exit condition is approved.
