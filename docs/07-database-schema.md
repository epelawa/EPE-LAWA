# EPE LAWA — Proposed Database Schema

**Document:** 07 — Workstream 0.6 (database design)\
**Status:** Workstream 0.6 approved by the owner on 2 November 2026; the proposed schema remains under review. One staff-access migration exists locally but is not applied; no production tables or seed data have been created.\
**Prepared:** 2 November 2026\
**Inputs:** [Approved requirements](01-product-requirements.md), [approved journeys](02-user-journeys.md), [approved sitemap](03-sitemap.md) and [approved architecture direction](06-system-architecture.md).\
**Companion:** [Permissions and security](08-permissions-security.md). Documents 07 and 08 were approved as Workstream 0.6; proceed to Workstream 0.7. Phase 0 approval is required before production coding.

## 1. Scope and principles

Proposed system of record: Supabase PostgreSQL with Supabase Auth for staff identities; Cloudflare R2 stores asset bytes, not database rows. Resend is the owner-specified transactional email service. A Supabase project is visible, but its Paris region differs from the selected Ireland region; target confirmation, credentials, configuration, permissions and integrations remain unverified. No project migrations have been applied.

This document models **Phase 1 only**. Later-phase domains are identified as extensions, not tables to create now. The owner directed top-level `frontend/`, `backend/` and `docs/` folders; future reviewed migrations belong under proposed `backend/supabase/migrations/`, subject to toolchain validation. No application scaffolding is created during this workstream.

Core principles:

- Database-generated primary keys, explicit foreign keys, constraints, server-side validation, UTC timestamps and auditable updates. UUIDs are proposed identifiers; exposed slugs are not authorisation.
- Normalise reusable editorial metadata without creating speculative future-phase tables. Public reads use approved published snapshots; private authoring and operational data are isolated.
- Apply least privilege, RLS to exposed tables and explicit policy/grant tests. RLS is not a substitute for protected state transitions, secret management, API access controls or storage permissions.
- Protect personal data, form submissions and audits with restricted access, retention/deletion rules and tested backup/restore procedures. No private contact message is automatically public.
- Migrations are the schema source of truth after implementation is authorised. Do not create data-seeding scripts or preload demo records; legitimate staff and real approved content are provisioned through authorised operations. No production schema changes are authorised now.

## 2. Phase 1 entity relationship overview

```text
Supabase Auth user ──1:0..1── staff_profiles ──1:N── staff_role_assignments
                                       │                         │
                                       │                         N:1
                                       │                    roles / permissions (model TBD)
                                       │
                                       ├── authors (optional link)
                                       ├── articles (owner/editor)
                                       ├── editorial_reviews
                                       └── audit_events

authors ──1:N── articles ──1:N── article_versions ──1:N── editorial_reviews
                   │                  │
                   │                  └── version metadata / content snapshot
                   ├── N:1 category
                   └── N:M tags via version-level mapping (candidate; see §4)

articles ──optional published-version pointer──> article_versions
media_assets ──1:N── asset_objects (private/public representations)
programmes ──1:N── episodes ──optional──> media_assets / external video records
radio_settings ──optional──> programme information
site_settings       audit_events
contact_submissions ──1:N── contact_notification_attempts  [conditional design]
```

This is a logical overview. The exact ownership of category/tag/author/media metadata by each article version is an open design decision; published metadata **must** remain tied to the approved version and must not silently change when a draft is edited. Relationships and public projections must enforce that outcome even if the table layout differs from this sketch.

## 3. Naming, common fields and lifecycle

- Proposed table names below are design labels, not existing database objects. Each entity has a primary key (`id`) and appropriate foreign keys. An auth ID is a UUID matching the provider identity, not an editable email address.
- Typical fields: `created_at`, `updated_at` (UTC), `created_by`/`updated_by` where appropriate, and an explicit status only where relevant. Publication fields, version/ownership fields and approval timestamps must be written by authorised operations, not blindly trusted from clients.
- Use validation and constraints for allowed states, lengths, uniqueness and referential integrity. Exact limits, status representations and database-generated defaults require implementation review.
- Soft deletion is not automatic: preserve editorial and audit history where required; design retention, takedown and personal-data deletion separately. Use restrictive foreign keys for content/history where deletion would break traceability; a reviewed deletion procedure must not accidentally publish or orphan sensitive data.
- Proposed unique slugs must be normalised, collision-checked and reserved as appropriate. Define redirects and reuse of deleted/archived slugs in page/API work; do not silently route a formerly private slug to other content.

## 4. Identity and editorial entities

Field lists identify required design concerns, not a complete migration. `?` means nullable or conditional, not a promise that all constraints are final.

