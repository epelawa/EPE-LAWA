# EPE LAWA — Proposed System Architecture

**Document:** 06 — Workstream 0.5\
**Status:** Workstream 0.5 and the complete Phase 0 plan were approved on 2 November 2026. The initial foundation is authorised; provider recommendations still require validation.\
**Prepared:** 2 November 2026\
**Inputs:** [Product requirements](01-product-requirements.md), [user journeys](02-user-journeys.md), [sitemap](03-sitemap.md), [page specifications](04-page-specifications.md) and [design system](05-design-system.md).\
**Owner direction:** On 2 November 2026 the owner reported using **Resend** and **Cloudflare R2**. Treat these as owner-specified services, not as proof of configured accounts, access, permissions or working integrations.\
**Gate:** Workstream 0.5 is approved; proceed to Workstream 0.6 (database and security design). The full Phase 0 exit condition still applies before production coding.

## 1. Goals and constraints

The architecture should support three distinct applications, accurate public content, a private editorial workflow and accessible mobile-first delivery without prematurely building later phases. Key constraints:

- Phase 1 includes the main site, news publication, staff admin, manually curated media and a general contact form with WhatsApp. **Live radio is required at launch**, not an optional enhancement.
- A missing or untested official stream and embedding permission blocks launch; truthful offline/error handling is still needed for later outages.
- Only approved published content is public. Drafts, private previews, internal review notes, contact submissions, operational credentials and audit information stay private.
- Public browsing needs no account. Admin authentication and authorisation must be enforced by trusted server/database controls, not hidden navigation.
- Resend and Cloudflare R2 are part of the owner's direction. Verify actual availability, integration, cost and configuration before selecting irreversible implementation details. Do not assume unrelated existing projects or secrets are available to EPE LAWA.
- Speak Up, forum, events, governance, heritage, business directory and newsletter belong to later approved phases; they must not be treated as active Phase 1 services.

## 2. Architecture direction — approved, subject to validation

Use a TypeScript monorepo with three separately deployable Next.js applications, a shared content/auth/data foundation, Supabase PostgreSQL and Auth, Cloudflare R2 for object storage, and Resend for transactional email where supported and verified. Vercel is the proposed host. This is an approved direction, **not evidence that any service has been configured or tested**.

```text
PUBLIC BROWSER                          AUTHORISED STAFF BROWSER
      |                                             |
      | HTTPS                                       | HTTPS
      v                                             v
[Main site] <---- canonical links ----> [News site]  [Admin site]
      \                                    /             |
       \ public published content only    /              | authenticated server operations
        \                                /               | + permission checks
         +----> [Server / content access layer] <--------+
                         |              |              |
                         v              v              v
             [Supabase Postgres] [Supabase Auth] [Cloudflare R2]
             content / audit /    staff identity  approved public assets /
             contact data         and sessions    separately protected private assets
                         |                              ^
                         +--> [Notification workflow]   |
                                   |                    +-- approved uploads via authorised flow
                                   v
                               [Resend]
                      transactional email, subject to testing

Public browser ── user-initiated playback ──> authorised radio stream / supported video host
```

The diagram is conceptual, not an API contract or claim of a deployed service. Data access must enforce the caller's permissions even when a shared library or server route is used. Public access to R2 is limited to explicitly published public assets; private objects are never placed in a public bucket or served through a public URL.

### Responsibilities and boundaries

| Area | Proposed responsibility | Boundary / uncertainty |
| --- | --- | --- |
| Main application | Public identity, contact, radio, programmes and curated media. | Reads approved published content; no privileged browser keys. |
| News application | Distinct publication, canonical articles and discovery. | Reads only public published data; private editorial data cannot leak via search, cache or metadata. |
| Admin application | Staff authentication, authorised editing, review, publishing, media management and audit. | Server and database enforce roles. Sensitive operations and secret handling stay server-side. |
| Shared packages | Reusable design, validation, typed access and business rules when reuse is justified. | Package interfaces should not expose service secrets or create circular dependencies. Do not make every suggested package a mandatory initial dependency. |
| Supabase Postgres | System of record for approved Phase 1 relational content, operational metadata, identity mapping and audit. | Migrations are source of truth; RLS on exposed tables plus server checks. Schema and permissions are Workstream 0.6. |
| Supabase Auth | Proposed staff identity, login and sessions. | Confirm provider capabilities, rate limits, email delivery and secure integration. Public accounts deferred. |
| Cloudflare R2 | Owner-specified object storage for approved assets and private objects where needed. | Public and private objects require separate exposure controls; actual account, buckets, permissions, backup and pricing unverified. |
| Resend | Owner-specified transactional email provider for applicable account and contact notifications. | Verify sender/domain, approved recipient, SMTP/API integration, delivery and cost. Newsletter/campaigns remain Phase 5. |
| External media | Authorised direct radio stream and supported video/social embeds. | Browser access, rights, availability and privacy not assumed; no scraping or fabricated stream. |

