# EPE LAWA

EPE LAWA — The Voice of Epe Division. A website-first civic, cultural, journalism and media platform for Epe Division.

## Current status

**Phase 1: foundation.** The owner approved Workstream 0.8 and the full Phase 0 plan on 2 November 2026. Three minimal Next.js application shells and shared workspace tooling are present; they are not launch-ready. Main and news explicitly report that content is not connected, and admin returns 503 until secure authentication and permissions are implemented. The staff-access foundation migration has been applied to the owner-confirmed production Supabase project; an unwired server-only session gate is under development, the applications are not connected, and real-provider security tests remain outstanding. The mandatory live radio stream, domains and provider configurations remain unverified.

The owner requested no demo or seeded application data. Available features should have useful, truthful empty states when there are no real records. See the [pre-development handoff](docs/13-pre-development-handoff.md) for the proposed structure, dependency decisions and next steps.

## Local setup

Requires Node.js 22 and Corepack. Enable Corepack so the pinned pnpm binary is on your PATH, then:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
```

`pnpm test` runs foundation smoke tests against built applications, unit tests and an ephemeral in-memory RLS simulation, so run `pnpm build` first. These do not replace real Supabase/security testing. Start a development server with `pnpm --filter @epelawa/main dev` (or substitute `@epelawa/news` / `@epelawa/admin`); each binds to `0.0.0.0` and defaults to port 3000. Run apps on separate ports if running concurrently. The admin intentionally responds with HTTP 503 and `no-store`; it is **not** an authenticated dashboard. No provider credentials or environment variables are needed for these shells.

The current foundation uses pnpm 10.34.9, Turborepo 2.11.10, Next.js 16.4.4, React 19.3.1 and TypeScript 5.9.3. See [the handoff](docs/13-pre-development-handoff.md) for uninstalled candidates, the three-folder layout, open decisions and launch blockers. No demo content or seeding scripts are included.

## Phase 0 documents

1. [Product requirements](docs/01-product-requirements.md)
2. [User journeys](docs/02-user-journeys.md)
3. [Sitemap](docs/03-sitemap.md)
4. [Page specifications](docs/04-page-specifications.md)
5. [Design system](docs/05-design-system.md)
6. [System architecture](docs/06-system-architecture.md)
7. [Database schema](docs/07-database-schema.md)
8. [Permissions and security](docs/08-permissions-security.md)
9. [API contracts](docs/09-api-contracts.md)
10. [Integrations](docs/10-integrations.md)
11. [Testing and acceptance](docs/11-testing-acceptance.md)
12. [Development roadmap](docs/12-development-roadmap.md)

Additional: [Pre-development handoff](docs/13-pre-development-handoff.md), [staff-access foundation](docs/14-staff-access-foundation.md), [UI research](docs/15-ui-research.md), and [audit and delivery notes](docs/16-audit-and-delivery.md). Provider names and domains in these documents are design direction or unverified dependencies, not evidence of working infrastructure.
