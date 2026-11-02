# EPE LAWA — API Contracts

**Document:** 09
**Status:** Design. Nothing here is implemented or deployed.

---

## 1. Conventions

- Base path `/api/v1` on the host that owns the resource.
- JSON in and out. `application/json; charset=utf-8`.
- ISO 8601 UTC timestamps. IDs are UUIDs. Money is an integer in **kobo**, field name ends `_kobo`.
- Success: `{ data, meta? }`. Error: `{ error: { code, message, fields? }, requestId }`.
- Never leak stack traces, SQL, provider payloads, private review notes, or another user's data.
- Pagination: cursor-based, `?cursor=&limit=` (default 20, max 50). Response carries `meta.nextCursor`.
- Validation: zod schema on the server, the same schema shared with the client. Unrecognised keys are
  rejected, not ignored.

### Status codes

| Code | Use |
| --- | --- |
| 200 | Read, or a completed transition |
| 201 | Resource created |
| 202 | Accepted for async work (a notification queued, a payment initialised) |
| 204 | Completed, no body |
| 400 | Malformed request |
| 401 | No valid session |
| 403 | Authenticated, not permitted — only where existence is not secret |
| 404 | Missing **or** private. Do not use 403 for private content |
| 409 | Version conflict, duplicate handle, duplicate review, slug collision |
| 422 | Valid shape, invalid content (field-level detail returned) |
| 429 | Rate limited, `Retry-After` set |
| 500 | Server fault, opaque message, `requestId` for correlation |
| 503 | Admin closed / dependency unavailable. Must be honest, never a pretend success |

---

## 2. Public reads

| Method | Path | Host | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/articles` | news | `?category=&tag=&author=&cursor=&limit=`. Published only |
| GET | `/api/v1/articles/{slug}` | news | Current published snapshot. Draft or archived → 404 |
| GET | `/api/v1/search?q=` | news | Postgres FTS, published only |
| GET | `/api/v1/categories` | news | Active categories with published counts |
| GET | `/api/v1/authors/{slug}` | news | Author + their published articles |
| GET | `/api/v1/people` | main | `?office=&community=&q=`. Published only |
| GET | `/api/v1/people/{slug}` | main | Profile + offices + public sources |
| GET | `/api/v1/businesses` | main | `?category=&area=&q=`. Published only |
| GET | `/api/v1/businesses/{slug}` | main | + reviews (paginated) |
| GET | `/api/v1/products` | main | `?business=&category=&q=` |
| GET | `/api/v1/radio` | main | Status, schedule, current programme — never a raw stream URL |
| GET | `/api/v1/episodes` | main | Archive, paginated |

**Public response shape — article summary**

```ts
{
  slug: string,
  title: string,
  summary: string | null,
  author: { name: string, slug: string },
  category: { label: string, slug: string },
  publishedAt: string,
  updatedAt: string | null,
  image: { url: string, alt: string, credit: string } | null
}
```

Never include `id`, `versionId`, `ownerId`, `revision`, review notes, or unpublished fields.

---

## 3. Member endpoints

All require a member session. All are rate limited per §5.

| Method | Path | Body / query | Notes |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/signup` | `{ email, password, handle, displayName }` | 201. Same response for a taken and a free email until verification |
| POST | `/api/v1/auth/signin` | `{ email, password }` | 200 + cookie. Generic failure message |
| POST | `/api/v1/auth/signout` | — | 204, clears cookies |
| POST | `/api/v1/auth/reset` | `{ email }` | 202 always, existent or not |
| POST | `/api/v1/auth/reset/confirm` | `{ token, password }` | 200 or 410 if expired |
| GET | `/api/v1/me` | — | Own profile |
| PATCH | `/api/v1/me` | `{ displayName?, bio? }` | 422 with field errors |
| DELETE | `/api/v1/me` | `{ password, confirm: "DELETE" }` | 204. Anonymises, destroys sessions |
| POST | `/api/v1/comments` | `{ articleSlug, parentId?, body }` | 201 |
| PATCH | `/api/v1/comments/{id}` | `{ body }` | Own only |
| DELETE | `/api/v1/comments/{id}` | — | Own only, soft delete |
| POST | `/api/v1/reports` | `{ targetType, targetId, reason, note? }` | 201 |
| POST | `/api/v1/forum/threads` | `{ categoryId, title, body, poll? }` | 201 |
| POST | `/api/v1/forum/threads/{id}/posts` | `{ body, quotePostId? }` | 201 |
| POST | `/api/v1/forum/polls/{id}/vote` | `{ optionId }` | 201 or 409 if already voted |
| POST | `/api/v1/businesses` | business payload | 201, status `submitted` |
| PATCH | `/api/v1/businesses/{id}` | owner-editable fields | Own only |
| POST | `/api/v1/businesses/{id}/reviews` | `{ rating, body }` | 201. 409 on duplicate |
| PATCH | `/api/v1/reviews/{id}` | `{ rating?, body? }` | Own only |
| POST | `/api/v1/cart/items` | `{ productId, quantity }` | 201 |
| POST | `/api/v1/orders` | `{ items[], contact, delivery }` | 201. **Prices ignored; recomputed** |
| GET | `/api/v1/orders` | `?cursor=` | Own only |
| GET | `/api/v1/orders/{id}` | — | Own only, 404 otherwise |
| POST | `/api/v1/orders/{id}/cancel` | — | Only while `pending` |

