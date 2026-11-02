# EPE LAWA — Testing Strategy and Acceptance Criteria

**Document:** 11 — Workstream 0.8\
**Status:** Workstream 0.8 approved on 2 November 2026; this is a test plan, not a report of completed tests.\
**Prepared:** 2 November 2026\
**Inputs:** [Requirements](01-product-requirements.md), [journeys](02-user-journeys.md), [page specifications](04-page-specifications.md), [architecture](06-system-architecture.md), [database](07-database-schema.md), [security](08-permissions-security.md), [API proposals](09-api-contracts.md), [integrations](10-integrations.md).\
**Gate:** The owner approved Workstream 0.8 and the complete Phase 0 exit on 2 November 2026. Phase 1 release still requires the release checks described here.

## 1. Quality principles and evidence

A feature is complete only when its approved requirements, real data flow, authorisation, error states, relevant tests, documentation and acceptance evidence are satisfied. A decorative UI or a provider configuration screen is not proof of functionality. Record tests actually performed, failures, environment, versions, results and unresolved issues; never claim a pass from a plan.

**Current status:** Phase 1 foundation has begun after owner approval: three application shells, a deliberately unavailable admin and a small foundation smoke test now exist. A staff-entry migration exists but has not been applied to Supabase; in-memory RLS simulation and mocked Auth tests have passed. No editorial API, live radio, Resend/R2 integration, complete security assessment or deployment has been built or integration-tested. Public provider documentation review, a preliminary colour contrast calculation and foundation smoke tests are not product integration or accessibility tests. Research journeys remain hypotheses.

Use privacy-safe, clearly labelled synthetic fixtures only in isolated, temporary in-memory automated tests. Do not seed application databases or deploy test fixtures, present them as real articles/users, or copy confidential production records into preview. Integration tests that need persistent data require a separately approved safe test-data procedure, cleanup and an isolated test environment; do not create application seed scripts. Separate real provider test recipients and storage from production where possible; control costs and accidental sends. No arbitrary numerical performance or business targets are approved.

## 2. Test levels and responsibilities

Owner and developer are responsible in principle; their individual QA, editorial, security and release authority assignments remain open. External legal or accessibility review should be engaged where needed.

| Level | Proposed coverage | Evidence / gate |
| --- | --- | --- |
| Static / build | Strict TypeScript, lint, formatting policy, build and dependency/secret scans once code exists. | Commands and results in CI/local logs; no claimed pass before run. |
| Unit | Validation, sanitisation, utilities, permissions decisions, status transitions, content transformation and pagination. | Repeatable tests for positive, boundary and negative cases. |
| Integration | Supabase Auth/RLS/grants, version transactions, API contracts, R2 object access, Resend/auth/contact mail and cache invalidation. | Isolated environment and provider-specific evidence, including failure paths. |
| End-to-end | Visitor, reader, radio listener, video viewer, contact and staff workflows across actual application boundaries. | Playwright or evaluated equivalent; capture failures without leaking sensitive data. |
| Accessibility / usability | Keyboard, screen reader, contrast, labels, errors, reflow, touch targets and assisted user tasks. | Automated checks plus manual evaluation; no conformance claim from tooling alone. |
| Security | Role escalation, direct RLS/table/view/function access, session/CSRF, preview privacy, upload and webhook abuse, data isolation, secrets, auditing. | Negative tests and independent review where appropriate; document exceptions. |
| Performance / reliability | Real mobile/low-bandwidth behaviour, Core Web Vitals, images, embeds, queries, radio failures, revalidation and recovery. | Repeatable measurements versus owner-approved budgets and representative scenarios. |
| Operational / recovery | Backup/restore, incident, alerts, provider quota, migration, domain and deployment/rollback checks. | Documented restore exercise and named operator; not just a backup setting. |

Implement test automation only after full Phase 0 approval. Proposed tools include Vitest and Playwright; evaluate them rather than asserting they are installed. Do not build a test harness now. CI is required before release; GitHub Actions would need a `.github/` top-level-folder exception to the owner's three-folder direction, or an approved alternative CI service. Do not silently create the exception.

## 3. Phase 0 documentation and approval acceptance

| Check | Evidence required |
| --- | --- |
| Twelve required Phase 0 documents exist and are internally consistent | Reviewed files `01` through `12` under `docs/`; cross-links and phase boundaries checked. This does not imply their contents are final. |
| Scope and owner decisions recorded | Phase 1 baseline, mandatory working live radio at launch, contact form + WhatsApp, Resend/R2 direction and three-folder structure are traceable; changes require review. |
| Product, journeys, IA and design reviewed | Owner approval records; research hypotheses and untested design assumptions remain labelled. |
| Architecture, schema, security, APIs and integrations reviewed | Role matrix, provider limitations, data ownership, caching and private-content protections explicitly reviewed; unverified provider access is not represented as working. |
| Development readiness, test strategy and release plan reviewed | Reproducible proposed sequence, environment/security requirements, blockers and acceptance criteria; unresolved implementation decisions identified. |
| Full Phase 0 exit approval | Owner explicitly approves the complete Phase 0 deliverables and first-release plan after review. Workstream approvals alone are not blanket authorisation to code. |

