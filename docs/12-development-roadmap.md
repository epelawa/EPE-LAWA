# EPE LAWA — Development Roadmap and Readiness

**Document:** 12 — Workstream 0.8\
**Status:** Workstream 0.8 and the complete Phase 0 exit approved on 2 November 2026; no dates, costs or staffing commitments are implied.\
**Prepared:** 2 November 2026\
**Inputs:** [Product requirements](01-product-requirements.md), [architecture](06-system-architecture.md), [database](07-database-schema.md), [security](08-permissions-security.md), [API contracts](09-api-contracts.md), [integrations](10-integrations.md), [testing and acceptance](11-testing-acceptance.md).\
**Gate:** Owner approved Workstream 0.8 and the complete Phase 0 exit on 2 November 2026. Phase 1 implementation has begun with the foundation; release requires the Phase 1 gate.

## 1. Governance and status

EPE LAWA is a long-term civic, editorial, media and community platform delivered incrementally. Each phase follows **requirements → design → implementation → testing → review → approval → release**, with its own scope, dependencies, risks, exclusions and accountable owner. A later-phase feature in this roadmap is not permission to build it now. Do not call a phase complete while blockers remain.

**Current stage:** Phase 1 foundation. Owner approved Workstream 0.8 and the full Phase 0 exit on 2 November 2026. The three app shells and foundation tests exist; one staff foundation migration has been applied in production. A server-only session gate is in progress but unwired; real-provider security testing, complete identity flows, editorial functionality and integrations remain incomplete.

**Recorded owner direction:**

- Phase 1 includes main website, news publication, private admin, editorial CMS and media; Speak Up and other specified later-phase features are deferred.
- **Live radio is required at launch**. A verified, authorised working direct stream and tested playback are prerequisites; outage fallback does not waive that requirement.
- General contact uses a form and WhatsApp. Owner and developer are responsible, but their detailed role split remains open.
- Owner reports using **Resend** and **Cloudflare R2**. Their project configuration and integration are unverified; use them only after appropriate validation.
- Repository has three top-level folders, `frontend/`, `backend/`, `docs/`, plus needed root files. Three minimal application shells and backend documentation now exist; other child layout remains proposed. GitHub Actions would require `.github/` as a separate root directory, so obtain an exception or approve an alternative CI solution.
- No demo or seeded application data or data-seeding scripts; available features without records need meaningful empty states. Real approved records and legitimate staff accounts are provisioned through authorised operations, not fictitious fixtures.
- At the end of each completed phase, open a pull request for review with checks and outstanding limitations; merging still requires the owner’s instruction. Use the active Arena session branch only.
- Research publicly accessible UI references, including Mobbin, Pinterest where available and other relevant sources; follow [the UI research record](15-ui-research.md) and the approved palette. Produce original, authentic designs, not copied screens or generic templates.
- Apply reviewed Supabase migrations incrementally to the approved development/test target, verify history and RLS, and promote to production only after the relevant review and approval; never silently leave migration histories out of sync.

## 2. Phase 0 — discovery and readiness

### Status and deliverables

| Workstream | Deliverables | Status |
| --- | --- | --- |
| 0.1 Product discovery / scope | [01 Product requirements](01-product-requirements.md). | Owner approved; remaining dependencies and decisions open. |
| 0.2 User research / journeys | [02 User journeys](02-user-journeys.md). | Owner approved; journeys are hypotheses, research not yet conducted. |
| 0.3 Information architecture | [03 Sitemap](03-sitemap.md). | Owner approved; later validation may prompt changes. |
| 0.4 UX / design | [04 Page specifications](04-page-specifications.md), [05 Design system](05-design-system.md). | Owner approved proposals; assets and accessibility/device validation remain open. |
| 0.5 Architecture | [06 System architecture](06-system-architecture.md). | Owner approved direction and specified folder structure; provider setup remains unverified. |
| 0.6 Database / security | [07 Database schema](07-database-schema.md), [08 Permissions/security](08-permissions-security.md). | Owner approved design; detailed roles, policies and operational decisions remain open. |
| 0.7 Integrations / operations | [10 Integrations](10-integrations.md). | Owner approved research/plan; no project integration has been tested. |
| 0.8 Development readiness | [09 API contracts](09-api-contracts.md), [11 Testing/acceptance](11-testing-acceptance.md), [12 Roadmap](12-development-roadmap.md). | Owner approved on 2 November 2026; unresolved implementation decisions remain open. |

