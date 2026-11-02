# EPE LAWA — Proposed API Contracts

**Document:** 09 — Workstream 0.8\
**Status:** Draft for owner review; illustrative contracts are not implemented or deployed.\
**Prepared:** 2 November 2026\
**Inputs:** [Product requirements](01-product-requirements.md), [system architecture](06-system-architecture.md), [database schema](07-database-schema.md), [security](08-permissions-security.md), [integrations](10-integrations.md).\
**Gate:** Review Workstream 0.8 documents 09, 11 and 12 together. Full Phase 0 approval and resolution of launch/security decisions are required before production development.

## 1. Purpose and scope

Define candidate Phase 1 service contracts and failure semantics to guide later implementation and tests. No endpoint, provider connection, API key or backend service exists merely because it is described here. Paths and schemas below are proposals; actual handler location (Next.js application server, shared backend operation or controlled database function) must be decided with the final security model. An independent API server is not required.

Public operations expose only approved published information. Private operations require an active staff session and explicit role/capability checks as described in [08](08-permissions-security.md). API design does not override unresolved editorial permissions, contact policy or owner approval of later phases. Speak Up, public accounts/forum, governance tracker, directories and newsletter APIs are not Phase 1 contracts.

## 2. Conventions

- **Candidate paths:** `/api/v1/...` on the application responsible for the operation; the host/application is identified in each table. These are API endpoints, not the public page routes approved in [03](03-sitemap.md). Public pages may use server-side access instead of a public HTTP API where it preserves the same protections.
- **Transport:** HTTPS; JSON request/response unless upload or provider webhook requires a documented alternative. Times use ISO 8601 UTC; IDs are opaque and validated, slugs normalised. Payloads are schemas, not real users or fabricated content.
- **Authentication:** Public reads are anonymous; staff requests use a verified server-side session and current staff capabilities. Cookies, CSRF, origin and redirect controls follow the final security design; never accept a role or user ID from client data as authority.
- **Request validation:** Reject unrecognised, missing or invalid fields, overlong bodies and unsupported media before processing. Actual limits and rate policies are open and must be documented/tested before implementation.
- **Idempotency and concurrency:** State-changing publication/transition operations require current version/revision checks; return a conflict for stale or ineligible transitions. Idempotency for retries (especially contact and notifications) needs a documented key scope, retention and duplicate behaviour before implementation.
- **No credentials in URLs or logs:** Private preview requires staff session and authorisation. R2 presigned object URLs, if selected, are time-limited bearer credentials and must be protected from logs, referrers and public pages; they are not identity proof.
- **Caching:** Public reads may cache only approved published representations. Private, contact, auth, draft, audit and preview responses must not enter shared/public caches. Publish/update/unpublish requires cross-application revalidation and a tested failure/reconciliation strategy; cached previously public assets cannot be recalled from third-party copies.

### Response and error conventions

Proposed envelope: successful object/list responses contain `data` and optional `meta`; error responses contain `error.code`, a safe `error.message`, optional field-level `error.fields`, and a non-sensitive `request_id` where available. Never return stack traces, internal review notes, keys or another user's information. Exact fields and localisation remain review items.

| Status | Meaning |
| --- | --- |
| `200` | Successful read or completed state change where appropriate. |
| `201` | A resource was created; do not claim a contact message was delivered simply from creation. |
| `202` | Accepted for further processing only after the agreed durable-acceptance condition; not provider delivery or human receipt. |
| `204` | Completed action with no response body, if contract explicitly permits it. |
| `400` / `422` | Invalid format or input; choose consistent distinction in implementation. |
| `401` | Missing or invalid authentication without sensitive account details. |
| `403` | Authenticated but not authorised; use a non-disclosing `404` where resource existence itself is sensitive. |
| `404` | Missing or unavailable resource, including private/unpublished public content. |
| `409` | Slug collision, state transition or concurrency conflict; no silent overwrites. |
| `429` | Rate limited, with safe retry guidance when possible. |
| `5xx` | Service or dependency failure; safe message and traceable request ID; do not imply success. |

Pagination: proposed cursor or page-based scheme must use a deterministic ordering and stable tie-breaker; return only actual results and `next_cursor` or equivalent when there are more. Search text, pagination limits and retention of analytics are subject to privacy review. No arbitrary numeric limits are approved here.

## 3. Public read contracts — candidate