## 3. Candidate decisions and trade-offs

These are proposals for review, not silently finalised stack choices. Later documents should record confirmed choices and material changes.

| ID | Decision / recommendation | Why / alternative considered | Validation or open decision |
| --- | --- | --- | --- |
| AD-01 | Three separately deployed applications in a pnpm/Turborepo monorepo, organised beneath `frontend/`, `backend/` and `docs/` as directed by the owner; shared packages only where useful. | Allows distinct public/news/admin lifecycles and shared foundations while separating frontend, backend and documentation. A single app would reduce deployment overhead but change the approved structure. | Confirm the proposed child layout, budget, workspace boundaries and build/deploy support. |
| AD-02 | Next.js App Router, TypeScript strict, Tailwind and Zod as proposed in the brief. | Aligned with proposed stack and typed server/client boundaries; alternatives remain possible if operational or accessibility constraints warrant. | Test deployment, team familiarity, component accessibility and dependency/licence suitability. |
| AD-03 | Supabase PostgreSQL and Auth for identity and relational content. | Shared source of truth and policy-capable database; alternatives should be compared if cost, region or security requirements conflict. | Verify project ownership, location, recovery, RLS, auth/email and quotas. The owner confirmed the visible Paris project as the production target, superseding the earlier Ireland selection. |
| AD-04 | Use **Cloudflare R2**, per owner, for media objects; keep relational metadata in Postgres. | Avoid duplicating the same storage role between R2 and Supabase Storage. The brief proposed Supabase Storage; this recommendation changes that candidate, not the database/auth choice. | Confirm account/region, bucket design, integration, access and costs; introduce Supabase Storage only for a justified, explicitly approved need. |
| AD-05 | Use **Resend**, per owner, for appropriate transactional mail. | Shared owner-specified provider; for Supabase Auth evaluate a supported Resend SMTP setup rather than assume direct API configuration. | Verify sender domain, auth email method, provider limits, retries and delivery; separate marketing/newsletter from transactional mail. |
| AD-06 | Default to an admin-host-only secure session for Phase 1. | Public sites need no login; avoids broad subdomain cookies and token sharing. Alternative shared auth adds exposure and coordination. | Validate Supabase SSR/session refresh, host-only cookie behaviour, CSRF, redirects and preview domains. Do not treat cookie scope as automatic. |
| AD-07 | Manual media curation and links to supported external playback. | Smaller operational surface than automatic import or self-hosted large video. | Verify each provider's embedding rights, availability and performance; no unsupported scraping. |
| AD-08 | Public content caching with bounded freshness and reliable publication/withdrawal invalidation; private content uncached/shared-cache excluded. | Supports mobile/international performance. Alternatives range from short-lived cache to event-driven revalidation; neither can be declared safe without tests. | Agree freshness targets, failure fallback and mechanisms in API/security/test work; prevent stale unpublished content being served. |
| AD-09 | For general contact, consider durable server-side acceptance plus transactional notification. | Separates user-facing confirmation from eventual email delivery; avoids claiming delivery when a provider merely accepted a message. Direct email-only submission is simpler but risks loss/uncertain handling. | Owner must approve form fields, privacy, retention, recipient, confirmation wording, operational handling, retries and storage model. Not a confidential Speak Up system. |

Rich-text tooling (Tiptap or equivalent), analytics, specific caching mechanisms, queues, SMTP configuration and contact implementation are deliberately unresolved. No future-phase schema or feature is authorised by architectural extensibility.

## 4. Repository and application boundaries

**Owner direction:** Organise the repository into three top-level folders, `frontend/`, `backend/` and `docs/`, in addition to necessary root files. The following child structure is a proposed interpretation; the initial application shells and backend README now exist, while other child folders remain planned.

