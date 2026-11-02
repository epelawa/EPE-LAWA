# EPE LAWA — Permissions and Security

**Document:** 08
**Status:** Design. Only the staff-access foundation is applied. Nothing here is verified against a
real Supabase project yet.
**Companion:** `07-database-schema.md`.

---

## 1. Two identity axes

This is the single most important structural decision. Getting it wrong means rebuilding auth twice.

| | Staff identity | Member identity |
| --- | --- | --- |
| Who | Journalists, editors, publishers, moderators, administrators | The public |
| Table | `staff_profiles` + `staff_capability_grants` | `profiles` |
| Session | httpOnly `__Host-` cookie, admin host only | httpOnly cookie on public hosts; secure store on native |
| Host | `admin.epelawa.ng` only | `epelawa.ng`, `news.epelawa.ng` |
| Grant | Explicit capability rows | Account existence only |
| Failure | 503 (admin closed) | 401 / redirect to sign in |

**Rules.**

1. A member account grants nothing on the admin host. The admin host rejects any session without a
   current capability grant, regardless of who the user is.
2. A staff cookie is never valid on the public hosts. Public pages do not read staff session.
3. A staff member who also wants to comment registers a separate member account. This is deliberate —
   it keeps moderation actions and public speech visually distinct, and it keeps the capability
   surface small.
4. Both axes use Supabase Auth for the credential. Neither trusts a JWT claim for authorisation; the
   capability or profile row is read on every protected request.

---

## 2. Capability matrix

**Legend:** ✓ permitted · O own resources only · R restricted to assigned scope · — denied.

| Action | anon | member | verified member | business owner | moderator | journalist | editor | publisher | admin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Read published article | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read draft / version history | — | — | — | — | — | O | R | R | R |
| Create draft | — | — | — | — | — | ✓ | ✓ | ✓ | R |
| Review / request revision | — | — | — | — | — | — | ✓ | ✓ | R |
| Approve | — | — | — | — | — | — | ✓ | ✓ | R |
| Publish / unpublish | — | — | — | — | — | — | — | ✓ | R |
| Manage categories / tags / authors | — | — | — | — | — | — | ✓ | ✓ | R |
| Manage media | — | — | — | — | — | R | R | R | R |
| Manage radio config | — | — | — | — | — | — | — | — | R |
| Read Who is Who drafts | — | — | — | — | — | — | ✓ | ✓ | R |
| Verify a person / business | — | — | — | — | — | — | — | — | R |
| Comment | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create forum thread / post | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Vote in a poll | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Report content | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Moderate (hide / lock / ban) | — | — | — | — | ✓ | — | — | — | R |
| Submit own business | — | — | — | ✓ | — | — | — | — | — |
| Publish a business | — | — | — | — | — | — | — | — | R |
| Review a business | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Place an order | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| See any order (not own) | — | — | — | — | — | — | — | — | R |
| Advance an order status | — | — | — | O | — | — | — | — | R |
| Read audit log | — | — | — | — | R | — | — | — | R |
| Manage staff | — | — | — | — | — | — | — | — | ✓ |

`R` is never blanket. Each capability is a row; each is checked at the action boundary, not at the
route.

---

## 3. Enforcement — where, and in what order

Every protected operation passes four gates. All four, in this order, every time.

```
1. Session verified            → Supabase Auth getUser(), never getSession(), never a JWT claim
2. Identity mapped             → staff_profiles row with is_active = true, or profiles row not deleted
3. Capability checked          → explicit grant row, read fresh, never cached across requests
4. Resource authorisation      → does this actor own / moderate / administer this specific row?
```

Then the **database repeats gates 3 and 4 in RLS.** The application check gives a good error message;
the RLS policy is the actual boundary. If the two disagree, RLS wins and the application has a bug.

**A hidden button is not authorisation.** A disabled input is not authorisation. A route that returns
403 for a valid member is a bug if the member is allowed.

---

## 4. RLS policy intent by table

| Table | anon | member | staff |
| --- | --- | --- | --- |
| `published_articles` (view) | `select` where published | same | same |
| `articles`, `article_versions` | — | — | `select` where owner or `article.review` / `article.publish` |
| `comments` | `select` where `state='visible'` | `insert` where `author_id = auth.uid()`; `update`/`delete` own | `update state` with `moderation.review` |
| `comment_reports` | — | `insert` own | `select`/`update` with `moderation.review` |
| `forum_*` read | `select` where not hidden | same | same |
| `forum_posts` write | — | `insert`/`update` own, blocked when banned | moderator `update state` |
| `profiles` | `select` public columns via view | `update` own | `select` all with `admin.access` |
| `businesses` | `select` where `status='published'` | `select` own regardless of status | full with capability |
| `business_reviews` | `select` not deleted | `insert`/`update` own | `update state` with capability |
| `orders`, `payments` | — | `select` own only | `select` with capability; **no writes for anyone** |
| `people*` | `select` where `status='published'` | same | per capability |
| `audit_events` | — | — | `select` with `audit.read`; **no update, no delete** |
| `staff_*` | — | — | `select` own only (existing policy) |

Writes to `orders`, `payments`, `payment_events` and any publish transition happen through
`security definer` functions with a fixed `search_path`, an explicit caller check, and `revoke all`
from `public` before `grant execute` to the specific role. Function-level security is tested in
negative tests, not assumed.

---

## 5. Session and cookie rules — web