The owner approved documents 09/11/12 and the full Phase 0 exit on 2 November 2026. Actual integration tests or a live stream were not falsely declared complete; **Phase 1 launch** still requires verified working radio and all release conditions below. If a remaining ambiguity makes implementation unsafe, resolve it before the affected task, even after Phase 0 document approval.

## 4. Phase 1 end-to-end acceptance journeys

| ID | Scenario and expected result | Critical failure / negative check |
| --- | --- | --- |
| E01 | Visitor opens responsive main site and navigates to available news, media, about and contact. | No fake content, dead active-looking future features or unexpected account requirement. |
| E02 | Reader moves to news, browses/searches published content, opens and shares canonical article. | Draft/private metadata cannot be retrieved through page, search, direct URL or cache; no fake trending. |
| E03 | Listener intentionally starts and pauses the official authorised radio stream on agreed mobile and desktop browsers. | Missing/unauthorised/broken stream blocks launch; offline/loading/buffering/error are truthful and no false LIVE status appears. |
| E04 | Viewer opens an approved video/episode or its external link; embeds are lazy/intentional as designed. | Deleted/private/blocked embed gives honest fallback without a broken or falsely playable presentation. |
| E05 | Visitor uses general form and approved WhatsApp link; form returns the agreed truthful acceptance outcome. | Failed submission/delivery never claims success; no public access to messages; WhatsApp destination verified; no emergency/confidentiality promise. |
| E06 | Authorised journalist signs in, creates/saves draft and accesses private preview. | Unauthenticated/unauthorised users cannot obtain drafts, previews, logs, internal notes or a shared-cache response. |
| E07 | Editor reviews approved version and authorised publisher publishes; current public version appears in both relevant sites. | Stale, wrong-article, unapproved or unauthorised publication is rejected; transitions and audit are recorded. |
| E08 | Staff corrects/updates a published article through the approved policy; prior version history persists. | New private draft does not change public version; internal history does not leak. |
| E09 | Authorised staff unpublish/archive and public article/search/homepage/metadata update via verified invalidation. | Failure is observable and recoverable; no false claim of immediate recall of third-party copies or public cached assets. |
| E10 | Administrator manages allowed assets, media, staff and radio configuration; actual dashboard counts/activity are displayed. | Scope/role violations, private-object access, privilege escalation and fabricated counts are rejected. |
| E11 | With no approved records, each available news/media/administration list shows a clear, accessible empty state and an appropriate next action where one exists. | No blank unexplained content, demo/preloaded records or conflation of empty, loading and error states. Future features are not presented as operational. |

Run scenarios with approved real provider test configuration or appropriately isolated test doubles as labelled. A mocked radio/R2/Resend test does not prove production readiness; test the actual intended integrations before launch. The official radio stream is a mandatory launch dependency, not merely a conditional feature.

## 5. Security and integrity acceptance

Detailed policy candidates are in [08](08-permissions-security.md); exact role permissions and thresholds remain open.

- **Auth:** unauthenticated denial, valid Auth user without staff role, authorised login, renewal, expiry, logout, deactivation/revocation, safe recovery and redirect validation; verify CSRF protection for cookie-authenticated actions and isolate preview sessions.
- **RLS and grants:** test anonymous, each approved staff role and non-staff authenticated identities against direct table, view, function and API calls; test both existing-row and resulting-row restrictions and role escalation. Test public projections and actual view/security-definer behaviour; hiding UI is insufficient.
- **Editorial:** version belongs to correct article, review/approval matches exact version, proposed separation of duties enforced once approved, race/conflict handling, transaction/audit, private preview, corrections and cache withdrawal tested.
- **Storage:** allowed type/size/content, malformed and oversize upload denial, private versus public R2 isolation, scoped access expiry, approved object promotion, cache/takedown behaviour and backup restore. Database RLS alone cannot protect R2 objects.
- **Contact and mail:** validate/rate-limit and abuse controls, unauthorised reads denied, recipient privacy, honest acceptance vs delivery, notification retry/deduplication and signed webhook validation if used.
- **Secrets and logs:** scan client bundles/repository/logs for provider/service-role credentials, auth tokens and signed URLs; audit events capture approved actions without full contact messages or secrets; dependency vulnerabilities and secure headers reviewed.
- **Recovery and incident:** perform a documented access-revocation and credential-rotation exercise, database/Auth configuration and R2 restore in isolation, and cache/content recovery check; approve incident roles, retention and legal escalation.

