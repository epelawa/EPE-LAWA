# EPE LAWA

**The Voice of Epe Division.** A community, news, heritage, discussion and commerce platform for Epe Division, Lagos State, Nigeria.

## Current release scope

The current web release includes all eight client-approved web areas (sections 3.1–3.8): Trending News; Itan Ilu Mi / My Community History; Chat Forum / Digital Village Square; Map & Navigation; Epe Business Directory & Marketplace; Historical Sites & Tourism; EPE LAWA Radio; and Who is Who in Epe. Cross-cutting requirements include member signup/verification/login/recovery, secure staff sessions/capabilities, admin analytics, news publishing, branded transactional email templates, audit, privacy, accessibility and full Playwright testing. See [the master plan](docs/00-master-plan.md) and [product requirements](docs/01-product-requirements.md).

A route or database object existing does not prove a feature is complete or in current scope. Historical schema inventory is not a release claim.

## Local setup

Requires Node.js 22 and pnpm 10. Copy `.env.example` to local environment files and use isolated credentials for testing. Without required configuration, the app must fail closed and show an honest unavailable state.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
```

Run `pnpm build` before `pnpm test` if the test suite starts built apps. PGlite schema/RLS checks are local simulations, not proof against live Supabase. Test content is private in isolated environments; production remains read-only.

The public app is `frontend/apps/main`; the staff app is `frontend/apps/admin`.

## Safety and release gates

- Use approved public records only; never seed fake content or engagement.
- Test articles remain private. Direct publish is allowed for an active verified staff member with `article.publish`; a second reviewer is not required. Stale revisions are rejected and transitions audited.
- Maps currently builds safe outbound Google Maps search/directions URLs only. There is no configured Maps API key or verified Places/geocoding integration; offline maps are optional future work.
- Marketplace payment actions must remain unavailable until provider setup and private sandbox testing are evidenced. No production orders/payments in tests.
- Staff actions require a verified staff session and current capability; no service-role key in a browser bundle.
- Branded email templates do not prove delivery readiness. Email sender authentication and Paystack operation are unconfirmed.
- Sponsored placement, if enabled, requires a real, date-bounded record and clear sponsor label.
- `/api/health` is a public liveness probe only. It returns fixed status fields and deliberately exposes no environment, dependency, version or error detail; it is not a readiness or deployment gate.

## Deployment status

A supplied Vercel log records an older `main` build at `8885e16` failing due to unresolved helper imports and filtered environment variables. A read-only Playwright baseline on 2026-11-07 against `https://epelawa.vercel.app` found the deployed alias is still an older, incomplete release: News, Radio and Who-is-Who returned 200, while several approved module and auth routes returned 404; Radio overflowed at 320/375 px. This is not the feature branch. The current feature-branch preview remains unverified; no production writes were made.

## Key documents

| Document | Purpose |
| --- | --- |
| [00 — Master plan](docs/00-master-plan.md) | Scope, design direction and release evidence |
| [01 — Product requirements](docs/01-product-requirements.md) | Full requirements for all eight web areas and section 5 roadmap enhancements |
| [04 — Page specifications](docs/04-page-specifications.md) | Current public/staff page requirements |
| [05 — Design system](docs/05-design-system.md) | Palette, interaction and accessibility |
| [08 — Security](docs/08-permissions-security.md) | Roles, access, privacy and moderation |
| [11 — Testing](docs/11-testing-acceptance.md) | Acceptance and verification status |
| [12 — Roadmap](docs/12-development-roadmap.md) | Current implementation workstreams |
| [14 — Tracker](docs/14-tracker.md) | Evidence, status and blockers |
| [15 — UI research](docs/15-ui-research.md) | Reference sources and limitations |
| [16 — Progress log](docs/16-progress-log.md) | Timestamped evidence and decisions |

## Repository layout

```text
frontend/apps/main/              Public EPE-LAWA web app
frontend/apps/admin/             Staff/admin workspace
frontend/packages/ui/            Shared browser-safe UI components
frontend/tests/                  HTTP, unit and integration tests
backend/supabase/migrations/     Reviewed SQL — schema source of truth
backend/tests/                   Schema and policy tests
docs/                            Requirements, architecture and operations
```

## Contributing and release

Read `AGENTS.md` and `docs/00-master-plan.md` first. Do not claim tests, integrations or deployment gates passed unless actually verified. Production checks are read-only. Do not commit or push unless the active task explicitly authorizes it.