| Entity | Key fields and relationships | Constraints, access and rationale |
| --- | --- | --- |
| `staff_profiles` | `user_id` PK/FK to Auth identity; display name, account status, created/updated timestamps. | Staff-only; do not expose private email or account status via public author pages. An Auth account alone grants no staff permissions. Define status/revocation synchronisation. |
| `roles` | `id`, unique role key, description. | Candidate role catalog in doc 08; only approved Phase 1 roles enabled. Avoid trusting client-editable metadata. |
| `staff_role_assignments` | `user_id` FK, `role_id` FK, assigned by/at, revoked at?. | Unique active assignment per user/role; tightly restricted writes, expiry and audit. Role derivation and permission lookup must be tamper-resistant. |
| `authors` | `id`, optional `staff_user_id`, public display name, unique slug, approved bio/photo?, status. | Public projection contains only approved author information linked to published content; authors need not be login accounts. Staff linkage is private. |
| `categories` | `id`, unique slug, label, status, ordering? | Authorised editable categories. Conflict/replacement rules needed; do not confuse Events news category with an event calendar. |
| `tags` | `id`, unique slug and label, status. | Authorised management; no private/draft-only taxonomy exposed through public projections. |
| `articles` | `id`, unique public slug, internal owner, current draft/workflow reference?, published version pointer?, created/updated timestamps. | Canonical identity; public only through a published projection. FK/pointer must reference an approved version belonging to this article. A draft edit must not overwrite a public snapshot. |
| `article_versions` | `id`, `article_id` FK, version number, immutable content snapshot: headline, summary, body, category, tags, author, media/credits and SEO fields; created by/at, review status. | Unique `(article_id, version number)`; approved snapshots and prior history are retained. Enforce that published content has an approved version; metadata including tags/media must be snapshotted or linked to immutable version records. Published or reviewed snapshots cannot be silently mutated. |
| `editorial_reviews` | `id`, `article_id` and version FK, reviewer FK, decision, internal notes?, created at. | Private; review refers to a specific version and records decisions. Review/approval separation and reapproval rules remain owner decisions. |
| `article_version_tags` (candidate) | version FK, tag FK, optional label/slug snapshot. | Unique `(version_id, tag_id)`; retain public metadata consistency even if tag names change. Alternative snapshot representation acceptable only if it preserves approved version history. |

**Published content invariant:** A public article representation must derive from an approved, currently published version of that same article, not merely from a mutable article record or `status = published`. Publish, unpublish, archive and approved-update operations must atomically update state/pointers and record actions under appropriate authorisation. Drafting or editing after publication does not alter the public version until the new version passes the approved workflow. Optimistic concurrency/version checks or equivalent prevent overwriting concurrent edits; exact error/retry behaviour is for API design.

**Editorial model clarification:** The brief's `Draft → In Review → Approved → Published → Updated / Archived` is a business overview. Track draft/review/approval on a version and publication on the article or equivalent, allowing a public approved version and a private pending update to coexist. Return-for-revision, who may approve their own work, reapproval for corrections, unpublish and archive rules require owner approval before implementation.

## 5. Media and platform entities

| Entity | Key fields and relationships | Constraints, access and rationale |
| --- | --- | --- |
| `media_assets` | `id`, kind, title/description, rights/credit, owner, publication status, created/updated timestamps. | Separate editorial metadata from object bytes. Publish only authorised media; public projection excludes private source keys and internal notes. |
| `asset_objects` | `id`, `asset_id` FK, representation kind, R2 bucket identifier/key (private metadata), content type, byte size, checksum?, access classification. | Unique object location as appropriate. Store private originals/derivatives separately from explicitly public approved variants. R2 access is enforced separately from PostgreSQL. Signed URLs are short-lived bearer credentials, not public metadata. |
| `video_records` | `id`, approved provider URL or provider identifier, title, description, thumbnail reference?, date?, category?, status. | Manual curation; accept only supported provider URLs after validation and rights review. Embed availability is not guaranteed. A video may reference an authorised media asset. |
| `programmes` | `id`, name, slug, description, publication status, approved schedule information?. | Do not invent programme content or schedule. Detailed programme routing is unresolved. |
| `episodes` | `id`, `programme_id` FK?, slug, title, description, published date?, media/video references, status. | Published records only through public projections; nullable relationships depend on approved content model. |
| `radio_settings` | Stable settings identifier, stream reference/configuration, status-related configuration?, programme metadata references. | Private admin writes. Exact stream URL visibility and status-verification implementation are undecided. A configured URL alone never proves LIVE. Official direct stream and permission are launch prerequisites. |
| `site_settings` | Explicit allowlisted setting name and typed/value payload, scope, updated by/at. | Do not use as an unrestricted secret store or public JSON dump. Classify each field public or private and expose only approved public settings. |
| `audit_events` | `id`, actor identity/service, action, resource type/id, time, outcome, restricted metadata. | Append-only for normal application roles; no secrets, tokens, full contact messages or unnecessary personal data. Define privileged maintenance and retention with owner/legal review. |

## 6. General contact — conditional proposed model

The owner approved a general contact form plus WhatsApp. Durable database storage before Resend notification is an **architecture option**, not yet an approved retention or implementation decision. If approved, candidate entities are:

| Entity | Candidate fields | Controls and unresolved questions |
| --- | --- | --- |
| `contact_submissions` | `id`, submitted time, minimum approved contact fields and message, handling state. | Public users may submit only through a validated, abuse-controlled server operation; no public list/read. Recipient, notice, retention, deletion, access and required fields remain undecided. Not Speak Up and no anonymous/confidential promise. |
| `contact_notification_attempts` | `id`, submission FK, status, provider message reference?, attempts, timestamps, last error category?. | Restricted operational record; no mail keys or message contents in logs. Retrying requires deduplication/idempotency and a failure/reconciliation process. Provider acceptance is not confirmed delivery. |

