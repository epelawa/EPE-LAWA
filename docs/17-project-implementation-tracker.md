# EPE LAWA — Full Project Implementation Tracker

**Last updated:** 2 November 2026

**Current phase:** Phase 1 — core platform; identity and permissions underway.

**Purpose:** A practical checklist from discovery through the last currently planned phase. This supplements, rather than replaces, the approved [roadmap](12-development-roadmap.md), [requirements](01-product-requirements.md), [security design](08-permissions-security.md) and [acceptance plan](11-testing-acceptance.md).

**Reading the boxes:** `[x]` means that specific item has been completed and evidence is named; `[ ]` means not finished, including work that is partly implemented. A completed subtask does not mean its phase is complete or released. Proposed later phases are planning direction, **not permission to start them**. Update this file and the linked evidence whenever status changes.

**Delivery rules:** Stay in Phase 1 until its work, tests and review are complete. The owner requested incremental commits, with the phase pull request and merge after its steps are complete. A merge does not itself constitute launch approval. Production migrations and security-sensitive changes still need the documented review, and owner approval is required for launch. No fake or seeded application records; synthetic fixtures are test-only and ephemeral.

## Phase 0 — discovery and planning — APPROVED

- [x] 0.1 Product purpose, audience and first-release scope documented and approved — [requirements](01-product-requirements.md).
- [x] 0.2 Proposed user journeys documented and approved — [journeys](02-user-journeys.md). These are hypotheses; user research is still outstanding.
- [x] 0.3 Sitemap and information architecture documented and approved — [sitemap](03-sitemap.md).
- [x] 0.4 Page specifications and proposed design system documented and approved — [pages](04-page-specifications.md), [design system](05-design-system.md). Asset rights and real-device validation remain open.
- [x] 0.5 Application and infrastructure architecture documented and approved — [architecture](06-system-architecture.md).
- [x] 0.6 Proposed data model and security approach documented and approved — [schema](07-database-schema.md), [security](08-permissions-security.md). Detailed permissions are not yet final.
- [x] 0.7 Integration and operational plan documented and approved — [integrations](10-integrations.md). Provider configuration is not thereby verified.
- [x] 0.8 Proposed API contracts, testing and development roadmap documented and approved — [API](09-api-contracts.md), [testing](11-testing-acceptance.md), [roadmap](12-development-roadmap.md).
- [x] Full Phase 0 exit approved by the owner on 2 November 2026; [PR #1](https://github.com/epelawa/EPE-LAWA/pull/1) merged. Outstanding decisions carry forward; approval was not a Phase 1 launch approval.

## Phase 1 — core platform and public launch — IN PROGRESS

**Goal:** Working main site, separate news site, private staff/admin and editorial CMS, media and required live radio. Backend and security foundations precede connected interfaces. Public holding pages currently say services are not connected; they are not finished product pages or seeded content.

### 1.1 Foundation and delivery

- [x] Create `frontend/`, `backend/`, `docs/` structure and workspace tooling; add main, news and closed admin shells — [PR #2](https://github.com/epelawa/EPE-LAWA/pull/2).
- [x] Establish local build, typecheck and automated foundation tests; no seed scripts — [README](../README.md).
- [x] Identify the owner-confirmed Paris Supabase project as production and apply the reviewed staff-access foundation migration — [staff foundation](14-staff-access-foundation.md).
- [x] Address the requested main-site metadata, links, icons, sitemap, baseline headers, security contact and error/connection components — [PR #4](https://github.com/epelawa/EPE-LAWA/pull/4), [audit record](16-audit-and-delivery.md). Clyvro/live-device verification is not implied.
- [x] Add Clyvro verification metadata — [PR #5](https://github.com/epelawa/EPE-LAWA/pull/5).
- [x] Refine connection notices and disable the custom pull gesture on the landing page — [PR #6](https://github.com/epelawa/EPE-LAWA/pull/6), [PR #7](https://github.com/epelawa/EPE-LAWA/pull/7). Real mobile validation remains outstanding.
- [ ] Finalise CI approach, safe environment separation, backups and recovery. The owner requested use of the live project; metadata checks there do not replace isolated negative tests.

### 1.2 Staff identity, permissions and security — CURRENT STEP

- [x] Owner selected email and password for staff sign-in on 2 November 2026. Do not share passwords or provider credentials in chat.
- [x] Owner designated two initial administrators; read-only production inspection found neither has an Auth account. No account or permission was created — see [onboarding runbook](18-initial-staff-onboarding.md).
- [ ] Securely create and verify both designated Auth identities and grant only reviewed capabilities; admin remains closed until the Phase 1 security gate passes.
- [x] Add inactive-by-default staff profiles and explicit `admin.access` grant with RLS; no accounts seeded — [migration and checks](14-staff-access-foundation.md).
- [x] Implement and test unwired identity, session, response and redirect foundations — [PR #3](https://github.com/epelawa/EPE-LAWA/pull/3), [PR #6](https://github.com/epelawa/EPE-LAWA/pull/6), [PR #7](https://github.com/epelawa/EPE-LAWA/pull/7). These do not open admin or provide full login.
- [ ] Implement reviewed email/password sign-in, sign-out, session refresh and password recovery on the real admin host; an unwired sign-in and logout foundation exists but is not a portal; configure verified email delivery and safe redirects.
- [ ] Finalise staff roles, explicit capabilities, editorial approval authority, account provisioning, revocation, audit, recovery and incident responsibilities.
- [ ] Enforce current permissions at each route/action and database boundary; integrate CSRF and rate limiting before enabling mutations.
- [ ] Complete positive and negative real-provider, browser and security tests, including revoked/inactive staff and recovery. Maintain admin as closed until all safeguards and review pass.

### 1.3 Editorial data and CMS

- [ ] Finalise article data contracts, role/capability matrix, ownership and independent/self-approval rules before migrations.
- [ ] Design and review migrations/RLS for articles, immutable versions, drafts, reviews, approvals, publication, corrections and audit history. A [database prototype](20-editorial-storage-proposal.md) and unwired public reader are tested only with mocks/in memory; they are not a migration or connected application and are not deployed. Test safely before production.
- [ ] Build server-side draft → review → approval → publish/unpublish/correct transitions with concurrency protection and audit; prevent direct draft or privilege bypass. An unwired model and transaction contract exist — see [editorial foundation](19-editorial-workflow-foundation.md) — but they have no real database transaction, public API or content. The owner wants publication and removal reflected promptly; real cache behaviour and deletion/retention require review and testing.
- [ ] Build secure private preview and staff editorial interfaces only after backend permissions exist; test draft privacy, approved-version integrity, withdrawal and cache invalidation.

### 1.4 News publication

- [ ] Build the distinct news site from approved, actually published content: home, article, categories, authors, tags, search and pagination.
- [ ] Provide accessible loading/empty/error states, sharing, canonical URLs and metadata; do not label invented content as real or fabricate trending/breaking news.
- [ ] Test published-only exposure, accessibility, indexing, withdrawal and revalidation across supported devices.

### 1.5 Main website and contact

- [ ] Build the complete responsive main website, approved brand/navigation/about and real editorial/media highlights using licensed assets.
- [ ] Agree contact-form fields, recipient, handling, safeguards, privacy/retention and approved WhatsApp destination before implementing.
- [ ] Connect and test the approved form and WhatsApp link, legal notices, truthful feedback, accessible states and actual delivery.

### 1.6 Media and R2

- [ ] Confirm R2 ownership/configuration, approved private/public separation, upload limits, inspection, backup and rights management.
- [ ] Build authorised media metadata, upload/review/promotion, access controls, curated programme/video/episode records and supported social embeds.
- [ ] Test private-object denial, authorised uploads, publication, cache/withdrawal and restoration. Do not scrape Facebook or use unauthorised assets.

### 1.7 Live radio — launch blocker

- [ ] Obtain the authorised direct stream, station/programme information and embedding permission; verify format, HTTPS and reliability.
- [ ] Implement playback and truthful unavailable/error states; display LIVE only when verified.
- [ ] Test actual permitted playback on agreed mobile and desktop browsers. A working authorised stream is mandatory for Phase 1 launch.

### 1.8 Email, operations and deployment

- [ ] Verify Resend ownership, sender/domain and Auth SMTP/recovery; test real controlled delivery and failures.
- [ ] Validate domains/DNS/TLS, environment configuration, secrets, monitoring, operational ownership, backups/restore, rollback and incident procedures.
- [ ] Review CDN/security headers, CSP reports, search indexing, privacy/legal text and actual content rights; renew `security.txt` before its expiry.

### 1.9 Integrated quality and Phase 1 gate

- [ ] Run real-provider positive/negative security, browser/device, accessibility, performance, low-bandwidth, SEO, radio and end-to-end editorial/contact tests.
- [ ] Document evidence, outstanding issues and accepted exceptions; complete Phase 1 review and pull request, then merge according to owner direction.
- [ ] Obtain explicit release approval and deploy/verify the release. Until then, Phase 1 is **not complete or launch-ready**.

## Phase 2 — community and civic engagement — NOT STARTED

Separate approval is required; do not start while working on Phase 1.

- [ ] Agree legal/privacy, moderation staffing, escalation, retention/deletion and safety requirements.
- [ ] Design secure Speak Up non-emergency submissions, references and private review/follow-up; do not publish automatically.
- [ ] Build an account-based moderated community forum and reporting tools, with approved community rules.
- [ ] Build managed events/town halls, not an unapproved public event scrape.
- [ ] Test privacy, authorisation, abuse handling and accessibility; complete review, approval and release.

## Phase 3 — governance and development accountability — NOT STARTED

Separate scope, editorial/security review and approval required.

- [ ] Agree evidence, review, correction and rights standards for people and projects.
- [ ] Build reviewed Who Is Who profiles and development-project records with sources, verification dates and update history.
- [ ] Add permitted documents/images and traced corrections/withdrawal; avoid unsupported claims or political rankings.
- [ ] Test source traceability, access, corrections and security; review, approve and release.

## Phase 4 — heritage, tourism and business discovery — NOT STARTED

Separate owner and appropriate cultural/editorial approval required.

- [ ] Confirm credible sources, contributor attribution, asset rights and community review; respect distinct Eko Epe and Ijebu Epe histories.
- [ ] Build a reviewed heritage archive, community profiles, tourism places and searchable business directory.
- [ ] Support verified listing maintenance, accessibility and contact/discovery; no unapproved checkout or marketplace.
- [ ] Test accuracy, attribution, permissions and updates; review, approve and release.

## Phase 5 — diaspora connection and expansion — NOT STARTED

Separate scope, privacy and operational approval required.

- [ ] Agree diaspora experience scope, consent and international access needs.
- [ ] Build newsletter confirmation, consent, subscriber/campaign management, delivery records and unsubscribe; separate marketing from transactional email.
- [ ] Build approved media discovery/collections and transcripts where available, with rights and accessibility checks.
- [ ] Test consent, unsubscribe, delivery, access and privacy; review, approve and release. Native apps and extra services need separate approval.

## Known cross-phase inputs and constraints

- Real authorised radio stream and rights; WhatsApp destination and form decisions; real approved articles/media; logo-element rights; domains; Resend/R2 setup; operational responsibilities; editorial role/self-approval decisions; privacy/legal and retention rules are still outstanding.
- Production Supabase metadata has been checked, but no real staff login or end-to-end RLS security test has passed. Mock tests are not provider proof.
- No production credentials, passwords, tokens or private contact content in the repository, logs or chat. No demo/seeded application data.
- Scope and acceptance can evolve only through documented decisions. A checkbox is marked complete only when its specific result is actually verified.