Diagrams are included where useful: application relationships and deployment in 06, ERD in 07, auth flow in 08, editorial workflow in 02/06 and textual page wireframes in 04. They are conceptual, not deployed infrastructure.

### Phase 0 exit checkpoint

The owner must review and explicitly approve the complete product requirements, first-release scope, architecture, design, security model and development instructions. Review the twelve documents for consistency, acknowledge outstanding assumptions and dependencies, agree a plan to resolve implementation-blocking decisions, and record the approval. A workstream approval alone is not Phase 0 exit approval or authorisation to build. Run a documentation consistency review and report actual results; no production code is permitted before this gate.

**Unresolved before the relevant implementation task:** exact editorial roles and self-approval policy; contact fields/recipient/storage/retention; R2 isolation/upload/backup design; Auth/Resend configuration; API payloads and rate limits; cache withdrawal/recovery; domain ownership; legal notices; budget and performance/recovery targets. Record responsible owners and dates only when actually agreed.

## 3. Phase 1 — core platform and public launch

**Objective:** Deliver the main website, distinct news publication, authorised admin/editorial CMS and media/broadcasting centre. Phase 1 implementation may begin only after the full Phase 0 gate and task-specific approvals. Owner and developer agree an incremental sequence, review each change and update documentation.

### Suggested implementation sequence — after authorisation

| Step | Deliverable / dependencies | Acceptance checkpoint |
| --- | --- | --- |
| 1. Foundation | Establish `frontend/`, `backend/`, `docs/` structure and necessary root files; decide CI exception/alternative, package boundaries, separate environments and dependency/version management. | Build and checks run in isolated environments; no secrets, production sample data or unnecessary services. |
| 2. Identity and permissions | Approved staff role matrix, Supabase Auth/session strategy, RLS/grants, account lifecycle, audit and migration workflow. | Authenticated and unauthorised negative cases pass; owner/developer responsibilities assigned. |
| 3. Editorial data / CMS | Versioned draft → review → approval → published workflow, editorial metadata, private preview, corrections/history. | Approved version alone is public; direct draft/role attacks denied; transitions and history tested. |
| 4. News publication | Distinct editorial home, article/category/author/tag/search/latest discovery, pagination, sharing and SEO. | Published-only real content, canonical links, accessible states and correct withdrawal/revalidation. Trending/breaking only with real eligible data. |
| 5. Main website / contact | Approved brand and licensed imagery, about, navigation, content highlights, privacy/terms, general form and WhatsApp. | Responsive and accessible; form delivers to an agreed recipient with truthful status; WhatsApp destination verified. |
| 6. Media and R2 | Curated programme/video/episode records, approved asset uploads, R2 private/public separation and permitted social embeds. | Private access denial, authorised uploads, public promotion, embed fallbacks and restore checks pass. |
| 7. Radio | Official direct stream, embedding rights, station/programme relationship and approved schedules; player and monitoring. | Actual permitted playback works on agreed mobile/desktop browsers at launch; truthful offline/error handling. This is a **launch blocker**, not an optional post-launch task. |
| 8. Email and operations | Verify Resend sender/domain and Auth SMTP where appropriate, contact notifications, DNS/TLS, caching, monitoring, backups and incident ownership. | Real controlled mail and failure/recovery tests, secure domains, verified restore and withdrawal procedures. |
| 9. Integrated QA / release | Execute [11 testing and acceptance](11-testing-acceptance.md), obtain owner review, document limitations and deployment. | Required tests and security/accessibility checks pass, blockers cleared and explicit release approval recorded. |