| Host / method / path | Request | Successful response / boundary |
| --- | --- | --- |
| News `GET /api/v1/articles` | Optional category slug, author slug, tag slug, cursor and page size within agreed limits. | Published article summaries and pagination metadata only. No drafts, unpublished counts or internal notes. |
| News `GET /api/v1/articles/{slug}` | Valid public slug. | Current approved published article snapshot, public author/category/tags, media credits, dates, public corrections and metadata. Unavailable/private/unpublished → safe `404` or approved withdrawal response. |
| News `GET /api/v1/search` | Valid search query and optional pagination. | Published-only matching summaries; empty results are real, not sample content. |
| News `GET /api/v1/categories`, `/authors/{slug}`, `/tags/{slug}` | Valid identifiers; pagination where needed. | Allowlisted public records and associated published articles. Private staff details and draft-only information are excluded. |
| News `GET /api/v1/trending` | Pagination or period only after methodology approval. | **Conditional:** real, privacy-reviewed engagement ranking; if unavailable, no active feature or fabricated list. |
| Main `GET /api/v1/media`, `/programmes`, `/episodes/{slug}` | Approved category/filter and pagination where applicable. | Only published media/programme/episode records and safe public links; external playback availability remains independent. |
| Main `GET /api/v1/radio` | None. | Approved public programme/player information and a truthful status **only if independently verifiable**. No private credentials or invented stream. Player integration mechanism is pending. |
| Main `GET /api/v1/site-settings` | None. | Explicit public allowlist only; never expose arbitrary `site_settings`, staff settings or secrets. |

**Public data shape:** Article summaries include stable slug, headline, approved summary?, public author/category, publication date and an approved public image/credit when available. Full articles add the approved body, available updated date, tags, captions, permitted media, public correction information and canonical/SEO metadata. `?` indicates optional data only where actually present. Private version IDs, review comments, workflow data, raw storage keys and unpublished metadata are excluded.

Public related-article discovery may be included in the article response or a separate approved read operation, but must return published content only. Breaking banners need actual editorial designation; trending requires real data and an agreed method. Do not generate synthetic results or counts.

## 4. Contact and WhatsApp

| Host / method / path | Request / proposed operation | Success and failure |
| --- | --- | --- |
| Main `POST /api/v1/contact` | Approved fields, privacy acknowledgement if required, server-side validation and spam/rate controls. Field names and required/optional status are **not decided**. | Return acknowledgement only for the explicitly agreed acceptance condition; `202` if durably accepted for later processing is the approved model. Do not claim email delivered or response guaranteed. Return safe validation/rate/failure states and a retry path. |
| WhatsApp external link | Public, owner-approved WhatsApp destination. | Browser leaves site for the external service. Not a platform API; no implicit form forwarding or confidential reporting promise. |

Contact storage, recipient, retention, privacy notice, email provider path, deduplication and recovery are unresolved. If durable acceptance is adopted, use a transactionally reliable handoff to a notification workflow and test duplicate requests, service outages and retries. Never return or expose another person's message or notification record. Do not introduce public submission lookup, anonymous-report claims or Speak Up reference numbers.

## 5. Private editorial and admin contracts — candidate

The table names **capabilities**, not final roles. Actual role mapping, reviewer independence and approval of revisions remain unresolved. All resources and operations require verified staff identity, current permission and state checks; audit sensitive actions.

### 5.1 Articles and workflow

| Host / method / path | Capability / input | Result and safeguards |
| --- | --- | --- |
| Admin `GET /api/v1/articles` | View permitted work; optional approved status/filter/pagination. | Private list scoped by role/ownership; no-store and no public cache. |
| Admin `POST /api/v1/articles` | Create draft with agreed editorial fields. | `201` private article/draft reference and revision; reject invalid or unauthorised data. |
| Admin `GET /api/v1/articles/{id}` | Read authorised private draft and permitted history. | Private data only for authorised staff; omit private review notes if the role cannot access them. |
| Admin `PATCH /api/v1/articles/{id}/draft` | Edit draft using expected revision and validated fields. | New revision or conflict; public published snapshot is unchanged. Do not mutate an approved snapshot in place. |
| Admin `GET /api/v1/articles/{id}/preview` | Authenticated private preview of an authorised version. | Session-protected, no shared cache, noindex; no publicly shareable bearer token. Mechanism and access lifetime still require design. |
| Admin `POST /api/v1/articles/{id}/submit` | Submit a specified current draft version for review. | Transactionally record transition/actor; reject stale or invalid version. |
| Admin `POST /api/v1/articles/{id}/review` | Record authorised review decision for a specified version; optional private notes. | Review or revision request, audited; separation-of-duties policy pending. |
| Admin `POST /api/v1/articles/{id}/approve` | Approve a specified eligible version. | Only an authorised approver can do so; default proposal is separate author/approver pending owner decision. |
| Admin `POST /api/v1/articles/{id}/publish` | Publish a specified approved version with expected revision. | Atomically set published reference and audit; trigger/reconcile main/news/search/cache invalidation. `200` means DB transition succeeded, not that every cache has refreshed. |
| Admin `POST /api/v1/articles/{id}/unpublish` or `/archive` | Authorised transition and current revision. | Remove from public projection, audit and initiate verified invalidation; specify withdrawal status and failure recovery. |
| Admin `GET /api/v1/articles/{id}/versions` | Authorised history access. | Private snapshots and review history only to permitted staff, with no public cache. |

