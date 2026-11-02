# EPE LAWA

**The Voice of Epe Division.** A community, news, cultural and commerce platform for Epe Division,
Lagos State, Nigeria — editorial, forum, radio, business directory and marketplace in one place.

**Start here → [`docs/00-master-plan.md`](docs/00-master-plan.md).** It is the authority on scope and
phase order. Everything else supports it.

---

## Status

**Phase 1 — public shell, in progress.**

The planning baseline has been re-written for the five-module build and the old website-only scope is
archived. Three Next.js application shells exist and build. The staff-access foundation migration is
applied to the Supabase project. Nothing is connected to real data yet: the admin returns `503` by
design, and the public pages state honestly that content is not connected.

No demo data, no seeded records, no invented metrics. Every list route ships with a real empty state
until real records exist.

| Item | State |
| --- | --- |
| Docs | Re-baselined and current |
| Toolchain (`typecheck`, `build`, `test`) | Green — 28/28 tests |
| Public shell | In progress |
| News engine | Not started |
| Radio | Blocked on the stream URL (B1) |
| Providers (Cloud Run, GCS, Resend, Paystack) | Not configured |
| Native app (React Native + Expo) | Deferred by decision |

---

## Local setup

Requires Node.js 22 and pnpm 10.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
```

`pnpm test` spawns the built apps against real HTTP responses, so **run `pnpm build` first**. The
in-memory PGlite RLS simulation in the suite is a fast local check — it is **not** proof that RLS
works against real Supabase.

Run one app:

```sh
pnpm --filter @epelawa/main dev     # also @epelawa/news, @epelawa/admin
```

Each binds `0.0.0.0` on port 3000 — use different ports when running more than one. The admin responds
`503` with `no-store` and `noindex` until authentication and authorisation are real. That is deliberate;
do not remove it to make a demo work.

No provider credentials are needed to build or run the shells.

### Build note

Both `next build` and the test runner are configured for portability rather than speed:

- Builds use `next build --webpack`. Turbopack cannot read the symlinks pnpm creates on some
  filesystems, which breaks the build outright there.
- Tests run through `tsx`. Some Node 22 builds are shipped without experimental TypeScript stripping,
  so `node --experimental-strip-types` fails on files that import `.ts` modules.

Both are documented in [`docs/13-tech-stack.md`](docs/13-tech-stack.md).

---

## Documentation

| # | Document |
| --- | --- |
| 00 | [Master plan](docs/00-master-plan.md) — scope, phases, blockers |
| 01 | [Product requirements](docs/01-product-requirements.md) |
| 02 | [User journeys](docs/02-user-journeys.md) |
| 03 | [Sitemap and information architecture](docs/03-sitemap.md) |
| 04 | [Page specifications](docs/04-page-specifications.md) |
| 05 | [Design system](docs/05-design-system.md) |
| 06 | [System architecture](docs/06-system-architecture.md) |
| 07 | [Database schema](docs/07-database-schema.md) |
| 08 | [Permissions and security](docs/08-permissions-security.md) |
| 09 | [API contracts](docs/09-api-contracts.md) |
| 10 | [Integrations and deployment](docs/10-integrations.md) |
| 11 | [Testing and acceptance](docs/11-testing-acceptance.md) |
| 12 | [Development roadmap](docs/12-development-roadmap.md) |
| 13 | [Tech stack](docs/13-tech-stack.md) |
| 14 | [Implementation tracker](docs/14-tracker.md) |
| 15 | [UI research register](docs/15-ui-research.md) |

Superseded documents are kept in [`docs/archive/`](docs/archive/) with a banner explaining why.

---

## Repository layout

```
frontend/apps/{main,news,admin}   three Next.js applications
frontend/packages/                shared browser-safe UI and contracts
frontend/tests/                   HTTP, unit and integration tests
backend/packages/                 auth, editorial, http-security, data access
backend/supabase/migrations/      reviewed SQL — the schema source of truth
docs/                             planning, architecture, operations
```

---

## Contributing

Read [`AGENTS.md`](AGENTS.md) first. It carries the definition of done: `typecheck`, `build` and
`test` must pass, responsive and accessible states must exist, then commit and push. One logical
change per commit. Never commit a red tree.
