# EPE LAWA — Tech Stack

**Document:** 13 — decisions record
**Status:** Approved working stack. Deviating from this table requires the developer's explicit
agreement, recorded here.
**Last revised:** 2 November 2026 (re-baseline: Google Cloud hosting, React Native + Expo for native,
Paystack for payments).

---

## 1. The stack at a glance

| Layer | Choice | Version target |
| --- | --- | --- |
| Language | TypeScript, `strict: true` | 5.9 |
| Package manager | pnpm workspaces | 10.34 |
| Monorepo runner | Turborepo | 2.11 |
| Runtime (dev/CI) | Node.js 22 LTS | 22.x |
| Web framework | Next.js App Router | 16.4 |
| UI runtime | React | 19.3 |
| Styling | Tailwind CSS + CSS custom properties for tokens | 4.x |
| Components | shadcn/ui primitives (copied in, not a dependency) | current |
| Icons | lucide-react | current |
| Motion | framer-motion, used sparingly | current |
| Dates | date-fns | 4.x |
| Validation | zod, shared client + server | 4.x |
| Server state | TanStack Query | 5.x |
| Client state | Zustand | 5.x |
| Forms | react-hook-form + zod resolver | current |
| Rich text | Tiptap | 3.x |
| Auth | Supabase Auth (staff **and** members) | current |
| Database | Supabase Postgres + Row Level Security | 15 |
| Object storage | Google Cloud Storage | current |
| Email | Resend | current |
| Payments | Paystack | current |
| Hosting | Google Cloud Run | current |
| CDN / edge | Cloud CDN + global HTTPS load balancer | current |
| Native shell | React Native + Expo (expo-router, EAS Build) | SDK 54+ |
| Push — web | Web Push (VAPID) | n/a |
| Push — native | Expo Notifications → FCM / APNs | n/a |
| Search | Postgres full-text search first | n/a |
| Testing | `node:test` + `tsx`, Playwright for E2E | current |
| CI | GitHub Actions | n/a |
| Observability | Cloud Logging + Error Reporting; Sentry optional | n/a |

---

## 2. Decisions and why

### 2.1 Next.js App Router, not a SPA

Server components keep the first paint cheap on a slow Android connection — the audience is not on
fibre. Server actions and route handlers give us one place to enforce authorisation. SEO matters for a
news publication; a client-rendered SPA needs extra machinery to match.

**Consequence:** the boundary between server and client is a security boundary. Server-only modules
must never be imported into a client component. `server-only` is used to enforce it.

### 2.2 Three applications, one repo

`main` (the platform), `news` (the publication), `admin` (staff and moderators). Separate apps because
the news publication needs its own host, its own cache behaviour and its own SEO surface; the admin
must be able to sit behind a stricter cookie policy and a stricter deploy cadence.

**Consequence:** public sessions and staff sessions are deliberately separate. A member cookie must
never be valid on the admin host, and a staff cookie must never be valid on the public host.

### 2.3 Supabase, not a hand-rolled backend

Postgres is the right database for this domain — relational content, orders, moderation trails, full
text search. Supabase gives us Postgres, an auth service, and RLS in one place. RLS means a database
policy enforces access even if an API route is wrong, which matters when several agents and a
developer touch the same code.

**Consequence:** RLS is not optional and not decoration. Every exposed table has policies, and negative
tests are written against them. A server-role key never leaves the server.

### 2.4 Google Cloud Run, not Vercel

Cloud Run runs the same container image locally and in production, which means "works on my machine"
is a meaningful statement. It supports long-running requests, background work and arbitrary Node
dependencies without a platform runtime that differs from local. Cost is per-request and scales to
zero. Cloud CDN handles static asset and cache behaviour; the global HTTPS load balancer terminates
TLS for all three hosts.

**Consequence:** we own more of the deployment. Dockerfiles, health checks, IAM and secret injection
are ours. Terraform or `gcloud` scripts must be checked in so the environment is reproducible.

### 2.5 Google Cloud Storage, not Cloudflare R2

Moving storage to the same vendor as compute removes a cross-cloud egress bill, a second IAM system
and a second set of credentials. Signed URLs, lifecycle rules and IAM conditions are all first-class.

**Reversal cost:** low. The storage adapter is written behind an interface; R2 is S3-compatible and
swappable if egress cost becomes a problem later.

### 2.6 Paystack, not Stripe

The market is Nigeria. Paystack settles in NGN, supports cards, bank transfer and USSD, and is the
provider Nigerian users and businesses already trust. Stripe does not operate as a merchant of record
for NGN settlements the way this project needs.

**Consequence:** webhook signature verification, idempotency on `reference`, and server-side amount
recomputation are mandatory, not nice-to-have. See `08-permissions-security.md` §7.

**Alternative on the table:** Flutterwave. Only if Paystack onboarding is refused.

### 2.7 React Native + Expo for native, not Capacitor

Explicitly rejected: Capacitor, Cordova, or any WebView wrapper. A wrapped website is not a native
app — it fails store review for thin content, cannot do reliable background push, and feels wrong in
the hand. The client asked for an app; we deliver a real one, later.

Expo gives us managed builds, over-the-air updates for JS-only changes, and one codebase for Android
and iOS. **expo-router** for navigation, **expo-notifications** for push, **expo-secure-store** for
tokens. The app talks to the same Supabase backend and the same API contracts as the web app.