```text
frontend/
  apps/
    main/                # public organisation, contact, radio, media
    news/                # public digital newspaper
    admin/               # staff operations
  packages/              # shared UI and browser-safe code where justified
  tests/                 # frontend/cross-application tests where appropriate
backend/
  supabase/
    migrations/          # future reviewed schema history
    config.toml          # future local configuration, no secrets
  packages/              # shared server/domain, auth, validation, types as justified
  services/              # only if a separate service is actually justified
  tests/                 # integration/security tests when implementation begins
docs/                    # planning and operational documentation
README.md, package.json, pnpm-workspace.yaml, turbo.json, etc.  # future root files as needed
```

Next.js applications may contain server-side rendering and application-specific server handlers within `frontend/apps/`; `backend/` groups shared backend code, database/infrastructure and any approved service. This is a responsibility boundary, **not** a requirement to introduce an independent API server or duplicate business rules. Shared server-only modules must never be included in browser bundles; browser-safe contracts can be shared without exporting secrets. Final workspace dependencies, test placement and deployment boundaries require later validation.

Root workspace/config files were added after the owner authorised the foundation. The original brief also proposed `.github/workflows/`; GitHub Actions requires that root directory, so use of GitHub Actions would require an explicit exception to the three-folder direction, or choose a compatible alternative after review. No extra top-level folder is authorised here. Avoid circular dependencies. Do not create data-seeding files or scripts or preload demo records. Isolated, temporary in-memory test fixtures may be used only in tests and must not be loaded into application databases or shown as real content. The tree does not imply that migrations, shared backend packages or provider integrations have been created.

## 5. Data flows and content lifecycle

### 5.1 Read and publish

```text
Staff sign-in → draft/edit → private preview → review → approve → publish
       │               │                    │                      │
       └── role checks / audit / retained versions ────────────────┘
                                      ↓
                         published-only public read model
                                      ↓
                    news article + main-site real highlights
```

1. Staff changes are validated and authorised on the server and enforced through appropriate database access controls. Content versions and editorial actions are preserved according to the eventual approved schema and policy.
2. Publication transitions atomically update the authoritative record and record the appropriate audit/history. Exact transaction boundaries, approval/reapproval rules and recovery are Workstream 0.6/API decisions.
3. Public reads return only the approved published version and safe metadata. Homepage and discovery link to the canonical news article, not a separate duplicated article.
4. Publication, correction, unpublication and archive trigger appropriate invalidation of all relevant public caches, indexes and metadata. Establish a tested recovery path for failed invalidation; **do not claim that a timed cache expiry alone guarantees immediate withdrawal**. Until a safe withdrawal process exists, release is blocked for content that could be incorrectly exposed.
5. Private preview requires authenticated authorised access, is never placed in a shared/public cache or search index, and must not use bearer secrets in public URLs. Implementation and expiry are unresolved security decisions.

### 5.2 Media through R2

1. Authorised staff upload only permitted assets through a controlled server-mediated or narrowly scoped upload flow; validate size, type and content, permissions and any applicable malware-scanning policy. Exact limits and tooling need approval.
2. Keep objects private by default during ingest and review. Store rights, credits, owner and lifecycle metadata in the database. No public URL or guessable object key is an access control mechanism.
3. Only explicitly approved public media is delivered through a controlled public delivery path/bucket; private drafts and other confidential assets stay in separately protected storage. If a published article shares an asset with a draft, only the explicitly approved public asset is publicly available; private originals/variants remain separate.
4. Private access uses an authorised backend or scoped, short-lived access mechanism designed and tested for the actual threat model; signed URLs are bearer credentials and must not leak to logs, referrers or public metadata. Define expiration, caching and revocation limits before use.
5. Review removal, cache purge, backup, access revocation and orphan cleanup. Never assume deleting a database record deletes cached copies or R2 objects. Assess whether and how to back up R2 assets independently of database backups.

R2 object versioning, backup capabilities, image transformation, custom domains, S3-compatible API behaviour and CDN caching must be confirmed for the actual account and plan; none is assumed operational. Large broadcast video is expected to remain on suitable external platforms unless a separately approved delivery design exists.

### 5.3 Contact and transactional mail

```text
Visitor → general contact form → server validation / abuse controls
                                  ↓
                    [candidate: durable private submission]
                                  ↓
                        notification workflow → Resend → approved recipient
```