Critical security failures block release. The owner and appropriate reviewers must explicitly accept any non-critical exceptions and remediation plan; exceptions cannot waive legal requirements or the owner's live-radio launch requirement without a revised decision.

## 6. Accessibility, responsive and performance acceptance

**Accessibility target:** WCAG 2.2 AA where practical, with documented findings and approved exceptions; do not claim compliance solely from automated tests.

- Check keyboard-only navigation and focus order/visibility, mobile menus, dialogs, radio/player controls, form labels/errors/success, semantic landmarks/headings and screen-reader names. Test actual supported desktop and mobile screen-reader/browser combinations.
- Measure final foreground/background, focus and UI contrast, including hover, disabled and over-image treatments; preliminary values in [05](05-design-system.md) are not final component evidence. Verify non-colour status cues.
- Test actual reflow/zoom, text resizing, reduced motion, practical target sizes and screen widths including 320, 375, 768, 1024 and 1440 CSS px; preserve usable controls and content order. Test real affordable Android devices where available.
- Measure representative loading and interaction, Core Web Vitals, image weight/format, third-party embed impact, radio data consumption, query latency and caching under agreed mobile-network scenarios. Set performance budgets and acceptable environments with the owner before treating results as pass/fail.
- Use intentional/lazy media loading, responsive images, pagination and efficient requests; test offline/error/empty states and asset rights. No synthetic usage claims or arbitrary numeric targets.

## 7. Integration and operational acceptance

Provider documentation research is not a test. The test owner must record actual environment, date, scenarios, result and redacted evidence using the template in [10](10-integrations.md).

| Dependency | Release evidence |
| --- | --- |
| Official radio | Authorised direct stream, rights, station relationship and actual browser/mobile play/pause/buffering/error verification. **Blocks launch if absent or nonfunctional.** |
| Resend + Supabase Auth | Verified sender/domain, approved SMTP/API configuration, staff auth/recovery mail actually received in controlled tests; failures, rates and security reviewed. |
| General contact + WhatsApp | Approved recipient/fields/privacy/retention; actual safe submission and failure recovery; correct verified WhatsApp destination. |
| R2 | Test private denial, approved public delivery, secure upload, expiry/purge and backup restore with the chosen environment and scope. |
| YouTube/Facebook | Approved rights, supported embeds/links, specific item playback, fallback and mobile/data impact; no unsupported scraping. |
| Domains/Vercel | Ownership, DNS, TLS, independent app builds, secure preview/production isolation and redirects tested; recovery and rollback reviewed. |
| Cache/search | Published-only indexed content; cross-site revalidation, withdrawal and failure recovery confirmed. |
| Backup/monitoring | Restore exercise across database/Auth configuration and R2 with documented objectives; named incident/alert owner and secret rotation. |

## 8. Later-phase release criteria

These are phase-level checks, not permission to implement now. Each phase needs separate scope, legal, security, staffing and acceptance approval.

| Phase | Essential acceptance |
| --- | --- |
| 2 — Community | Speak Up is secure and private, not automatically published or positioned as emergency response; moderation, abuse reporting, audit and events work; user accounts and access controls pass privacy/security tests. |
| 3 — Governance | Public people/projects are reviewed, evidence and sources linked, statuses verifiable, histories/corrections retained and public claims traceable. |
| 4 — Heritage/business | Attributed and locally reviewed heritage, community/tourism records and approved business listings; searchable, unverified material not misrepresented; no unapproved marketplace. |
| 5 — Diaspora/expansion | Confirmed newsletter consent, delivery and unsubscribe work; archive improvements and international access tested; expansion decisions documented and approved. |

## 9. Release checklist and sign-off

Before release, the accountable owner and developer (with roles assigned) review:

1. Approved Phase 0 and Phase 1 scope; outstanding decisions resolved for each implemented feature.
2. Real content, rights, corrections, privacy/terms and contact details approved; no fabricated data.
3. All required builds, unit/integration/e2e, accessibility, security, responsive and performance checks executed with results recorded. Critical issues resolved; exceptions explicitly approved.
4. Official radio stream and rights verified and actual playback tested. **No release without live radio unless the owner changes this requirement.**
5. Production domains, environment isolation, RLS, secret management, R2/Resend, safe caches, monitoring, backups and restore/rollback documented and tested.
6. Release approver, support/escalation, incident response and post-release monitoring named; deployment and outstanding limitations recorded.

**Approval record:** The owner approved Workstream 0.8 and the full Phase 0 plan on 2 November 2026. This document remains a plan, not a test-result report.