**Consequence for auth:** the native client cannot use the admin's httpOnly cookie session. It uses
Supabase's native session with refresh tokens held in `expo-secure-store`, never in AsyncStorage and
never in plain storage. This is why the auth model is designed as two axes from the start rather than
bolted on later.

### 2.8 Postgres full-text search before a search service

One growing publication and a directory do not justify Typesense or Meilisearch yet. Postgres
`tsvector` with a GIN index handles this volume, and it keeps one source of truth. The search module
is written behind an interface so a dedicated engine can replace it without touching callers.

**Upgrade trigger:** p95 search latency above 300 ms, or the need for typo tolerance and faceting
across the whole directory.

### 2.9 Web Push (VAPID) for the web app

The PRD asks for "push notifications even when the app is closed". On the web, that is Service Worker
+ Web Push with VAPID keys, delivered through FCM/APNs endpoints. It works on Android Chrome, desktop
Chrome/Firefox/Edge. **It does not work on iOS Safari unless the site is installed to the home
screen** — that is an Apple platform rule, not a bug. We state it honestly in the notification
settings UI rather than pretending otherwise.

Native push arrives with the Expo shell.

### 2.10 Testing: `node:test` + Playwright

The existing suite already runs on `node:test` through `tsx`, which keeps the dependency count low.
Playwright covers the journeys that matter end-to-end: sign in, publish an article, post in the forum,
place an order. Vitest is only introduced if a component-test need actually appears — not by default.

**Note:** the local sandbox runs Node builds that lack experimental TypeScript stripping, which is why
the test script uses `tsx` rather than `node --experimental-strip-types`. That is deliberate and
portable.

---

## 3. Repository shape

```
epe-lawa/
├── frontend/
│   ├── apps/
│   │   ├── main/          @epelawa/main
│   │   ├── news/          @epelawa/news
│   │   └── admin/         @epelawa/admin
│   ├── packages/
│   │   ├── ui/            shared components + tokens
│   │   └── contracts/     zod schemas shared client/server
│   └── tests/
├── backend/
│   ├── packages/
│   │   ├── auth/          identity + access decisions
│   │   ├── editorial/     article workflow model
│   │   ├── http-security/ CORS + CSRF primitives
│   │   └── data/          typed Supabase access per domain
│   ├── supabase/
│   │   ├── migrations/    reviewed SQL, source of truth
│   │   └── policies/      documented RLS intent
│   └── tests/
├── docs/
├── scripts/               deploy, seed-free ops, backup drills
├── .github/workflows/     CI
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 4. Environment variables

Names only. Values live in Cloud Run secret bindings or Secret Manager. Never in the repo.

| Variable | Used by | Public? |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | main, news | yes |
| `NEXT_PUBLIC_NEWS_URL` | main, news | yes |
| `NEXT_PUBLIC_ADMIN_URL` | admin | yes |
| `NEXT_PUBLIC_SUPABASE_URL` | all | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all | yes — RLS is what protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | **never** |
| `GCS_BUCKET_PUBLIC` | server only | no |
| `GCS_BUCKET_PRIVATE` | server only | no |
| `GCS_PROJECT_ID` | server only | no |
| `RESEND_API_KEY` | server only | **never** |
| `PAYSTACK_SECRET_KEY` | server only | **never** |
| `PAYSTACK_WEBHOOK_SECRET` | server only | **never** |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | main | yes |
| `VAPID_PUBLIC_KEY` | main | yes |
| `VAPID_PRIVATE_KEY` | server only | **never** |
| `RADIO_STREAM_URL` | server only | no — the player uses a proxied or signed URL |
| `CRON_SECRET` | server only | **never** |

`.env.example` is committed with all names and no values. A new variable without an `.env.example`
entry is an incomplete change.

---

## 5. What is deliberately not in the stack

| Not used | Why |
| --- | --- |
| Capacitor / Cordova / WebView wrapper | Rejected by the developer. Not a native app. |
| Vercel | Replaced by Google Cloud Run. |
| Cloudflare R2 | Replaced by GCS; kept as documented fallback. |
| Firebase / Firestore | Supabase Postgres already serves the need; two databases is worse. |
| MongoDB | The data is relational: articles, versions, orders, moderation. |
| Prisma | Supabase generates types from the schema; an ORM adds a layer that fights RLS. |
| `moment.js` | `date-fns`. |
| Full `lodash` | Native language features. |
| Redux | Zustand + TanStack Query. |
| A CSS-in-JS runtime | Tailwind + tokens, for bundle size on slow connections. |
| Strapi / Sanity / Contentful | The editorial workflow is a core product difference; it is ours. |
| Algolia | Postgres FTS until there is evidence it is insufficient. |
| Auth0 / Clerk | Supabase Auth is already in the stack and RLS wants the same identity. |

---

## 6. Version pinning policy

- Exact versions in `package.json` for the root toolchain (`pnpm`, `turbo`, `typescript`).
- Caret ranges for application dependencies, lockfile committed and `--frozen-lockfile` in CI.
- Node version pinned by `.nvmrc` and in the Cloud Run container image. Never rely on a platform
  default — a mismatch between local and production Node has already caused one broken build here.
- Upgrade one major at a time, on a branch, with the full check suite green before merge.