- Candidate flow: validate and securely persist a minimal submission before acknowledging receipt; queue/dispatch a notification to an approved recipient. This requires owner agreement on fields, consent/notice, storage location, access, retention, deletion and who handles messages. It must not be confused with Phase 2 Speak Up.
- Define success precisely: a durable acceptance acknowledgement is not proof the owner has read the message or that email has been delivered. A provider API acceptance is not delivery; never claim otherwise. If no durable acceptance is implemented, do not claim receipt merely because a request was attempted. Failures and retries must have a visible, truthful user outcome.
- A notification mechanism needs idempotency or deduplication, retry limits, failure monitoring and a staff recovery process. If webhooks are used, verify signatures and replay handling, store the minimum necessary delivery status and protect private payloads. Whether webhooks or an outbox are needed remains open.
- For login verification/recovery, evaluate whether Supabase Auth can use an appropriately configured Resend SMTP sender for this project. Verify actual support, sender-domain authentication, link/redirect safety, rate limits and delivery; do not assume Resend API and Auth are connected.
- No unsolicited marketing or newsletter subscription in Phase 1. Keep transactional mail and future marketing consent/operations separate. WhatsApp is an external link to the verified owner-approved number, not an automatic copy of the form submission.

## 6. Identity, permissions and trust boundaries

- **Proposed Phase 1 session:** staff authenticate on the admin host; public sites do not receive staff sessions by default. Prefer host-only, secure, HttpOnly cookies with an appropriate SameSite policy where compatible. Validate this approach with the actual Supabase/Next.js integration, including refresh and logout.
- **No assumed subdomain sharing:** determine cookie domain, CSRF protection, session expiry, redirect allowlists and logout semantics explicitly. If cross-domain preview is required, design an authenticated server-mediated flow without exposing tokens in URLs or relying on local storage without assessment.
- **Enforcement:** server-side role checks and explicit RLS on exposed tables; restrict public reads to published safe content. Distinguish authenticated users from authorised staff. Audit sensitive operations, avoid user-provided roles as authority and deny by default.
- **Server-only secrets:** never deliver Supabase service-role credentials, R2 secret keys, Resend keys, cron secrets or administrative data to browsers. Use least-privilege scoped credentials, independent environments, rotation and revocation. Privileged access must not bypass policy without explicit, audited justification.
- **Input and abuse:** validate/sanitise rich text, media, URLs and forms server-side; define upload size/type controls, secure headers, rate limiting and spam protection. Minimise information revealed by authentication and error messages.
- **Future sensitive submissions:** require a separate threat model, restricted access, retention and escalation policy before Phase 2; a general contact form is not a substitute.

The detailed role/action matrix, RLS rules, CSRF model, audit records, backup and threat-model tests are for Workstream 0.6 and later acceptance/security documents. No policy is considered implemented or tested by this proposal.

## 7. Deployment and environments

```text
GitHub repository / reviewed changes
            |
            v
      automated checks (future CI)
            |
       +----+----+
       v         v
  preview      production after approval
  (isolated)       |
                   +-- main app → epelawa.ng (proposed)
                   +-- news app → news.epelawa.ng (proposed)
                   +-- admin app → admin.epelawa.ng (proposed)
                            |
          environment-specific database/auth, R2 and Resend resources
```

- Recommend independent Vercel deployments for the three applications, each with clear monorepo build roots, controlled environment configuration and health checks; verify hosting support and cost. DNS ownership, records, TLS and domain association are not yet confirmed.
- Separate local, preview and production data, credentials and storage. Do not copy confidential production submissions, private assets or staff identities into preview. Protect previews appropriately, especially admin; test authentication and redirects on actual preview hostnames before release.
- Public apps may cache approved content. Never share cached admin/auth responses or private draft previews. Define revalidation, cache headers and withdrawal invalidation per route and host before implementation.
- Use GitHub review and automated lint/type/unit/integration/e2e/security checks once implementation begins; specific checks are determined in testing workstream. No CI or deployment exists by virtue of this document.
- Document release owner, migrations, deployment order, compatibility across independent versions, rollback and backup/restore before launch. Application rollback cannot automatically undo schema changes, public caches, outgoing email or object deletion; define safe roll-forward/recovery for each.
- Logs/alerts must cover authentication failures, publication/invalidation, storage, form delivery, email and radio health where verifiable. Avoid secrets, access tokens, full submissions and other unnecessary personal data in logs. Agree incident owner, retention and escalation.

### Environment configuration inventory (names illustrative, not configured)

