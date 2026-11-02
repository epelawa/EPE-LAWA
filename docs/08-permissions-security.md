# EPE LAWA — Permissions and Security Design

**Document:** 08 — Workstream 0.6 (security design)\
**Status:** Workstream 0.6 approved by the owner on 2 November 2026. Controls are design proposals, not implemented or tested.\
**Prepared:** 2 November 2026\
**Inputs:** [Product requirements](01-product-requirements.md), [approved architecture](06-system-architecture.md), [proposed database schema](07-database-schema.md).\
**Gate:** Documents 07 and 08 were approved as Workstream 0.6; proceed to Workstream 0.7. Full Phase 0 approval is still required before production development.

## 1. Security objectives and boundaries

Protect public editorial integrity; staff accounts and operations; unpublished content and versions; general-contact messages; private storage; provider credentials; and audit and recovery processes. Public browsing is anonymous. Staff access requires verified authentication **and** current authorisation. Future Speak Up reports, discussions and other later-phase data need separate designs before those phases begin.

Trust boundaries: browser ↔ public/news/admin server; server ↔ Supabase Auth/Postgres; server ↔ R2 and Resend; browser ↔ third-party radio/video/WhatsApp. None of these integrations is verified here. A public object in R2 is accessible independently of Postgres; database RLS does not protect it. Secrets stay in trusted server environments, never in client bundles, repository files or chat.

### Information classification

| Class | Examples | Proposed handling |
| --- | --- | --- |
| Public approved | Published article snapshot, approved author profile, deliberately public asset, approved contact/WhatsApp link. | Public allowlisted projection/URL only after approval; cache and withdrawal policies apply. Public delivery cannot guarantee recall of third-party copies. |
| Internal | Drafts, unpublished versions, editorial notes/reviews, media provenance, private previews, non-public configuration. | Authorised staff only; no shared public caching, indexation, metadata or unauthorised object URL. |
| Restricted personal / operational | General-contact messages and contact details, staff identity/role details, audit details, provider message metadata. | Minimum access and collection, retention/deletion policy, auditable access where required; never public by default. |
| Secret | Service-role, R2 and Resend keys; passwords, session tokens, webhook or job secrets. | Server-only secret management, least privilege, separation/rotation; never in logs, URLs deliberately used for sharing or public code. |

General contact is **not** an emergency service or a confidential Speak Up reporting channel; do not promise anonymity. The pending contact storage decision affects risk and must be approved before implementation. The existence of a privacy policy, RLS or encryption alone is not proof that a user's message is safe.

## 2. Candidate roles and permission matrix

The owner identified the owner and developer as responsible, but has not assigned individual accounts or approved a role split. The following is a **proposed least-privilege starting matrix**, not an implemented policy or assertion about actual staff. Enable only needed Phase 1 roles. Alternative role assignments and who may self-approve require owner decision before implementation.

Legend: **✓** proposed permission; **O** own assigned drafts only; **—** denied by default; **R** restricted to the role's assigned scope. Each permission also requires an active account, resource state and server/database checks.

| Action | Public | Journalist | Editor | Editor-in-Chief | Radio Manager | Administrator | Super Admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Read approved published content | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read own drafts and authoring history | — | O | R | ✓ | — | R | R |
| Create/edit assigned drafts, submit for review | — | O | R | ✓ | — | R | R |
| Review / request revision | — | — | R | ✓ | — | R | R |
| Approve / publish / update / unpublish / archive articles | — | — | — | ✓ | — | R | R |
| Manage categories, tags, author records | — | — | R | ✓ | — | R | R |
| Manage media/curation | — | R | R | ✓ | R | R | R |
| Manage radio configuration | — | — | — | — | ✓ | R | R |
| Read general-contact submissions, if stored | — | — | — | R | — | R | R |
| Change website settings | — | — | — | — | — | R | R |
| Manage staff / role assignments | — | — | — | — | — | — | ✓ |
| Read audit logs | — | — | — | — | — | R | ✓ |
| Change security-sensitive configuration | — | — | — | — | — | — | ✓ |

