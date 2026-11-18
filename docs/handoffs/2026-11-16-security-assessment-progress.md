# Security assessment — preliminary progress, 16 November 2026

This is a partial assessment, not a comprehensive penetration-test report or a release certification. Production checks were read-only catalog/ACL queries; no real-user records were extracted and no production mutations or exploit attempts were performed. Local tests used synthetic data. Scope and outstanding work are recorded below so no untested control is mistaken for an assurance.

## Findings and verification

### High — newsletter signup RPC remains exposed in production (open)

Read-only production function definition and grants show that anonymous and authenticated roles can execute `newsletter_subscribe_request`, which can overwrite subscription-management fields for an existing address; the unsubscribe RPC is also available to anonymous users. This creates a plausible unauthorized unsubscribe risk. The impact is inferred from the implementation and ACLs, not a production exploit. The application signup pause does not block direct RPC access. The existing forward-only migration `20261118053000_pause_unsafe_newsletter_signup.sql` revokes the unsafe execution grants and preserves unsubscribe. It has **not been applied to production**. Local PGlite tests (`backend/tests/newsletter-signup-pause.test.mjs`) pass for denied signup and synthetic existing-token unsubscribe. Apply only through an authorized, reconciled production change procedure with backup/restore rehearsal, then retest ACLs; build mailbox-proof confirmation, safe token rotation, generic responses and abuse controls before reopening signup. Contact intake remains separately unfinished.

### High advisory — dependency audit gate (open; practical exposure unverified)

`corepack pnpm audit --audit-level=high` reports GHSA-fc5q-39xc-vjpf, a picomatch ReDoS advisory, in two paths: Vitest and admin Tailwind/chokidar/anymatch. The audit reports no patched version. These are tooling dependency paths; no runtime attacker-controlled reachability was established here. Do not suppress the gate or claim the application is exploitable solely from this report. Track upstream fixes and investigate safe dependency replacements or upgrades, then rerun the audit and regression suite.

### Low — unbounded browser share-cover response (local mitigation; not deployed)

The old `buildShareCover` called `response.blob()` before checking actual size. An absent or dishonest Content-Length could make a visitor's browser buffer a large response when they chose to share a cover. This is a client-side resource-exhaustion risk, not server-side SSRF. The branch checks image type, reads incrementally and cancels after 8 MiB, retaining the browser-only fetch and credential omission. Focused synthetic tests verify valid image creation, invalid MIME, declared oversize, insecure remote URLs and a dishonest length with a stream crossing the limit. A single network chunk may still be allocated by the browser before it is checked; external availability and browser-native sharing remain unverified.

### Informational — selected live database metadata

RLS was enabled on the eight selected inspected public tables; table-level SELECT grants to anon on articles and article versions are not by themselves evidence of public access to private rows, because RLS policies also apply. This limited catalog inspection is not a policy or bypass test. Anonymous execute was denied for `article_publish` and allowed for authenticated; capability enforcement inside it and all other RPCs still require comprehensive testing against the reconciled schema. No private rows were read.

### Informational — CSP is report-only

The public app configuration sets a report-only Content Security Policy. It is not an enforced XSS mitigation. Review legitimate scripts, media and embeds, test a restrictive policy in staging, and enforce it only after compatibility verification. This is a hardening gap, not proof of an XSS vulnerability.

## Local verification

On this branch: typecheck passed (five tasks); production build passed (two tasks); full tests passed after build: 314 Node tests passed, one skipped, and 36 Vitest tests passed. Running tests before building failed four foundation tests because their local production servers could not be reached; rerunning after the build passed. The two focused newsletter PGlite tests and three share-cover tests passed. The high-severity dependency audit remains failing. No browser matrix, real provider delivery, external share client, production deployment, or live mitigation retest was performed for this branch.

## Remaining assessment and release work

1. Reconcile complete live schema and migration ledger without private data, rehearse backup/restore in isolation, and resolve the dependency gate. Production database writes require the separate approved change procedure; the exposed newsletter RPC remains urgent.
2. Implement and test secure newsletter signup and monitored contact intake, including isolated abuse, provider failure and unsubscribe tests; do not enable prematurely.
3. Complete news navigation, search, filtering and discovery with accessible responsive and genuine-data tests; preserve existing listing and article footers.
4. Complete article presentation/sharing and verify real media, attribution and client compatibility.
5. Complete protected newsroom, safe uploads/URL handling, private recovery, staff capability checks and accessible controls.
6. Finish revision-safe publication, scheduling and audited deletion with retention policy.
7. Implement truthful privacy-conscious analytics, without inventing live or country metrics.
8. Finish member/staff identity, branded OTP, account recovery and verified email delivery.
9. Audit and finish all eight web areas, authorization and realistic error states.
10. Verify storage, payments, other providers, legal/retention and roadmap gates in appropriate isolated environments.
11. Perform a systematic OWASP-style review and controlled tests across auth, APIs, RLS, storage, admin, payments, secrets and infrastructure; document coverage, evidence, impact, remediation and retests for every confirmed finding. No comprehensive audit has yet been completed.
12. Run complete route, role, accessibility and responsive browser matrices, live read-only checks and all release gates on the final candidate. Do not claim untested integrations or merge while required gates remain failing.