**State invariant:** A public article points only to an approved version of the same article. A currently published article may have a separate private edit in progress. Corrections create a new version and follow the ultimately approved review/reapproval policy; do not silently expose edited content before approval. Publication and withdrawal cannot rely solely on hiding controls or a public cache TTL.

### 5.2 Editorial metadata, media and configuration

| Host / contract family | Capabilities and constraints |
| --- | --- |
| Admin `/api/v1/categories`, `/tags`, `/authors` | Authorised list/create/update/archive as permitted; unique slug conflicts return `409`. Define handling of references and public snapshots before deletion or renaming. |
| Admin `/api/v1/media`, `/videos`, `/programmes`, `/episodes` | Authorised list/create/edit/feature and approve/publish operations per final matrix. Validate provider URLs, rights, credits and status. Public exposure requires explicit approval. |
| Admin `POST /api/v1/uploads/initiate`, `POST /api/v1/uploads/{id}/complete` | Candidate two-step authorised upload. Initial request declares permitted metadata; response may use a server-controlled upload or a narrowly scoped short-lived R2 URL. Completion must independently verify actual object size/content, ownership, classification and approved inspection before media is made public. Exact limits and scanning policy remain open. Reject unauthorised or invalid uploads; revoke/clean up failed or abandoned objects. |
| Admin `/api/v1/radio`, `/settings` | Restricted read/update of explicit allowed settings; audit changes. Do not expose secrets or claim a configured stream is live. |
| Admin `/api/v1/staff`, `/roles` | Explicitly authorised staff/permission management only; verify identity and prevent self-escalation. Activation, revocation, expiry and audit details require security review. |
| Admin `GET /api/v1/audit-events` | Restricted audit read, filtered/paginated as permitted; no passwords, keys, signed URLs or full contact messages in records. Retention and visibility pending. |
| Admin `/api/v1/contact-submissions` | **Conditional on approved durable storage:** restricted handling only; no public read/list. Role scope and lifecycle pending privacy decision. |

Specific HTTP methods, request fields, public object promotion and deletion semantics for these families must be finalised in implementation-ready contracts after owner decisions. This table is not permission to create generic CRUD endpoints that bypass review, RLS or audit.

## 6. Provider callbacks and background work

- **Resend:** Optional webhook endpoint only if a delivery-event workflow is approved. Verify provider signatures against raw request data per current documentation, reject unauthenticated/replayed or invalid events, deduplicate retries, store minimum metadata and return an accurate processing response. Provider acceptance and delivery remain different states.
- **Auth:** Supabase Auth owns its supported login/recovery protocols; client and server integration, session refresh, logout, redirect allowlists and callback leakage protection must be specified and tested rather than inventing a custom authentication API.
- **R2:** Credentials and signing are server-only; a signed URL, if used, is time-limited and scoped to an operation/object. Database policies do not protect a public bucket. API must not return R2 secrets or private keys.
- **Jobs / revalidation:** Candidate authenticated internal operations only when justified. Require independent secret/identity, durable event persistence, idempotency, retries, logs without sensitive payloads and failure reconciliation. Vercel cron failures are not automatically retried per [10](10-integrations.md); do not rely on a single invocation.

## 7. Contract acceptance and open decisions

Before implementation, specify exact payload schemas, field constraints, error codes, role/resource rules, pagination, rate and idempotency policies, article version concurrency, upload inspection, safe preview access, cache invalidation, webhook handling and contract ownership. Validate them against docs 07/08 and user decisions. Contract tests must cover positive and negative cases, including direct anonymous attempts against drafts, stale transitions, forbidden roles, private R2 access, contact failure and invalid callbacks. Later phases require separate contracts.

**Approval record:** Pending owner review of Workstream 0.8. No API is implemented, deployed or tested by this document.