`R` is **not blanket permission**: it means a specific capability and resource scope must be granted explicitly in the final role/action matrix. Administrator and Super Admin do not automatically gain editorial approval merely because they have technical access. Broad operational powers must not silently bypass the editorial approval process. Separate account management from publishing where practical. Decide whether editor and publisher can be the same person, who can approve their own work, who can read contact messages and which powers owner/developer actually need.

Community Moderator and Directory Manager are future-phase candidate roles, not enabled by this matrix. No public user account or forum role is required in Phase 1. Additional granular permissions may be preferable to multiple broad roles; avoid role proliferation without operational need.

### Permission enforcement and changes

1. Use a trusted staff role assignment store, not user-editable profile or JWT metadata as the authority. Public clients cannot assign themselves roles or create staff status.
2. Default deny, including direct requests to APIs, tables, functions and object stores. The UI may hide actions for clarity but cannot grant or enforce rights by itself.
3. Validate action, resource ownership/scope, state, reviewer eligibility and current role at the server and database boundary. Role deactivation/revocation must take effect according to a documented maximum delay and session handling strategy.
4. Restrict role grants and security configuration to an explicitly authorised administrator; require audit records for grants, revocation and privileged actions. Define bootstrap/break-glass access without a permanent shared account and test recovery/revocation.
5. Protect approved/published snapshots from generic edits: use validated, authorised transition operations with transactional integrity and retained history. No one, including an operator with infrastructure access, should silently alter approved public content.

## 3. Authentication and session flow

Phase 1 recommendation: staff log in on the admin host; main and news are public and do not automatically share staff cookies. The details must be tested against the actual Supabase Auth/Next.js deployment and preview domains.

```text
Staff → admin login → Supabase Auth verification
                         ↓
             admin-host session established / refreshed
                         ↓
       server verifies identity + current staff role for each protected action
                         ↓
                authorised operation or denial + appropriate audit
                         ↓
                   logout / expiry / revocation
```

- Validate authenticated server-side sessions rather than trusting browser-supplied user IDs or role claims. Establish appropriate `Secure`, `HttpOnly`, host-only and `SameSite` cookie settings, CSRF protection for cookie-authenticated state changes, and secure session rotation/refresh/logout.
- Allowlist exact approved redirect origins/paths for login, recovery and preview environments; reject open redirects. Supabase recovery mechanisms may involve short-lived verification links: assess provider flow and leakage risks, avoid exposing reusable bearer tokens in URLs or logs, and test actual callback handling before approval.
- Evaluate MFA for privileged accounts, password recovery, email verification, rate limiting, session lifetime, account lockout, deactivation and support procedures. MFA and specific timeouts are not yet approved. Protect against account enumeration with appropriately generic public responses.
- Do not use local storage or share cookies across subdomains as an unreviewed shortcut. Public pages and admin previews must not leak tokens, draft content or personal information in referrers, logs, page metadata or shared caches.
- Consider separation of production and preview identities; never use production users and confidential data in unprotected previews. Establish incident handling for suspected credential compromise.

## 4. Database access and RLS policy design

RLS must be enabled and tested on each exposed table as appropriate, with explicit grants and default-deny policies. A table with RLS enabled but no applicable policy should be inaccessible to ordinary roles; test actual Supabase/Postgres behaviour. Safe public views, exposed schema configuration, function privileges and view ownership/security mode require explicit verification; a view or noindex tag alone does not protect a draft.

| Data / operation | Anonymous | Authorised staff | Enforcement intent |
| --- | --- | --- | --- |
| Published articles, safe authors, category/tag data | Read only safe approved published projection. | Read within appropriate editorial scope. | Projection must reference the current approved published version; no private metadata or other versions. Deny direct access to underlying private tables. |
| Draft articles, snapshots and editorial reviews | Denied. | Assigned/authorised scope only. | RLS and server checks for read/write; immutable approved versions; controlled transitions and same-article version ownership. |
| Staff roles, settings, audit | Denied except allowlisted public settings. | Specific roles/capabilities only. | Restricted grants, row/column exposure and privileged operations; never expose private identity/role details via public views. |
| Media metadata / R2 objects | Only approved public projection and intentionally public objects. | Relevant management role; private objects only with explicit authorisation. | RLS protects metadata, **not** R2 bytes. Separate private and public storage, server checks and scoped access. |
| Contact submissions / notification records (if adopted) | No list/read; submission only through controlled validated server operation. | Explicit restricted contact-handling permission. | Default-deny direct table APIs, minimal data, rate limits, audit and retention. Test unauthorised staff denial. |
| Transition / role-management operations | Denied. | Explicitly permitted role and state only. | Grant only specific reviewed procedures/endpoints; concurrency-safe updates and auditing; do not expose unrestricted direct updates. |