---

## 4. Payments — the only 3 endpoints that matter

### `POST /api/v1/payments/initialise`

```ts
// request
{ orderId: string }
// server does: load order → assert buyer → assert status 'pending'
//              → recompute total from products → call Paystack /transaction/initialize
//              → insert payments row (status 'initialised', provider_reference unique)
// response 201
{ authorizationUrl: string, reference: string }
```

The client never supplies an amount. If it sends one and it differs, the request is rejected **and
logged as a tampering attempt.**

### `GET /api/v1/payments/verify?reference=`

Used only to render the post-checkout page. It may show "processing" but it must never be the thing
that marks an order paid.

### `POST /api/v1/webhooks/paystack`

```ts
// 1. Read the RAW body (no JSON parse first)
// 2. Verify x-paystack-signature = HMAC-SHA512(rawBody, PAYSTACK_WEBHOOK_SECRET)
// 3. Insert into payment_events; unique on event_id → duplicate means already handled, return 200
// 4. Re-fetch the transaction from Paystack by reference (do not trust the event body's amount)
// 5. Compare amount and currency against the server-side order
// 6. In one transaction: update payments, set orders.status='paid', insert order_status_history,
//    append audit_events
// 7. Return 200 fast. Everything slow happens after the response, or in a queued job.
```

Signature failure → 401, no state change, logged. Amount mismatch → mark `payments.status='failed'`,
alert, do not fulfil.

---

## 5. Staff endpoints

Require a staff session **and** the named capability. `-` means the capability is checked at the
action boundary, not the route.

| Method | Path | Capability |
| --- | --- | --- |
| POST | `/api/v1/staff/auth/signin` | — |
| POST | `/api/v1/staff/auth/signout` | — |
| GET | `/api/v1/staff/articles` | `article.create` (own scope) |
| POST | `/api/v1/staff/articles` | `article.create` |
| PATCH | `/api/v1/staff/articles/{id}/draft` | `article.create` \| `article.review` |
| POST | `/api/v1/staff/articles/{id}/submit` | `article.create` |
| POST | `/api/v1/staff/articles/{id}/review` | `article.review` |
| POST | `/api/v1/staff/articles/{id}/approve` | `article.review` |
| POST | `/api/v1/staff/articles/{id}/publish` | `article.publish` |
| POST | `/api/v1/staff/articles/{id}/unpublish` | `article.unpublish` |
| GET | `/api/v1/staff/articles/{id}/versions` | `article.review` \| `article.publish` |
| POST | `/api/v1/staff/media/upload-url` | `article.create` |
| POST | `/api/v1/staff/media/{id}/promote` | `article.publish` |
| POST | `/api/v1/staff/people/{id}/verify` | `people.manage` |
| POST | `/api/v1/staff/businesses/{id}/verify` | `business.review` |
| POST | `/api/v1/staff/moderation/{id}/action` | `moderation.review` |
| PATCH | `/api/v1/staff/orders/{id}/status` | `order.manage` |
| GET | `/api/v1/staff/audit` | `audit.read` |

**Every transition takes `expectedRevision`.** A stale revision returns 409, never a silent overwrite.

---

## 6. Concurrency and idempotency

| Operation | Guard |
| --- | --- |
| Article transition | `expectedRevision` compare-and-swap; 409 on mismatch |
| Payment initialise | unique `provider_reference`; repeat call returns the existing authorization |
| Webhook | unique `event_id`; repeat returns 200 without side effects |
| Order create | client `Idempotency-Key` header, stored 24 h |
| Business review | unique `(business_id, author_id) where deleted_at is null`; 409 |
| Poll vote | primary key `(poll_id, voter_id, option_id)`; 409 |

---

## 7. Caching

| Response | Header |
| --- | --- |
| Published article | `public, s-maxage=60, stale-while-revalidate=300` |
| Article listing | `public, s-maxage=30` |
| `/api/v1/me`, orders, admin | `private, no-store` |
| Payments | `no-store` |
| Any staff response | `private, no-store` |

`unpublish` must actively purge, not wait for the TTL. A test asserts the article is gone on the next
request after unpublish, not after 60 seconds.

---

## 8. Versioning

`/api/v1` until the first external consumer exists. Breaking changes get `/api/v2`; the old path is
kept for 90 days with a `Deprecation` header. There is no external consumer today, so v1 may change
freely — but the shapes above are what the frontend is built against, so changing them is a
coordinated change across client and server in the same commit.
