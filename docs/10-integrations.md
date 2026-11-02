# EPE LAWA — Integrations and Operational Requirements

**Document:** 10 — Workstream 0.7\
**Status:** Workstream 0.7 approved by the owner on 2 November 2026; provider documentation research is not an integration test or deployment.\
**Prepared:** 2 November 2026\
**Inputs:** [Requirements](01-product-requirements.md), [architecture](06-system-architecture.md), [database design](07-database-schema.md) and [security design](08-permissions-security.md).\
**Gate:** Workstream 0.7 is approved; proceed to Workstream 0.8 (development readiness, including API contracts, testing and roadmap). No production coding until all Phase 0 deliverables are reviewed and approved.

## 1. Evidence and scope

This workstream documents external dependencies, suggested validation and operational ownership for the approved Phase 1 baseline. The owner reports using **Resend and Cloudflare R2**, but no EPE LAWA provider account, configuration, stream, domain, deployment, email delivery, bucket or embed has been accessed or tested in this workstream. Public provider documentation was reviewed on 2 November 2026; provider capabilities can change. References do not establish permissions, pricing, current service status or EPE LAWA ownership.

The first release requires a working, authorised live radio stream, manually curated media, a general contact form and WhatsApp. Newsletters and automated video imports are not Phase 1 commitments. No secrets, project identifiers, real endpoints or addresses are invented here. Keep provider credentials out of source, documents and chat; confirm ownership and permissions through approved secure channels.

### Status legend

- **Owner-specified**: named by the owner; account/configuration not verified.
- **Proposed**: design or provider recommendation pending validation.
- **Blocked**: an essential input or validation is missing.
- **Not tested**: no project-specific end-to-end evidence has been collected.

## 2. Integration inventory

| Integration | Purpose / phase | Status and readiness | Main dependency / fallback |
| --- | --- | --- | --- |
| Official direct radio stream | Live listening, P1 **launch requirement**. | **Blocked:** direct URL, format, permission and playback unverified. | Obtain and test official stream; show honest offline/error state during outages, not a replacement for the launch gate. |
| YouTube | Owner-supplied channel and manually curated archive, P1. | Channel URL supplied; ownership, item rights and playback unverified. | Curated records, user-initiated permitted embed or external link; auto import deferred. |
| Facebook | Owner-supplied page, permitted embeds and external link, P1. | Page/post retrieval returned HTTP 403 during earlier review; ownership and embeds unverified. | Use supported public content only; graceful fallback to official link. No scraping. |
| Cloudflare R2 | Owner-specified asset storage, P1. | Account, bucket isolation, delivery, lifecycle and backups **not tested**. | Scoped credentials, private/public separation, rights, tested restore and cache/takedown process. |
| Resend | Owner-specified transactional email, P1. | Domain, sender, account, SMTP/API and delivery **not tested**. | Confirm verified sender and secure configuration; contact handling and recipient remain open. |
| Supabase | Proposed PostgreSQL, Auth, RLS, P1. | Project, role policies, environments, Auth sessions and backups **not tested**. | Verify ownership, access, roles, region, quota, restore and provider email integration. |
| Vercel | Proposed separate application hosting, P1. | Projects, builds, environment isolation, preview protection and cache invalidation **not tested**. | Confirm ownership, deployment strategy, plan limits and rollback/recovery. |
| Domains and DNS | Main, news and admin domains, P1. | Ownership, DNS, SSL and mail-domain configuration **unverified**. | Owner confirms access and authorises changes; no records changed here. |
| WhatsApp | General contact link, P1. | Owner requested; number and destination **not supplied or tested**. | Confirm approved public number, link behaviour, privacy wording and who responds. |
| Analytics | Privacy-conscious measurement, P1 if approved and later. | Provider, legal basis, retention and event definitions **undecided**. | Do not expose fake trending; omit ranking until trustworthy data and method exist. |
| Scheduled/background tasks | Optional future or narrowly justified P1 operations. | No jobs selected or configured. | Each approved job needs separate authentication, durable failure/retry handling and monitoring. |
| Newsletter | Subscriptions/campaigns, P5. | Deferred; no signup or campaign is in Phase 1. | Consent, confirmation, unsubscribe, provider and campaign operations require later approval. |

## 3. Radio and broadcasting

### Owner/rights-holder inputs