For each actual policy, specify role, operation, predicate for existing rows and `WITH CHECK` for resulting rows, data exposure, direct table/function grants and negative tests in the migration/security review. Avoid recursive role-policy lookups. If privileged/definer helpers are necessary, minimise execution rights, fix `search_path`, validate caller and parameters, and test that they cannot be exploited. An Auth user without a staff assignment receives no staff permissions.

### Editorial security invariants

- A publicly served article must reference an approved version belonging to that article. Private draft updates cannot change public title, body, images or metadata until reapproved and published.
- Decide whether an author may review/approve their own work; default proposal is to require a different authorised approver, with no emergency bypass until the owner explicitly approves a safe procedure.
- Publishing, correcting, unpublishing and archiving must be authorised, transactionally consistent and audited. Preserve earlier versions and expose only public corrections, not private notes.
- Public caches, search, feeds, SEO metadata, previews, R2 images and CDNs must be included in withdrawal testing. Publicly distributed assets may already have been copied; avoid claiming absolute revocation.

## 5. R2 object and media security

1. Use separately controlled private and public buckets or an equivalently verified isolation design; private content is never placed behind a public access path. Environment isolation and key scopes must be verified in the owner's actual Cloudflare account.
2. The authorised upload workflow validates file type/content, size, permissions and rights; determine scan/inspection requirements and safe image processing. Never trust a client filename or claimed MIME type alone.
3. Keep originals and unreviewed variants private. Promote only specifically approved public derivatives to public delivery; tie publication and R2 lifecycle to the approved content workflow. Store private object location metadata only in restricted records.
4. Private reads use a server-authorised proxy or narrowly scoped short-lived signed access, after evaluating risks. Signed URLs are bearer credentials: avoid logs, referrers, public metadata and excessive expiry; document revocation and cache limitations. Never put secret keys in the browser.
5. On unpublication or takedown, revoke the public publication path and purge where feasible, invalidate page and object caches, and verify results. This cannot recall cached or copied public objects outside platform control; operational procedures and legal response must account for that.
6. Verify R2 permissions, network policies, CORS, object lifecycle, actual backup/restore, billing and audit support; do not assert these capabilities are configured. Separate test/preview objects from production and use no real confidential fixtures in public testing.

## 6. Contact, email and external integrations

- Contact submission fields, privacy notice, recipient, retention, deletion, abuse controls and operator access remain open. If stored, validate on a server-controlled path and block direct public reads. A general enquiry may contain sensitive information: collect the minimum necessary and do not log the message.
- If the approved design durably stores messages and sends Resend notifications, distinguish accepted into the platform from provider acceptance, delivery and human response. Use truthful user-facing messages and a retry/reconciliation process with deduplication and monitoring. Provider webhooks, if used, require signature and replay verification and minimal data storage.
- For Supabase Auth email, evaluate supported Resend SMTP configuration and test sender-domain verification, recovery links, delivery and limits. No provider account is assumed configured; separate production and non-production credentials and sending destinations.
- WhatsApp is an external link, not an authenticated or private submission workflow. Verify the destination number and tell users they are leaving. Avoid pre-populating sensitive text; do not promise confidentiality or automatic follow-up.
- Live radio requires an authorised, compatible direct stream and embedding permission at launch. Do not mark LIVE from a configured URL alone. Test playback, HTTPS/mixed-content, format, origin restrictions and unavailable states. YouTube/Facebook use only supported embeds/links; do not scrape. Evaluate script/privacy and content-security policies with actual providers.

## 7. Audit, operations, privacy and incident response

### Audit events

Record, as applicable, staff login/security events available from the chosen provider, account activation/deactivation and role changes, editorial submissions/reviews/approval/publication/corrections/unpublication/archive, restricted media and settings actions, and contact access or handling actions according to the approved policy. Record actor or service, action, target, timestamp, outcome and limited relevant metadata; avoid passwords, keys, tokens, signed URLs, full contact messages and unnecessary personal data. Distinguish successful and denied sensitive attempts where feasible.