Ordering can be adjusted for safe parallel work after approval, but dependencies and security gates cannot be skipped. Radio provisioning should start early enough to expose the launch blocker. No feature is complete merely because a page renders.

**Phase 1 exclusions:** Speak Up, forum/public accounts, events calendar, governance tracker, heritage/tourism/business directories, newsletter, native apps, marketplace/payments, unsupported scraping and unapproved automated imports. News Events category is not an events calendar; a general contact form is not a confidential civic-report system.

### Phase 1 exit / release gate

Main/news/admin and media work end to end on agreed environments; approved news flows through versioned editorial review; staff permissions, secure storage, contact and Resend workflows work; real content is licensed and approved; accessibility, SEO, performance, security and operational tests pass or approved non-critical exceptions are documented. **The authorised live stream must be working and tested at launch.** Check DNS/TLS, backups/restore, monitoring, rollback, incident ownership and release documentation. The owner explicitly approves release after reviewing actual test results and remaining issues.

## 4. Phase 2 — community and civic engagement

**Objective:** Enable safe participation through Speak Up Epe, a moderated digital village square and community events/town halls.

- **Deliverables:** Secure non-emergency submissions and reference numbers, private review/verification/follow-up workflow, account-based structured forum, content reporting/moderation, managed events and community rules.
- **Dependencies / risks:** Legal/privacy review; consent, minimisation, retention/deletion and restricted access; abuse/spam controls; moderation staffing, escalation and response expectations; safe handling of allegations. No automatic publication, and Speak Up is not an emergency service.
- **Acceptance:** Submissions and contact details stay private; reference/workflow, user permissions, moderation and audit work; event management works; privacy/security tests pass. No chat, private messaging or polls without separate approval.
- **Gate:** Owner reviews Phase 2 scope, staffing, safety design and test evidence before release; do not begin automatically after Phase 1.

## 5. Phase 3 — governance and development accountability

**Objective:** Provide evidence-based public profiles and a development tracker.

- **Deliverables:** Reviewed Who Is Who profiles, projects with evidence-supported status, sources, verification dates, photos/documents where authorised and retained update history.
- **Dependencies / risks:** Credible source collection, review/corrections policy, rights, access and avoidance of unsupported accusations or political rankings.
- **Acceptance:** Approved profiles and projects can be managed and traced to sources; verification and historical updates are clear; incorrect content can be corrected or withdrawn.
- **Gate:** Separate scope, editorial/security review and owner approval before implementation and release.

## 6. Phase 4 — heritage, tourism and business discovery

**Objective:** Preserve cultural identity and support local discovery.

- **Deliverables:** Attributed heritage archive, community profiles, tourism places and a searchable reviewed business directory.
- **Dependencies / risks:** Credible local sources and relevant traditional authorities, contributor attribution, photo rights, respectful treatment of distinct Eko Epe and Ijebu Epe histories, ongoing listing verification.
- **Acceptance:** Approved attributed content and listings are manageable/searchable; unverified claims are not represented as verified; public data and rights are reviewed. Directory supports discovery/contact, not unapproved checkout or e-commerce.
- **Gate:** Owner and appropriate cultural/editorial reviewers approve requirements, evidence standards and release tests; no automatic transition.

## 7. Phase 5 — diaspora connection and expansion

**Objective:** Improve international access, consent-based outreach and media discovery.

- **Deliverables:** Dedicated diaspora experience; newsletter subscription confirmation, unsubscribe, subscriber/campaign management, consent and delivery records; advanced media discovery/collections and transcripts where available.
- **Dependencies / risks:** Provider and deliverability, marketing consent and retention, capacity for campaigns, media rights and international playback. Separate transactional email from marketing operations.
- **Acceptance:** Consent, confirmation, delivery and unsubscribe behave correctly; available media is discoverable and accessible; expansion decisions use demonstrated demand and documented approval.
- **Gate:** Separate scope and privacy/operational review before implementation and release. Native apps and additional services require separate product approval.