1. Official direct audio stream URL, protocol, format/codec, any required headers, access restrictions, ownership and permission to embed. A Facebook page or YouTube channel is not a direct stream.
2. Confirm Radio Lagos 107.5 FM Àmitítí station/programme relationship and approved naming; supply programme details, schedule, identity assets and contact for service incidents.
3. Confirm whether the broadcast is continuous or scheduled and how live status can be truthfully verified. Do not infer LIVE from a configured URL or player chrome.

### Validation plan — not yet run

- Obtain a testable HTTPS-compatible stream; assess mixed-content, CORS/origin requirements if relevant to the selected playback method, codec/format support and any provider authentication. Do not proxy a stream or bypass restrictions without explicit rights and security review.
- Test play, pause, volume where supported, idle/loading, buffering, unavailable, retry and error behaviour across agreed desktop and mobile browsers including affordable Android and constrained connections. Record device/browser, date, outcome and any limits.
- Confirm stream and programme status with an authorised source; test what happens outside broadcast hours, when a stream fails mid-playback and when status cannot be verified.
- Only declare radio launch-ready when the authorised stream and required controls actually work and rights are documented. If it fails **after** launch, show an honest state and recordings; escalate to an agreed operator. An offline fallback does not waive the owner's live-radio launch requirement.
- Define availability monitoring, ownership, incident escalation, schedules and cost with the broadcaster and operator. Do not fabricate schedules, streams, uptime or test results.

## 4. Media integrations

### 4.1 YouTube

