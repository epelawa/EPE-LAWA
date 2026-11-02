# EPE LAWA — System Architecture

**Document:** 06
**Status:** Active.
**Companion:** `10-integrations.md` (providers, deployment, observability),
`13-tech-stack.md` (choices and reasoning), `08-permissions-security.md` (trust boundaries).

---

## 1. Shape

Three Next.js applications, one pnpm/Turborepo monorepo, one Supabase project, one Google Cloud
project, and a React Native + Expo client later that consumes the same API.

```
                          ┌──────────────────┐
   browser ─── HTTPS ────► │  Cloud Load      │
                          │  Balancer + CDN  │
                          └────────┬─────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
 ┌─────────────┐          ┌─────────────┐            ┌─────────────┐
 │ main        │          │ news        │            │ admin       │
 │ epelawa.ng  │          │ news.…      │            │ admin.…     │
 │ member auth │          │ public read │            │ staff auth  │
 └──────┬──────┘          └──────┬──────┘            └──────┬──────┘
        │                        │                          │
        └──────────┬─────────────┴──────────────────────────┘
                   ▼
        ┌──────────────────────┐        ┌──────────────────┐
        │ Supabase             │        │ Google Cloud     │
        │ Postgres + Auth + RLS│        │ Storage          │
        └──────────┬───────────┘        └──────────────────┘
                   │
        ┌──────────┴──────────┬──────────────┬───────────────┐
        ▼                     ▼              ▼               ▼
   Resend                Paystack        Web Push        Cloud Logging
   (email)               (payments)      (VAPID)         + Monitoring
```

---

## 2. Application responsibilities

| App | Owns | Must never |
| --- | --- | --- |
| `main` | Member sessions, forum, businesses, orders, radio UI, Who is Who rendering | Publish article content, hold staff capability, expose service roles |
| `news` | Article rendering, categories, search, SEO surface | Authenticate a member independently, write to the database |
| `admin` | Staff session, editorial transitions, moderation, verification, order management | Serve public pages, accept a member session, render on a public host |

`news` is read-heavy and cache-first. `admin` is write-heavy and strictly `no-store`. `main` sits
between: public reads through the CDN, private reads through the server.

---

## 3. Package boundaries

```
backend/packages/
  auth/            identity verification + access decisions (pure, testable)
  editorial/       article workflow state machine (pure, no I/O)
  http-security/   CORS + CSRF primitives
  data/            typed Supabase access per domain — the only place `.from()` is called
  contracts/       zod schemas shared with the client
frontend/packages/
  ui/              components + token definitions
```

Rules:

1. **`data` is the only package that touches the database.** Route handlers and server components call
   `data`, never Supabase directly. When RLS changes, one package changes.
2. **`auth` and `editorial` are pure.** They take inputs and return decisions. No network, no clock,
   no randomness. That is how they stay testable.
3. **`contracts` is isomorphic** and contains no secrets and no server imports.
4. **`server-only`** is imported in every server module. A build that accidentally pulls one into a
   client bundle must fail, not silently ship.
5. **No circular dependencies.** `ui` does not import `data`. `contracts` imports nothing.

---

## 4. Rendering strategy per route

| Route | Strategy | Cache |
| --- | --- | --- |
| Landing, about, guidelines | Static | CDN, revalidate on deploy |
| Article | SSR + ISR | `s-maxage=60, swr=300`; purged on publish/unpublish |
| Article listing, category, tag | SSR + ISR | `s-maxage=30` |
| Search, forum, business filters | SSR, dynamic | `no-store` |
| Person, business profile | SSR + ISR | `s-maxage=300`, purged on edit |
| Cart, checkout, orders, settings | Dynamic, server-only | `private, no-store` |
| Admin (all) | Dynamic, server-only | `private, no-store` |

**Rule:** a route that can render private data is never cached publicly, and never imports a module
that could.

---

## 5. Data flows

### Publishing

```
journalist → draft (version 1)
           → submit        → state 'review'
           → editor review → approve            (different actor, enforced)
           → publisher     → articles.published_version_id = version
                              + audit_events row (same transaction)
                              → cache purge for /article/[slug] and every listing
                              → push notification job
```

A publish is one transaction. A cache purge failure is logged and retried; it is never allowed to
leave the site showing a stale published article as if nothing changed.

### Commenting

```
member session → server verifies identity (Supabase getUser)
               → RLS insert on comments with author_id = auth.uid()
               → optional moderation pre-check (banned member? rate limited?)
               → report → moderation_actions
```

### Ordering

```
member → cart (client + server re-read)
       → POST /orders  → server recomputes total from products
       → POST /payments/initialise → Paystack
       → browser redirected to Paystack
       → Paystack webhook → signature check → re-fetch → transaction:
              payments.status = 'succeeded'
              orders.status   = 'paid'
              order_status_history + audit
       → seller advances status
```

The browser return page reads state; it never writes it.

---

## 6. Trust boundaries

| Boundary | What crosses | What must be true |
| --- | --- | --- |
| Browser → server | Session cookie or bearer token, request body | Everything from the client is untrusted; validated by zod; authorisation re-derived server-side |
| Server → Supabase | Service-role key (server only) or user JWT | RLS applies to the user JWT path. Service-role paths are explicit, minimal and audited |
| Server → GCS | Signed URL or SDK call | Scope limited to one object and one operation; short expiry |
| Server → Paystack | Secret key | Server only. Never in a client bundle |
| Paystack → server | Webhook | Signature verified on the raw body before parsing |
| Server → Resend | API key | Server only |
| Browser → radio stream | Proxied or signed URL | Never the raw upstream. No mixed content |

---

## 7. Reliability

- **Nothing important lives in instance memory.** Cloud Run scales horizontally and instances die.
  Rate limit counters, sessions, queues and locks all live in Postgres or a shared store.
- **Every external call has a timeout and a failure path.** No `await fetch()` without one.
- **Degrade, do not crash.** A radio status check failure renders "unavailable", not a 500. A push
  send failure does not fail the article publish.
- **Idempotency is a database constraint**, not application logic.
- **Cron jobs** are Cloud Scheduler → a Cloud Run endpoint protected by `CRON_SECRET`, and they are
  idempotent because a retry is guaranteed eventually.

---

## 8. What is deliberately not built

No separate API server — Next.js route handlers and server actions are sufficient and avoid a second
deployment. No microservices. No message broker until a queue is genuinely needed. No GraphQL. No
second database. Each of these would be a real cost with no current benefit.
