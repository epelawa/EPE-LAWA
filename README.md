 # EPE LAWA

**The Voice of Epe Division.** A community, news, heritage, discussion and local-business platform for Epe Division, Lagos State, Nigeria.

## Current release scope

The current web release includes all eight client-approved web areas (sections 3.1–3.8): Trending News; Itan Ilu Mi / My Community History; Chat Forum / Digital Village Square; Map & Navigation; Epe Business Directory & Marketplace; Historical Sites & Tourism; EPE LAWA Radio; and Who is Who in Epe. Cross-cutting requirements include member signup/verification/login/recovery, secure staff sessions/capabilities, admin analytics, news publishing, branded transactional email templates, audit, privacy, accessibility and full Playwright testing. Commerce/payments are out of scope by owner decision — advert placements are paid manually. See [the consolidated master plan](docs/00-master-plan.md) — the single active project document.

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

Verified 2026-11-21 against `https://epelawa.vercel.app` (read-only HTTP checks, no writes): `main` is `e3e791f7787cd8992f71ab6df6e1ad2609081fc8` (merge of PR #238) with CI verify, CodeQL and browser smoke all green on that exact head. The live alias serves all eight approved modules: homepage and News are populated with real published stories; Business Directory shows one verified business (Founda Technologies); Map, Tourism, Itan Ilu Mi, Who is Who and Gallery serve honest empty states; `/admin/login` and `/api/health` (`{"status":"ok"}`) respond 200. One verified live defect: `/forum` renders the error boundary ("Try once more, or take another route") instead of the forum listing. The production Supabase migration-ledger drift documented in the 2026-11-20 reconciliation (now in git history) has since been resolved for the feature-program migrations; no production writes were made during this verification.

## Key documents

| Document | Purpose |
| --- | --- |
| [00 — Master plan](docs/00-master-plan.md) | The single consolidated project document: scope, architecture, database conventions, security, design system, integrations, roadmap and changelog |

Historical snapshots live in `docs/archive/` and in git history.

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