- Owner-supplied channel: <https://www.youtube.com/@EPE_LAWA>. Earlier source review observed a page bearing the EPE LAWA name; the owner must confirm channel ownership, rights and approved videos/metadata. The earlier broadcast-reference metadata is not proof of stream availability.
- Phase 1 should use authorised manual curation of titles, permitted thumbnails, descriptions, dates and categories. Load playback only after user action or other approved lazy strategy, provide external links, and handle removed, private, restricted, geo-blocked or embedding-disabled videos gracefully.
- [YouTube's embedded-player documentation](https://developers.google.com/youtube/player_parameters) describes supported iframe/API options; this is general documentation, not proof that any particular video can be embedded. Validate supported parameters, keyboard behaviour, minimum player dimensions and privacy/security implications on target devices.
- Automatic imports, Data API credentials, quota use, update cadence and failure policies require a separate review and are not assumed for launch.

### 4.2 Facebook

- Owner-supplied page: <https://www.facebook.com/100092630340226>. The earlier page and reference post returned HTTP 403; contents, account ownership and reuse rights could not be verified.
- [Meta's embedded-post documentation](https://developers.facebook.com/documentation/plugins/embedded-posts) says embedded posts must be public and describes supported plugin settings. This does not establish that the supplied page or post is public, embeddable or accessible on all devices. Post and video embed methods must be reviewed separately before use.
- Use only permitted supported embeds; validate individual posts, performance, accessible fallback and deletion/restriction handling. Lazy-load where feasible and avoid unnecessary third-party scripts. If unavailable, link to the owner-confirmed official page; no unofficial scraping or unsupported endpoints.

## 5. Cloudflare R2 storage

Owner specified R2 for storage; the approved architecture recommends keeping relational metadata in Postgres and object bytes in R2 rather than introducing a duplicate storage system without justification.

### Documentation findings — not account verification

- [Cloudflare's R2 S3 compatibility reference](https://developers.cloudflare.com/r2/api/s3/api/) documents an S3-compatible API with explicitly listed unsupported or partial features. Do not assume every S3 operation, ACL or versioning capability is available in R2.
- [R2 public-bucket documentation](https://developers.cloudflare.com/r2/buckets/public-buckets/) says buckets are private by default until access is enabled; public exposure and its configured endpoints must be deliberately reviewed. It describes `r2.dev` as intended for non-production use. Do not assume public-bucket defaults or custom-domain settings in the owner's account.
- [R2 presigned URL documentation](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) describes operation-specific, expiring bearer URLs. Anyone holding such a URL can use its authorised operation until expiry; avoid logging or exposing it in public metadata/referrers. A signed URL is not an identity check after it is issued.

### Required design and checks

1. Confirm ownership, cost plan, region/location requirements, separate environments and authorised operators; provision nothing during Phase 0 without a separate authorised task.
2. Design and verify isolated private and explicitly public asset paths/buckets. Database RLS does not control access to R2 bytes. Never put a private draft, original or confidential file in a publicly exposed bucket.
3. Define server-side upload authorisation, file/content and size checks, permitted MIME types, rights and credits, inspection/scanning if needed, scoped credentials, secure CORS and safe image processing. Exact limits remain open.
4. Test anonymous denial of private objects, editor access, approved promotion to public, expiry and restrictions of signed access, deletion and cache purge. Understand that already-public copies cannot be guaranteed recalled.
5. Confirm the actual backup and recovery method, object lifecycle, retention, object/metadata reconciliation, CDN behaviour and custom-domain DNS ownership. Restore test both R2 and Postgres separately; never assume one backs up the other.
6. Document failure states: upload rejection, upload timeout, missing object, unavailable public delivery and credential revocation. Avoid large video-file storage unless a suitable workload and rights are separately approved.

**Acceptance evidence:** approved bucket/access design and least-privilege credentials verified in an isolated test; private denial and authorised/public flows pass; object lifecycle and restore procedure demonstrably work. No such evidence exists yet.

## 6. Resend and email

### Provider documentation — not configuration evidence

- [Resend's Supabase SMTP guide](https://resend.com/docs/send-with-supabase-smtp) describes using Resend as a custom SMTP provider and lists a verified domain as a prerequisite. [Supabase's custom SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp) says the default Auth SMTP service is intended for non-production use and is restricted; validate current limits and integration settings for the actual project. Documentation does not mean EPE LAWA has a verified sender or configured SMTP.
- [Resend webhook documentation](https://resend.com/docs/webhooks/introduction) describes delivery events and request verification. Use a webhook only if approved and operationally needed; verify authenticity, replay/deduplication and retention. Provider acceptance, delivery, human receipt and response are distinct states.

### Transactional workflow

- **Staff Auth:** evaluate Supabase Auth using the owner's Resend SMTP configuration for supported verification, invite and recovery flows. Confirm sender domain, DNS authentication, recipient restrictions, rate limits, approved redirect allowlists, safe templates and actual delivery in a test environment.
- **General contact:** decide approved form fields, recipient, storage, consent/notice, retention, spam controls and handling. If a durable submission followed by a Resend notification is approved, acknowledge only the agreed durable-acceptance condition; an accepted email API request is not delivery. Monitor failures and provide an operator recovery/retry procedure with deduplication.
- **Security:** keep Resend API/SMTP credentials server-only, scoped and environment-specific. Avoid real customer emails in testing and avoid full messages, addresses or secrets in logs. Validate sender domain/DNS, SPF/DKIM/DMARC as applicable and ensure tests do not mail real recipients accidentally.
- **Newsletter:** deferred to Phase 5, with a separate marketing consent and delivery design. Do not infer permission for marketing email from a contact form or staff account.

**Acceptance evidence:** staff recovery delivery and contact workflow tested end to end in isolated environments, failures reflected honestly and operational recovery demonstrated. No email has been sent or tested here.

## 7. Supabase, Vercel, domains and environments

### Supabase

- Confirm the owner's project/organisation access, region and billing; decide separate local/preview/production resources. Do not copy production contact messages or private editorial material into preview.
- Validate the approved design's identity/session flows, staff role assignments, server checks, RLS/grants and public projections with anonymous, authorised and unauthorised identities. See [07](07-database-schema.md) and [08](08-permissions-security.md).
- Verify migration access, secure server credentials, quotas, backup/restore, Auth configuration recovery, monitoring and incident ownership. Service-role keys stay server-only; provider access alone does not approve configuration changes.

### Vercel

- Confirm three independently deployable app projects, build roots under `frontend/apps/`, workspace dependencies, environment variables and domain assignments. Application handlers may run server-side within those apps; `backend/` holds shared backend/infrastructure as documented in [06](06-system-architecture.md).
- Protect private previews and isolate preview credentials/data. Verify actual hostnames, redirect allowlists, cookies and origin handling. Test public content caching and withdrawal/invalidation across main and news apps; never cache private previews publicly.
- Define health monitoring, error alerting, deployment approval, rollback and schema compatibility. Application rollback does not reverse database migrations, R2 objects, sent mail or caches.

### Domains, DNS and SSL

- Proposed domains `epelawa.ng`, `news.epelawa.ng`, `admin.epelawa.ng` are not verified as owned or configured. Confirm registrar, DNS zone control, domain owner, administrative access and who can approve changes.
- Plan production DNS records, Vercel SSL/certificate validation, any R2 media hostname, Resend sender-domain DNS and redirect policies after ownership is verified. Test exact hostnames, HTTPS, renewal and rollback; do not create or modify records during discovery.
- Avoid assuming Auth cookies or sessions automatically cross subdomains. Confirm host-only admin cookies and any alternative cross-host flow through security tests.

## 8. Analytics, monitoring and scheduled work

### Analytics and privacy

Potential events include published article views, search usage, radio playback attempts, video interactions and contact interactions. Agree purpose, provider, permitted data, legal basis, consent where applicable, retention, access, aggregation, user notice and reporting owner before implementation. Avoid sensitive form content, identifiers in URLs and unnecessary tracking. Define trending eligibility and method from real engagement data; omit trending when evidence is missing. Newsletter analytics are a later-phase concern. Do not set arbitrary success targets.

### Monitoring and operational ownership

Owner and developer are identified as responsible; who owns each operational task, alerts and escalation remains to be decided. Proposed checks: site/domain availability, Auth and permission failures, publishing/revalidation failures, confirmed radio health where verifiable, R2 upload/delivery errors, contact acceptance/notification failures, Resend bounces, quotas and backup restore results. Avoid alerting based on unverified status. Logs should exclude secrets, signed URLs and full contact messages.

### Background jobs and retries

No scheduled jobs are selected for Phase 1 merely because a provider supports them. If approved for notification retries, cache reconciliation, maintenance or later imports/scheduling, define a durable work record, idempotency, timeout, retry/backoff, dead-letter/manual recovery, alerting, individual authentication and ownership. Avoid dependence on unrelated project secrets.

[Vercel's cron management documentation](https://vercel.com/docs/cron-jobs/manage-cron-jobs) describes a `CRON_SECRET` mechanism and states failed invocations are not automatically retried. Do not treat a configured cron invocation alone as reliable delivery; validate actual plan limits and design retry/reconciliation separately. This is provider documentation, not evidence that a cron exists.

## 9. Owner handoff and verification record template

### Needed inputs — no passwords or API keys in chat

1. **Radio:** official direct stream, format, permission to embed, station relationship and schedule; identify a broadcaster/operator for incidents. This is a launch blocker.
2. **Contact:** approved WhatsApp number, form recipient and who handles it; agree fields, notice, retention and how failed notifications are recovered.
3. **Ownership and access:** identify accountable owners and approved access for domains/DNS, Supabase, Vercel, R2 and Resend. Confirm sender domain and approved public social accounts using secure administrative processes, not shared secrets in documentation.
4. **Content and operations:** licensed assets, approved programme/video records, editor and technical ownership split, cost constraints, provider plans, legal reviewer and recovery expectations.

### Record for each future integration test

| Field | What to record |
| --- | --- |
| Integration / environment | Service, isolated environment, component and version under test; no credentials. |
| Date / tester | Date and accountable operator; record approved access, not secrets. |
| Preconditions | Rights, configuration, test fixtures and relevant device/browser/provider setup. |
| Scenarios / expected result | Positive, negative, failure, privacy/security and recovery cases. |
| Actual result / evidence | Pass/fail/blocked with a safe evidence link or redacted logs; distinguish provider acceptance from verified outcome. |
| Limitations and owner | Unresolved risks, follow-up, responsible person and re-test date if agreed. |

## 10. Reference register

Public documentation reviewed 2 November 2026. These references support the general statements above; they are not evidence of EPE LAWA's operational configuration.

1. [Cloudflare R2 S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/).
2. [Cloudflare R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/).
3. [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).
4. [Resend — Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp).
5. [Supabase — custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
6. [Resend — webhooks](https://resend.com/docs/webhooks/introduction).
7. [YouTube embedded-player documentation](https://developers.google.com/youtube/player_parameters).
8. [Meta embedded-post documentation](https://developers.facebook.com/documentation/plugins/embedded-posts).
9. [Vercel cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
10. Project-specific reference review and access limitations: [product requirements §11](01-product-requirements.md#11-source-review-and-evidence-limits).

**Approval record:** Owner approved Workstream 0.7 on 2 November 2026. Provider configurations, integrations and launch dependencies remain unverified; proceed to Workstream 0.8 development readiness. Do not begin Phase 1 until the complete Phase 0 exit condition is approved.