- Cookie name `__Host-epelawa-<scope>`; `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`.
- Access token lifetime short; refresh token rotated on use; reuse detection revokes the family.
- Every response that touches a session sends `Cache-Control: private, no-store`.
- `Origin` checked against an exact allowlist on every mutating request, plus a 32-byte CSRF token in
  a cookie and a matching header compared in constant time. Both already exist in
  `backend/packages/http-security` — wire them, do not reimplement.
- Sign-in and sign-out are POST, never GET.
- Redirect targets are literal allowlisted paths. The existing `safeAdminRedirect` is the model.

---

## 6. Session and tokens — native (future)

- Tokens in `expo-secure-store` (Keychain / EncryptedSharedPreferences). **Never** AsyncStorage, never
  a plain file, never a global JS variable that survives a screenshot.
- No cookie is used. The API must therefore accept a bearer token for member routes — which means
  CSRF does not apply, but origin checks do not protect either. Bearer tokens carry their own risk, so:
  short access lifetime, refresh rotation, device binding recorded, and revocation on logout.
- The admin host never accepts a bearer token from the native app. Staff must use the web admin.

---

## 7. Money

| Rule | Consequence if broken |
| --- | --- |
| Amount recomputed server-side from `products.price_kobo` | Attacker buys a ₦50,000 item for ₦50 |
| Webhook signature verified on the raw body before parse | Forged "payment succeeded" |
| `payments.provider_reference` unique | Duplicate charge on retry |
| `payment_events.event_id` unique | Replayed webhook double-fulfils an order |
| Order status changed only by the webhook handler or an authorised staff action | Client marks its own order paid |
| No `authenticated` insert/update/delete on `orders`, `payments`, `order_items` | Direct API writes bypass every check |
| Daily reconciliation against Paystack's records | A missed webhook becomes silent revenue loss |
| No card data ever touches our servers | PCI scope, and a breach |

**Out of scope and stated as such in the UI:** seller payouts, refund automation, commission splits.

---

## 8. Moderation and honesty

- **Moderation is a record.** `moderation_actions` stores moderator, action, target, reason, time.
  Without a reason the insert is rejected by a `check` constraint.
- **Soft delete only** for forum posts, comments and reviews. A tombstone keeps the thread readable.
- **Ban is a database fact**, expressed as a row RLS checks, not a UI flag.
- **Verification is a record.** `people_verifications` and `businesses.verified_*` columns must be
  populated together or the constraint fails. A badge with no reviewer, no date, or no source is a
  lie and is treated as a defect.

---

## 9. Privacy and data protection

- Collect the minimum: email, handle, display name. No date of birth, no address, no phone unless an
  order requires delivery.
- Email is never rendered publicly. Handles are.
- Analytics: aggregate only. No third-party pixel on a page a logged-in member sees without consent.
- Nigerian Data Protection Act applies. The privacy notice must state: what is collected, why, who
  processes it (Supabase, Google Cloud, Resend, Paystack), where it is stored, how long, and how to
  request deletion.
- Account deletion runs server-side, anonymises authored content, and destroys the auth user. Tested.

---

## 10. Secrets

| Secret | Lives in | Never |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Cloud Run secret, server only | In a client bundle, a log, a test fixture, or chat |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET` | Cloud Run secret | Anywhere else |
| `RESEND_API_KEY` | Cloud Run secret | Anywhere else |
| `VAPID_PRIVATE_KEY` | Cloud Run secret | Anywhere else |
| `GCS_*` credentials | Workload Identity, no key file | A committed JSON key |
| `CRON_SECRET` | Cloud Run secret | A query string |

A secret in a client bundle is the worst kind of bug because it looks like it works. The build must
be scanned for the service-role key and for `PAYSTACK_SECRET` before any release.

---

## 11. Abuse and rate limits

| Surface | Limit | Why |
| --- | --- | --- |
| Sign in | 5 / 15 min per IP + per account, then backoff | Credential stuffing |
| Registration | 3 / hour per IP | Account farming |
| Password reset | 3 / hour per account | Email bombing |
| Comment create | 10 / hour per member | Flooding |
| Forum post | 20 / hour per member; new accounts 5/day for 48 h | Flooding, spam |
| Report | 20 / day per member | Report abuse |
| Business submission | 3 / day per member | Spam listings |
| Order create | 10 / hour per member | Card testing |
| Contact form | 5 / hour per IP | Spam |

Limits live in Postgres or a shared store, not in process memory — Cloud Run scales horizontally and
an in-memory counter is not a limit.

---

## 12. Security test plan (must actually run)

1. Anonymous `select` on every private table returns zero rows, not an error that leaks schema.
2. Member A cannot read member B's orders, comments-as-draft, profile email, or notifications.
3. A member token cannot reach any admin route or capability.
4. A staff token cannot post as a member on the public host.
5. Draft article reachable by direct slug → 404.
6. Publish transition with a stale `revision` → conflict, not overwrite.
7. Journalist cannot approve their own article.
8. Banned member insert into `forum_posts` → refused by RLS.
9. `orders` direct insert with a client price → refused by privilege, not by validation.
10. Webhook with a bad signature → 401, no state change.
11. Webhook replayed → one paid order.
12. `people` publish without a source → constraint/trigger raises.
13. Account deletion → auth user gone, email gone, content intact and anonymised.
14. Service-role key absent from every client bundle.

Tests run against a real isolated Supabase project, not an in-memory simulation. The existing PGlite
simulation stays as a fast local check and is **explicitly labelled as not proof.**
