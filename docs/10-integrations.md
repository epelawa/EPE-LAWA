# EPE LAWA — Integrations and Deployment

**Document:** 10
**Status:** Design and plan. **No provider is configured.** Nothing here is verified.

---

## 1. Provider map

| Concern | Provider | Status |
| --- | --- | --- |
| Compute (web) | Google Cloud Run | Not configured |
| CDN / TLS / LB | Cloud CDN + global HTTPS load balancer | Not configured |
| Object storage | Google Cloud Storage | Not configured |
| Database + auth | Supabase (Postgres, Auth, RLS) | Project exists; only the staff migration applied |
| Transactional email | Resend | Owner-specified; not configured |
| Payments | Paystack | Not configured |
| Push (web) | Web Push + VAPID | Planned |
| Push (native) | Expo Notifications → FCM/APNs | Deferred with the native app |
| Radio stream | Client-supplied direct stream | **Not supplied — B1** |
| Maps | Google Maps Platform | Deferred (map navigation is not in scope) |
| Error tracking | Cloud Error Reporting; Sentry optional | Not configured |
| Analytics | Consent-gated aggregate only | Not configured |

---

## 2. Google Cloud topology

```
                    users
                      │ HTTPS
                      ▼
        ┌─────────────────────────────┐
        │ Global HTTPS load balancer  │  TLS, HSTS, one static IP
        │  + Cloud CDN                │
        └──────┬───────┬───────┬──────┘
               │       │       │
     epelawa.ng│  news.│  admin│
               ▼       ▼       ▼
        ┌────────────────────────────┐
        │  Cloud Run (3 services)    │  one container per app,
        │  epelawa-main              │  min-instances 0 (dev) / 1 (prod)
        │  epelawa-news              │  concurrency 80
        │  epelawa-admin             │  admin: IAP optional, always staff-cookie gated
        └───────┬──────────┬─────────┘
                │          │
                ▼          ▼
        ┌──────────┐  ┌─────────────┐
        │ Supabase │  │ GCS buckets │
        │ Postgres │  │ public /    │
        │ + Auth   │  │ private     │
        └──────────┘  └─────────────┘
                │
                ▼
        ┌───────────────┐   ┌──────────┐   ┌──────────────┐
        │ Cloud Logging │   │ Resend   │   │  Paystack    │
        │ + Monitoring  │   │          │   │  (webhooks)  │
        └───────────────┘   └──────────┘   └──────────────┘
```

**Why Cloud Run and not App Engine or GKE:** container parity with local, scale to zero, no cluster to
operate, per-request billing. GKE is overkill for three Next.js apps. App Engine has an opinionated
runtime that has already bitten this project once (a Node version mismatch between local and the
platform).

**Cloud Run constraints to design around**
- Request timeout default 300 s — fine for SSR, not for long jobs.
- Instances are ephemeral. **No in-memory rate limiting, no in-memory sessions, no in-memory queues.**
- CPU is throttled outside a request unless CPU-always-allocated is set. Background work needs Cloud
  Scheduler → Cloud Run job or a published Pub/Sub message.

---

## 3. Supabase

- Region: `eu-west-3` (Paris) — the existing project. Latency to Lagos is acceptable; changing region
  later requires a migration, so decide now.
- Auth: email + password for both axes. Email verification on for members; staff accounts are created
  by an administrator and must verify on first sign in.
- RLS: on for every exposed table. `anon` sees only the published projections.
- The service-role key exists **only** in Cloud Run secrets. It never appears in a client bundle, a
  test fixture, a log or a chat message.
- Backups: Supabase daily backups on a paid plan. **Verify the plan.** A free-tier project has no
  point-in-time recovery and no guaranteed retention.

---

## 4. Google Cloud Storage

| Bucket | Access | Contents |
| --- | --- | --- |
| `epelawa-public` | Public read via Cloud CDN | Published article images, logos, episode thumbnails |
| `epelawa-private` | No public access | Draft images, source documents, member avatars pending review, verification evidence |

- Objects are private during ingest. Promotion to public is an explicit, audited action.
- The database stores `object_key`, never a full URL. URLs are constructed per environment.
- Upload flow: server issues a short-lived signed PUT URL with a content-type and size constraint →
  client uploads directly → server head-objects the result to verify size and MIME before accepting.
  **Never trust the client's declared content type.**
- Lifecycle: orphaned private objects older than 30 days are deleted by a lifecycle rule.
- Every image is re-encoded server-side before promotion. No SVG uploads. EXIF stripped.

---

## 5. Resend

- Transactional only: verification, password reset, order receipt, contact form notification.
- Sender domain must be verified with SPF, DKIM and DMARC. A `gmail.com` sender will be throttled and
  will land in spam.