Application roles must not freely change/delete audit entries. Define who can read them, integrity and retention, privileged maintenance, legal deletion requirements, export and monitoring before implementation. Audit logs are not a substitute for access prevention and must not be published.

### Retention and legal review

Set and approve data minimisation, purpose, access, retention and deletion periods for staff, drafts, media, contact messages, notifications and logs. Review privacy/terms, Nigerian data protection obligations and cross-border processor arrangements with appropriate legal guidance. No retention duration is assumed here.

### Backups and recovery

Agree recovery-point/time objectives and test Postgres, Auth configuration and R2 object backup/restore separately, including metadata/object reconciliation. Protect backups, restrict access and review deletions, published content and credential rotation after restore. Do not assume provider defaults meet recovery requirements or claim backups exist.

### Incident response

Assign an incident owner and escalation/communication procedure; isolate compromised accounts/keys, preserve appropriate evidence without exposing sensitive data, rotate/revoke credentials, address affected caches/objects, assess notification duties with legal guidance and record remediation. Define a safe break-glass process and test it; avoid permanent shared superuser credentials. Operations owner allocation remains open between the owner and developer.

## 8. Security testing and acceptance plan

No security or integration testing has been performed in this workstream. Before release, execute and record tests in isolated environments using synthetic private fixtures:

1. **Authentication:** unauthenticated access denied; invalid/expired sessions denied; recovery and redirect validation, refresh, logout, account deactivation and privilege revocation behave as agreed; CSRF and preview-host cases covered.
2. **Role boundaries:** for every final role and capability, exercise allowed and denied server/API/database requests, including a valid Auth user with no staff role, another author's drafts, self-approval rules, role escalation and access after revocation.
3. **RLS and grants:** test direct reads and writes with anonymous and staff identities, underlying tables, views, functions and helper permissions; test resulting-row checks and attempts to alter roles or bypass workflow through generic updates. Confirm service-role material never appears in a client bundle.
4. **Editorial integrity:** publish only a reviewed approved version; attempted cross-article version pointers fail; concurrent edits do not overwrite approval; draft update after publication stays private; review notes and previous private versions do not leak through API, search, metadata, caches or preview.
5. **R2:** private objects deny anonymous and insufficiently scoped requests even with a guessed key; uploads enforce approved size/type and permission; public promotion is explicit; signed-access expiry/leak controls and takedown/cache purging are tested with documented limitations.
6. **Contact and mail:** validate/rate-limit/spam controls; deny public and unauthorised staff reads; success is truthful on storage/provider failures; retries and duplicate handling work; Resend delivery and signed webhooks, if used, are verified without leaking message contents.
7. **Operational security:** scan dependencies and upload paths, test secure headers and redirect handling, audit completeness/tamper resistance, secret rotation, backup restoration and incident playbooks. Document exceptions and obtain explicit approval before release.
8. **Radio/social:** verify rights and actual playback under supported mobile/browser conditions; honest unavailable states, supported embeds and privacy/security headers are tested. Live radio is mandatory for launch.

Tests and acceptance criteria will be detailed in the testing workstream; passing a UI demonstration alone is insufficient.

## 9. Decisions and approval

- Confirm who holds each staff capability, whether an author may approve their own work, and which staff may access contact messages and audit logs. The proposed matrix is not final.
- Decide the contact form's fields, delivery/storage model, recipient, retention and privacy notice. Obtain the approved WhatsApp destination without posting credentials.
- Confirm provider ownership/access and validate Supabase, R2, Resend, domain and recovery settings; supply and test the authorised radio stream. Never include provider keys or passwords in chat or documents.
- Define workflow transitions, post-publication reapproval, preview design, cache withdrawal, operational ownership, backup objectives and legal review before implementation.

**Approval record:** Owner approved Workstream 0.6 documents 07 and 08 on 2 November 2026. The provisional role matrix and other named decisions still need refinement; proceed to Workstream 0.7 integrations and operational requirements. Full Phase 0 review is still required before production coding.
