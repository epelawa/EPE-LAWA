# EPE LAWA — Pre-development Handoff

**Status:** Planning and owner review; not permission to build.\
**Prepared:** 2 November 2026\
**Purpose:** Make the remaining approval, dependencies and repository structure clear before the website work begins. Read alongside the twelve required [Phase 0 documents](../README.md#phase-0-documents).

## 1. What is and is not ready

- The twelve Phase 0 planning documents exist, including proposed product, design, security, API, integration, test and roadmap decisions. Workstreams 0.1–0.7 were reviewed by the owner; Workstream 0.8 and the **complete Phase 0 exit** remain awaiting explicit approval.
- This is a discovery repository: no application code, migrations, application dependencies, lockfile, test suite, provider setup, DNS, deployed website or integration tests have been created by this work. A design document is not proof of a working service.
- Live radio is mandatory at launch. The official direct stream, compatible format, embedding permission and actual browser/mobile playback have not been provided or verified. Honest outage states are required, but cannot substitute for a working authorised stream at launch.
- The owner and developer are responsible, but the exact editorial, technical, privacy, operations and incident responsibilities remain to be allocated. Preserve the open decisions in docs 07–12; do not infer that they are settled merely because documentation exists.

## 2. First decisions before implementation

1. Owner reviews and approves or amends documents [09](09-api-contracts.md), [11](11-testing-acceptance.md) and [12](12-development-roadmap.md), then explicitly approves the full Phase 0 exit. Review is separate from merging a documentation PR.
2. Confirm staff permissions and editorial workflow, especially independent approval, post-publication corrections, private preview and revocation. Finalise schema/grants/RLS and API fields before implementing the corresponding modules.
3. Confirm contact form fields, recipient, delivery/storage, privacy, retention and WhatsApp destination; obtain appropriate legal review. Do not collect or paste passwords, provider keys or tokens into chat or source control.
4. Verify domain/DNS, Supabase, Vercel, Cloudflare R2 and Resend ownership and authorised access; agree separate environments, budget, backups and operator responsibilities. Do not assume accounts or integrations are configured.
5. Obtain official radio stream and rights, licensed Epe assets, approved organisation copy, real initial news/media if available, and approved legal policies. A lack of initial articles/media calls for useful empty states, not fictional records. Live radio remains a release blocker.

## 3. Proposed repository structure — after Phase 0 approval

```text
frontend/
  apps/
    main/       # main public website
    news/       # independent news publication
    admin/      # authorised staff dashboard
  packages/     # shared browser-safe UI when justified
  tests/        # frontend/cross-app tests as approved
backend/
  supabase/
    migrations/ # schema changes as reviewed migrations
    config.toml # proposed local configuration, never secrets
  packages/     # server/domain/auth/validation code as justified
  services/     # only if an independent service is needed and approved
  tests/        # integration/security tests as approved
docs/            # project and operational documentation
README.md and necessary root configuration files
```

This is a proposed child layout, not existing files. Next.js applications can have their own server-side handlers under `frontend/apps/`; shared server logic and database assets belong under `backend/`. Do not copy server secrets into browser bundles or duplicate business logic. A separate backend server is not mandated. GitHub Actions requires an extra `.github/` root folder: get the owner's explicit exception or select an approved alternative for CI. Do not create additional top-level folders silently.

## 4. Proposed dependencies — select versions and install only after approval

No versions are pinned or packages installed. Validate licences, compatibility, costs, maintenance, Node/runtime and pnpm versions before selecting and recording exact versions in the lockfile.

| Need | Candidate | Decision / constraint |
| --- | --- | --- |
| Workspace / build | pnpm, Turborepo | Root workspace configuration; verify deployment and tooling compatibility. |
| Public/admin apps | Next.js App Router, React, TypeScript strict | Three separately deployable applications; choose compatible versions. |
| Styling | Tailwind CSS; approved shared UI primitives | Apply design tokens and test accessibility; avoid unnecessary UI dependencies. |
| Identity / relational data | Supabase PostgreSQL/Auth; compatible Supabase JS and server-side integration libraries | RLS, server sessions and role enforcement require a reviewed integration; do not put privileged keys in browser code. |
| Asset storage | Cloudflare R2 with a compatible S3 SDK as needed | Owner-specified; verify actual API operations, credentials, isolated private/public delivery and backup. |
| Transactional email | Resend via its API/SDK for approved server workflows and supported SMTP for Supabase Auth if verified | Owner-specified; sender/domain and recipient still open. No newsletter in Phase 1. |
| Validation | Zod or evaluated equivalent | Share schemas where appropriate; always validate server-side. |
| Rich text | Tiptap or evaluated equivalent | Choice, accessible editing, sanitisation and licence review remain open. |
| Tests | Vitest, Playwright and appropriate database/integration tooling | Exact versions, test isolation, provider test mode and CI runner require review. |
| Radio / social | Official direct stream and permitted YouTube/Facebook embeds | Not npm assumptions; stream/rights and actual embeds need testing. |

Do not install every possible dependency in advance; add the smallest necessary set for each approved implementation task. External providers' documentation and [10-integrations.md](10-integrations.md) should be checked for current support and limits. Exact package manifests, setup commands, secrets and deploy instructions can only be written and tested against the real implementation; do not invent them.

## 5. No demo data: required empty states

- Do not create demo users, articles, videos, events, business listings, fake counts or other sample records, and do not create database seeding scripts. Do not preload proposed editorial categories as data; authorised staff may configure real categories after the system is operational.
- Provision legitimate staff and operational configuration through approved secure processes. These are real administrative setup, not fake demo data.
- When an available feature has no records, show a clear, accessible empty state with useful next action where appropriate. Separate empty from loading, unavailable and error. A future-phase feature must not appear available just because an empty state exists.
- Use only clearly synthetic, temporary in-memory fixtures in isolated automated tests. Tests that require persistent integration data need an independently approved isolated procedure with cleanup; never show test data as real content or deploy it to application databases.
- Verify these requirements across homepage news/media, news search/category, media archive and private admin lists. Real zero counts may be displayed when sourced from actual records; do not manufacture counts or testimonials.

## 6. After approval — implementation starting order

1. Agree the initial narrowly scoped task and CI/folder decision; create the workspace and install only approved foundation dependencies.
2. Set up secure environment boundaries and migration workflow; configure Auth, permissions and verified provider access without exposing secrets.
3. Build and test editorial data/workflow and publication isolation, then the news/main experiences, contact, media and R2. Verify Resend and operational procedures.
4. Acquire, authorise and test live radio; complete accessibility, security, performance, deployment and recovery checks before the explicit release approval.

The detailed phased sequence and release gates are in [12-development-roadmap.md](12-development-roadmap.md), and test evidence is in [11-testing-acceptance.md](11-testing-acceptance.md). This handoff does not override the requirement to review and approve the full Phase 0 exit before production coding.