If the owner chooses an alternative delivery/storage model, update this design and security/retention implications before building. Do not model WhatsApp conversations as collected records; the link is external and the destination must be verified. No newsletter data is included in Phase 1.

## 7. Public access and RLS design intent

- Default deny for private tables, internal authoring versions, role assignments, reviews, audit and contact data. Only explicitly exposed, published-safe content may be available to anonymous users.
- Prefer narrowly defined public projections/views or controlled server endpoints exposing an allowlist of fields from the current approved published version. Underlying table grants, view owner/security mode, RLS and API exposure must be tested together; a view alone is **not** proof of RLS enforcement.
- Staff access depends on authenticated identity **and** a current trusted role assignment. Limit action and row scope; draft ownership alone does not grant review, publication or administrative rights. Use controlled operations for transitions and immutable snapshots rather than generic table writes.
- RLS must cover both read and write (`USING` and `WITH CHECK` where applicable), direct API and any storage-related metadata. Avoid recursive or user-writable role lookups; securely designed policy helpers require review, a fixed search path and minimal privileges if definer rights are used.
- Do not expose service-role credentials. Administrative or maintenance paths that bypass RLS must be narrowly scoped, validated, auditable and tested. Public object access in R2 cannot be protected by database RLS; object policy and publication controls must independently enforce access.
- Full policy matrix and negative cases are in [08-permissions-security.md](08-permissions-security.md). Final SQL, grants, exposed schemas and exact functions remain future migration work.

## 8. Indexing, integrity, lifecycle and operations

| Concern | Proposed approach; validate against actual query plans and policy |
| --- | --- |
| Slugs and identity | Unique indexes for canonical article and author slugs, category/tag slugs and relevant programme/episode slugs. Define normalisation, case handling and collision rules. |
| Published discovery | Index publication state/date and category/author associations of the **published projection/version**; support pagination with a stable tie-breaker. Published-only indexes must not return drafts. |
| Search | Select a PostgreSQL full-text search or equivalent after evaluating language, diacritics, relevance and load. Index only published-safe content; empty and permission-denied behaviour must be tested. |
| Workflow queues | Index draft/review state and updated time where justified; use version/article foreign-key indexes and uniqueness constraints. |
| Media and audit | Index approved media status/date, asset relationships and audit actor/resource/time according to actual access patterns; avoid exposing audit search publicly. |
| Contact | If durable storage is approved, index handling state/time and notification status for authorised operators; do not make sensitive fields unnecessarily searchable. |
| Concurrency and integrity | Use transactions for state/pointer changes and audit events where possible; avoid stale approval and lost updates with version checks. Validate DB constraints and cross-entity ownership. |
| Backup and restore | Agree recovery objectives and retention; test Postgres restore, Auth configuration recovery and R2 object restoration/reconciliation separately. A database backup alone does not back up R2. No backups are assumed configured. |
| Caching and withdrawal | Define invalidation/reconciliation for all published projections and CDN/object caches, especially unpublication/corrections. No promise of immediate object revocation once publicly distributed. |
| Migration | Reviewed, reversible where feasible, staged compatibility across separately deployed apps. Rollback of deployed app code does not automatically reverse a data migration. |

## 9. Later-phase domains — conceptual only

| Phase | Potential future domains, not Phase 1 tables | Gate |
| --- | --- | --- |
| 2 | Speak Up reports and moderation actions; accounts/discussions/comments/reports; events. | Separate sensitive-data access model, consent, retention, abuse response and staffing. |
| 3 | Public people, development projects, updates and source evidence. | Review and traceable evidence/verification. |
| 4 | Communities, heritage stories, places, businesses and media. | Local historical review, cultural distinction, attribution, approved listings. |
| 5 | Newsletter subscribers/campaigns/consent and advanced media discovery. | Confirmed subscription, unsubscribe, campaign controls, retention and approved operations. |

No future entities should be created simply because this table exists. Mobile apps, payments and marketplace operations are not current website scope.

## 10. Verification and approval

Prior to implementation, approve exact schema, roles, status transitions, grants/RLS and form handling. Later tests must cover FK/uniqueness and version ownership constraints; publish/update/unpublish transaction atomicity; public denial of draft/notes/contact; concurrent edits; staff role changes; R2 private/public separation; cache invalidation failures; backup restoration and deletion/retention. The staff-access migration has been exercised only in an ephemeral in-memory Postgres-compatible simulation; no actual Supabase project has been migrated or tested.

**Open decisions:** category/tag snapshot strategy; precise workflow and correction approval; staff role split; storage upload and scanning; contact persistence and retention; provider setup, backup/restore and performance budgets. These are not resolved by approval of the high-level architecture.

**Approval record:** Owner approved Workstream 0.6 documents 07 and 08 on 2 November 2026. Unresolved implementation details and dependencies remain open; approval does not mean production development may begin.