## 8. Development and operational standards

- **Repository:** Follow owner-directed `frontend/`, `backend/`, `docs/` top-level organisation plus necessary root files. Shared business logic has a clear owner, no circular dependencies and no server-only secrets in browser bundles. Do not force a standalone backend API if an application-specific server handler and shared backend are sufficient.
- **Git and review:** Preserve the existing working branch and repository; use small, reviewable changes and open a pull request at the end of each completed phase, with checks, blockers and protected-main review. Merge only when instructed. Never overwrite uninspected work. Platform-specific branch restrictions take precedence over generic workflow instructions.
- **Coding after approval:** TypeScript strict, validated input, typed access, accessible UI, no hardcoded secrets, no unnecessary dependencies, no demo/preloaded records and no data-seeding scripts. Schema changes go through reviewed migrations. Use only temporary in-memory synthetic test fixtures; integration tests requiring persistent data need a separately approved isolated procedure and cleanup.
- **Environment and deployment:** Separate development, protected preview and production data/credentials; avoid real contact reports in test. Independent Vercel deployments and Supabase/R2/Resend resources require verified ownership and configuration. Define domain, SSL, secrets, monitoring, rollback, backups and access revocation before release.
- **API and security:** Finalise [09](09-api-contracts.md) payloads and [08](08-permissions-security.md) policies before affected implementation. Review every privileged action server-side and at data boundary. Do not expose drafts, private object URLs or service keys.
- **Tests and evidence:** Execute appropriate checks from [11](11-testing-acceptance.md); report commands and actual results, not assumptions. Log defects and approval of exceptions. No fabricated data, results, users, streams or project claims.
- **Documentation:** Keep requirements, architecture decisions, migrations, API contracts, environment reference, setup, deploy, monitoring, recovery, privacy and testing instructions current. Document material scope changes and obtain owner approval.

## 9. Readiness and owner decision register

| Item | Status / next action |
| --- | --- |
| Phase 0 workstream 0.8 and complete Phase 0 | Owner explicitly approved both on 2 November 2026; Phase 1 foundation authorised. |
| Live radio | Direct stream URL, format, embedding permission and station relationship unverified; test actual playback before launch. |
| General contact | WhatsApp destination, form fields, recipient, handling, storage, retention and notice not supplied/approved. |
| Staff and editorial | Owner and developer identified; allocate permissions, editorial approver, reviewer independence, support and incident ownership. |
| Services and domains | Confirm Supabase, Vercel, R2, Resend and DNS ownership/access, sender/domain and separate environments; no secrets in chat. |
| Brand/content/legal | Approved logo, authentic licensed images, initial stories, programme material, policy text and rights still needed. |
| Engineering detail | Exact API schemas, RLS/grants, version workflow, upload scanning, cache invalidation, backup/restore, performance/security targets and CI choice require review before affected work. |
| Research | Conduct approved usability/interview research; current journeys and designs are not claimed as verified findings. |

## 10. Coding-agent handoff after the Phase 0 gate

For each authorised task: inspect repository, documentation, current branch and working tree; identify dependencies and decide the smallest safe change; implement only approved scope; enforce permissions on the server/data boundary; run relevant checks; review diff and results; update documentation; report blockers and known limitations. Commit or open a pull request only when authorised and under the session's branch rules. Do not introduce a new phase automatically, expose secrets, invent data, or claim an untested integration works.

**Approval record:** Owner approved Workstream 0.8 documents 09, 11 and 12 and the full Phase 0 exit on 2 November 2026. Phase 1 foundation is authorised; release approval and outstanding decisions remain separate.