| Configuration | Visibility / handling | Environments and owner decisions |
| --- | --- | --- |
| Public application origins and canonical domains | Non-secret configuration; validate redirects/allowlists. | Per environment; verify production domain ownership and preview origins. |
| Supabase project URL and public client key | Client-visible only as intended; RLS is essential. | Distinct projects/credentials as agreed; public key is not authorisation. |
| Supabase server-only privileged credential, if justified | Secret, server-only, restricted and rotated; avoid unnecessary use. | Environment-specific; approval and audit for privileged operations. |
| R2 account/endpoint, bucket names and scoped access credentials | Private bucket and credentials server-only; do not expose keys. Public delivery origin only when intended. | Separate public/private and environment boundaries; confirm backup and rights. |
| Resend API key or SMTP credentials, verified sender and recipient | Secrets and recipient handling server-side. | Separate environments/senders or safeguards to prevent real accidental emails; confirm delivery. |
| Radio stream URL and approved player configuration | Treat as approved configuration; do not invent. | Test protocol, browser support, rights, availability and live status. |
| WhatsApp contact destination | Public only after owner verification. | No invented number; test link and privacy messaging. |
| Cron/webhook secrets, if tasks are approved | Secret, independently authenticated, server-only. | Define signer, rotation, logs, retries and access per task; no assumed scheduled jobs. |

This is an inventory, not a working environment-variable contract; exact variable names and required/optional status will be specified after choices are approved. Never put real values or credentials in documentation, chat, source or logs.

## 8. Background work and reliability

- Phase 1 does not inherently require a general-purpose queue, scheduled publishing or video imports. Start with the smallest reliable design supported by approved workflows; add durable background work only where actual requirements justify it.
- If contact notifications or cache invalidation are asynchronous, define durable persistence, retries, deduplication, failure monitoring and reconciliation so submitted messages or withdrawal events are not silently lost. A process running only in transient server memory is not a reliable job system.
- If scheduled tasks are later approved, give each independent authentication and least privilege, logging, retry limits, alerting and ownership. Do not reuse secrets from unrelated applications.
- Back up and restore-test Postgres, authentication configuration and R2 assets according to agreed recovery objectives; confirm provider capabilities and retention. Decide how database metadata and object backups are reconciled. Do not claim backups, recovery objectives or failover are configured.
- Minimise third-party impact through lazy embeds, responsive images, network-aware design and caching validated for correctness. Set measurable performance and recovery objectives with the owner rather than inventing targets.

## 9. Validation plan and acceptance for architecture

Before architecture can be treated as implementation-ready, later Phase 0 work must document and review evidence for:

| Check | Evidence required / unresolved dependency |
| --- | --- |
| Scope and service ownership | Confirm domains, hosting/project ownership and operator access for Supabase, R2 and Resend without sharing credentials in chat. |
| R2 suitability | Verify bucket and credential separation, upload controls, private-object denial, public delivery, retention, removal, backup/restore and actual cost. No storage integration has been tested. |
| Resend suitability | Verify sender/domain authentication, intended API/SMTP integration, provider acceptance vs actual delivery, failure/retry process and rate limits. No email has been sent or tested here. |
| Authentication | Test session refresh/logout, cookies and CSRF, redirect allowlists, role revocation, admin protection and preview-domain handling. Cross-site session sharing is not assumed. |
| Content protection | Test authorised editorial transitions, draft/preview isolation, public published-only queries, storage permissions and withdrawal/cache invalidation, including failures and recovery. |
| Radio and external media | Obtain and test the official direct radio stream and embedding rights on target browsers/mobile; validate actual supported video/social embeds and failure paths. Stream is a launch prerequisite. |
| Contact | Agree WhatsApp destination, recipient, form data/consent/retention and delivery success semantics; test spam, failure and recovery without exposing sensitive content. |
| Operations | Review cost, environments, build settings, backups and restore exercise, monitoring, rollback, data retention and ownership. Define measurable targets and use a documented release checklist. |

## 10. Review and open decisions

**Approved architecture direction:** three-app monorepo, Supabase Postgres/Auth, R2 media storage, Resend transactional email and an admin-only session by default, with `frontend/`, `backend/` and `docs/` as the three top-level folders. Integrations, implementation details and actual provider configurations still require validation. Main alternatives and reasons are in section 3.

**Important outstanding inputs:** direct radio URL and permission; ownership/access for domains and relevant provider projects; approved WhatsApp number; contact recipient, fields and handling; editorial role split; expected traffic, budget and recovery requirements. Do not request or paste keys or passwords into chat.

**Approval record:** Owner approved Workstream 0.5 on 2 November 2026 and directed three top-level folders: `frontend/`, `backend/` and `docs/`, plus necessary root files. The child structure below is a proposed interpretation, not production scaffolding. Proceed to Workstream 0.6 database and security design, not production coding. Later integration, testing and roadmap workstreams must verify provider configurations.