- Supabase Auth can use Resend SMTP for its own emails — configure it so verification mail comes from
  the project domain, not `supabase.io`.
- Marketing and newsletters are **not** in scope. Consent-based broadcast needs its own decision.
- Every send is logged with the template name, the recipient hash and the provider message id — never
  the body.

---

## 6. Paystack

- NGN only. Amounts in kobo. Integer arithmetic end to end.
- Webhook endpoint: `https://epelawa.ng/api/v1/webhooks/paystack`, verified by HMAC-SHA512 over the raw
  body using the webhook secret.
- **Re-fetch the transaction from Paystack's API by reference.** Do not trust the amounts or status in
  the event payload.
- Unique `event_id` in `payment_events` provides replay safety.
- Settlements go to the business account. **Payouts to individual businesses are out of scope.**
- Test mode keys in every non-production environment, and a separate test recipient for mail.

---

## 7. Web Push

- VAPID key pair generated once; public key shipped to the client, private key in Cloud Run secrets.
- Flow: member grants permission → `PushManager.subscribe` → POST endpoint + keys to
  `/api/v1/notifications/subscribe` → stored in `push_subscriptions`.
- A send job reads subscriptions, batches by category preference, and marks `failed_count` on 410 Gone.
  Three failures and the subscription is deleted.
- **iOS Safari only supports Web Push when the site is installed to the home screen.** The settings
  screen says this plainly instead of showing a broken toggle.
- No notification is sent without an explicit opt-in per category.

---

## 8. Radio

- The player never receives the raw upstream URL. The server proxies or signs it, so the stream can be
  swapped or protected without shipping a new client.
- A status check runs every 60 seconds against the configured health URL and writes
  `stream_status_checks`. The UI reads the newest row.
- `LIVE` requires `ok = true` and `checked_at > now() - interval '60 seconds'`. Anything else is
  rendered as unavailable or unknown.
- Cross-origin and mixed-content behaviour must be tested in a real browser. An `http://` stream on an
  `https://` page will be blocked by the browser and there is no workaround.
- **B1 blocks launch:** no supplied stream, no format, no embedding permission.

---

## 9. Environments

| Environment | Purpose | Supabase | Data |
| --- | --- | --- | --- |
| Local | Development | local Supabase CLI, or a dedicated dev project | Synthetic only, ephemeral |
| Preview | PR review | dedicated preview project | Synthetic only. **Never production data** |
| Production | Live | `eu-west-3` project | Real |

Rules: separate credentials per environment; no production data in preview; no preview URL indexed
(`X-Robots-Tag: noindex`, `Disallow: /`); preview deploys are never publicly linked.

---

## 10. Deployment pipeline

```
push to main
   │
   ├─ GitHub Actions: install → typecheck → build → test
   │     └─ any failure stops here
   │
   ├─ build container images (multi-stage, node:22-alpine, non-root user)
   │
   ├─ push to Artifact Registry
   │
   ├─ deploy to Cloud Run (revision, no traffic)
   │
   ├─ smoke test the revision URL
   │
   └─ shift 100% traffic  ── or ── roll back to the previous revision
```

- Migrations run as a **separate, explicit step** before the app deploy, never inside the container
  start-up. Two app revisions must tolerate one schema version either side.
- Traffic splitting allows a canary: 10% for 10 minutes, then 100%.
- Rollback is a traffic shift to the previous revision — tested, not assumed. A schema migration is
  **not** automatically reversible.

---

## 11. Observability

| Signal | Where | Alert |
| --- | --- | --- |
| 5xx rate | Cloud Monitoring | > 1% for 5 min |
| Auth failure spike | Cloud Logging metric | > 50 / 5 min |
| Payment webhook failure | structured log | any 4xx/5xx from the handler |
| Stream status down | `stream_status_checks` | > 3 consecutive failures |
| Order stuck in `pending` > 2 h | query | daily digest |
| Error rate in browser | Sentry (optional) | new issue |

Logs never contain: passwords, tokens, full card data, full contact messages, or member emails in
plain text (hash them for correlation).

---

## 12. Backup and recovery

| Asset | Method | RPO | Tested |
| --- | --- | --- | --- |
| Postgres | Supabase daily backup + weekly logical dump to GCS | 24 h | Not yet |
| Storage | GCS Object Versioning on the private bucket | per-object | Not yet |
| Secrets | Secret Manager versions | n/a | Not yet |
| Config | Terraform or checked-in `gcloud` scripts | per commit | Not yet |

A restore drill must be performed and recorded before Phase 9 sign-off. "Backups are enabled" is not
a recovery plan.
