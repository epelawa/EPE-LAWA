# EPE LAWA — Database Schema

**Document:** 07
**Status:** Design. The only migration applied to any environment is
`20261102133703_staff_access_foundation`. Everything below is proposed and requires review before it
becomes a migration.
**Authority:** `00-master-plan.md`. Companion: `08-permissions-security.md`.

---

## 1. Principles

- Supabase Postgres is the system of record. Object bytes live in Google Cloud Storage; the database
  holds metadata and access classification.
- UUID primary keys (`gen_random_uuid()`). Slugs are for URLs, never for authorisation.
- All timestamps `timestamptz`, stored UTC.
- **Two identity axes.** Staff identity and public member identity are separate profile tables over
  one `auth.users` table. A member never inherits staff capability and vice versa.
- **RLS on every exposed table.** Default deny. No table is readable by `anon` without an explicit
  policy.
- **Soft delete for anything with an audit or moderation trail.** `deleted_at timestamptz null`.
- **Migrations are the source of truth.** Never edit an applied migration.
- No seed data. No demo rows. Reference data (categories, roles) is created by authorised operations.

---

## 2. Identity

### 2.1 Existing — staff access foundation (applied)

```sql
staff_profiles(user_id uuid pk → auth.users, is_active bool default false, created_at)
staff_capability_grants(user_id → staff_profiles, capability text check (capability='admin.access'), granted_at)
```

Retained. Will be extended in Phase 2 with a capability catalogue rather than a single hardcoded
capability — see §2.3.

### 2.2 Public members — new in Phase 5

```sql
profiles(
  user_id       uuid pk → auth.users on delete cascade,
  handle        citext unique not null,        -- public identity, e.g. @adaeze
  display_name  text not null,
  avatar_key    text null,                     -- GCS object key, not a URL
  bio           text null,
  is_verified   bool not null default false,   -- sourced staff review, see §7.3
  verified_at   timestamptz null,
  verified_by   uuid null → auth.users,
  created_at, updated_at,
  deleted_at    timestamptz null               -- anonymised, not removed
)
```

`handle` is unique, case-insensitive, 3–24 chars, `[a-z0-9_]`, with a reserved-word list
(`admin`, `epe`, `epelawa`, `support`, `moderator`, `news`, `radio`, `api`, …).

### 2.3 Staff capabilities

```sql
capabilities(key text pk, description text)      -- 'admin.access','article.create','article.review',
                                                 -- 'article.publish','article.unpublish','people.manage',
                                                 -- 'radio.manage','moderation.review','business.review',
                                                 -- 'order.manage','staff.manage','audit.read'
staff_capability_grants(user_id, capability references capabilities(key), granted_at, granted_by, revoked_at)
```

Replaces the single-value check constraint. The existing migration is followed by an additive one; the
old constraint is dropped in a later migration after data migration, never edited in place.

**Why a capability table and not roles:** the client's role list (super admin, editor-in-chief,
editor, journalist, radio manager) keeps changing. Capabilities are stable; roles are a UI grouping
over capabilities. Store the capability, present the role.

---

## 3. Editorial

```sql
authors(
  id uuid pk, staff_user_id uuid null → auth.users,  -- a byline need not be a login
  display_name text not null, slug citext unique not null,
  bio text null, photo_key text null, created_at
)

categories(id uuid pk, slug citext unique not null, label text not null,
           description text null, sort_order int default 0, is_active bool default true)

tags(id uuid pk, slug citext unique not null, label text not null)

articles(
  id uuid pk,
  slug citext unique not null,                -- reserved forever, even after archive
  owner_id uuid not null → auth.users,        -- the journalist who owns the draft
  current_version_id uuid null → article_versions,
  published_version_id uuid null → article_versions,
  published_at timestamptz null,
  revision bigint not null default 1,         -- compare-and-swap guard
  is_breaking bool not null default false,
  breaking_until timestamptz null,
  created_at, updated_at
)

article_versions(
  id uuid pk,
  article_id uuid not null → articles on delete restrict,
  version_number int not null,
  title text not null, summary text null, body jsonb not null,   -- Tiptap JSON, sanitised on render
  author_id uuid not null → authors,
  category_id uuid not null → categories,
  seo_title text null, seo_description text null, og_image_key text null,
  state text not null check (state in ('draft','review','approved','rejected')),
  created_by uuid not null → auth.users,
  created_at timestamptz not null default now(),
  unique (article_id, version_number)
)

article_version_tags(version_id → article_versions, tag_id → tags, primary key (version_id, tag_id))
```

**Tags live on the version, not the article.** A tag change after publication must not retroactively
alter a published snapshot.

**The public read model is a view**, not the tables:

```sql
create view published_articles as
select a.id, a.slug, a.published_at, a.is_breaking, a.breaking_until,
       v.title, v.summary, v.body, v.seo_title, v.seo_description, v.og_image_key,
       au.display_name as author_name, au.slug as author_slug,
       c.slug as category_slug, c.label as category_label
from articles a
join article_versions v on v.id = a.published_version_id and v.state = 'approved'
join authors au on au.id = v.author_id
join categories c on c.id = v.category_id
where a.published_version_id is not null;
```

The view is `security_invoker = true` in Postgres 15+ so the caller's identity and RLS apply. Do not
rely on a view as a security boundary without testing it as that caller.

### 3.1 Editorial media

```sql
media_assets(
  id uuid pk, kind text check (kind in ('image','video_thumb','document')),
  title text, credit text, rights_note text,
  bucket text not null check (bucket in ('public','private')),
  object_key text not null, mime_type text not null, byte_size bigint not null,
  width int null, height int null,
  uploaded_by uuid → auth.users, created_at,
  unique (bucket, object_key)
)

programmes(id uuid pk, slug citext unique, name text, description text, schedule_note text, is_active bool)
episodes(id uuid pk, programme_id → programmes, slug citext unique, title text,
         description text, aired_on date, duration_seconds int,
         media_asset_id uuid null → media_assets, external_url text null, published_at timestamptz)

radio_schedule(id uuid pk, programme_id → programmes, day_of_week smallint check (0..6),
               starts_at time, ends_at time, note text)
stream_config(id int pk default 1, stream_url_encrypted bytea, status_check_url text,
              updated_by uuid, updated_at)
stream_status_checks(id bigserial, checked_at timestamptz, ok bool, latency_ms int, error_class text)
```

`stream_status_checks` is append-only and pruned after 7 days by a scheduled job. "LIVE" is derived
from the most recent row within 60 seconds where `ok = true`. **Never from `stream_config` alone.**

---

## 4. Comments

```sql
comments(
  id uuid pk,
  article_id uuid not null → articles,
  parent_id uuid null → comments,
  author_id uuid not null → profiles,
  body text not null check (char_length(body) between 1 and 4000),
  state text not null default 'visible' check (state in ('visible','hidden','deleted')),
  hidden_reason text null, hidden_by uuid null → auth.users, hidden_at timestamptz null,
  created_at, updated_at,
  deleted_at timestamptz null
)

comment_reports(id uuid pk, comment_id → comments, reporter_id → profiles, reason text not null,
                note text null, state text default 'open' check (state in ('open','actioned','dismissed')),
                created_at, resolved_by uuid, resolved_at)
```

One-level threading: `parent_id` must reference a comment with `parent_id is null` — enforced by a
trigger, because RLS cannot express it.

---

## 5. Forum

```sql
forum_categories(id uuid pk, slug citext unique, name text, description text, rules text,
                 sort_order int, is_active bool)

forum_threads(
  id uuid pk, category_id → forum_categories, author_id → profiles,
  slug citext unique, title text not null check (char_length(title) between 3 and 160),
  state text default 'open' check (state in ('open','locked','hidden','deleted')),
  is_pinned bool default false,
  post_count int default 0, last_activity_at timestamptz,
  created_at, deleted_at
)

forum_posts(
  id uuid pk, thread_id → forum_threads, author_id → profiles,
  body text not null check (char_length(body) between 1 and 20000),
  quote_post_id uuid null → forum_posts,
  state text default 'visible' check (state in ('visible','hidden','deleted')),
  created_at, updated_at, deleted_at
)

forum_polls(id uuid pk, thread_id → forum_threads unique, question text,
            closes_at timestamptz null, allow_multiple bool default false)
forum_poll_options(id uuid pk, poll_id → forum_polls, label text, sort_order int, unique (poll_id, label))
forum_poll_votes(poll_id, option_id, voter_id, created_at, primary key (poll_id, voter_id, option_id))

forum_reports(id uuid pk, post_id → forum_posts, reporter_id → profiles, reason text not null,
              note text, state text default 'open', created_at, resolved_by, resolved_at)

moderation_actions(
  id uuid pk, moderator_id → auth.users, target_type text, target_id uuid,
  action text check (action in ('hide','restore','lock','unlock','ban','unban','dismiss')),
  reason text not null, created_at
)
```

`post_count` and `last_activity_at` are denormalised for the thread list. Maintain them with a trigger
on `forum_posts`, not on read — a `count(*)` per thread in a list query will not survive growth.

---

## 6. Business directory

```sql
business_categories(id uuid pk, slug citext unique, label text, sort_order int)

businesses(
  id uuid pk, slug citext unique, owner_user_id uuid null → profiles,
  name text not null, category_id → business_categories,
  description text, area text, address text, landmark text,
  phone text, whatsapp text, email text, website text,
  hours jsonb null,                            -- {mon:[["09:00","17:00"]], ...}
  status text default 'submitted'
    check (status in ('submitted','reviewing','published','rejected','delisted')),
  is_verified bool default false,
  verified_at timestamptz null, verified_by uuid null → auth.users, verification_note text null,
  created_at, updated_at, published_at, deleted_at
)

business_photos(id uuid pk, business_id → businesses, media_asset_id → media_assets,
                sort_order int, alt_text text not null)

business_reviews(
  id uuid pk, business_id → businesses, author_id → profiles,
  rating smallint check (rating between 1 and 5), body text,
  created_at, updated_at, deleted_at,
  unique (business_id, author_id) where deleted_at is null   -- one live review per member
)

business_featured(
  id uuid pk, business_id → businesses, starts_at timestamptz, ends_at timestamptz,
  payment_id uuid null → payments, created_at,
  check (ends_at > starts_at)
)
```

**`is_verified` is a record, not a checkbox.** It cannot be true without `verified_at`, `verified_by`
and `verification_note` — enforce with a `check` constraint:
`check (is_verified = false or (verified_at is not null and verified_by is not null))`.

Featured placement is derived: `exists(select 1 from business_featured where business_id = b.id and now() between starts_at and ends_at)`. Never a column that has to be unset by hand.

---

## 7. Who is Who

```sql
people(
  id uuid pk, slug citext unique, full_name text not null,
  preferred_name text null, portrait_key text null,
  community text null,                    -- Eko Epe / Ijebu Epe / other, as recorded by source
  biography text null, is_deceased bool default false,
  status text default 'draft' check (status in ('draft','review','published','withdrawn')),
  created_at, updated_at, published_at, deleted_at
)

people_offices(
  id uuid pk, person_id → people, title text not null, institution text not null,
  term_start date null, term_end date null, is_current bool default false,
  source_id uuid null → people_sources
)

people_sources(
  id uuid pk, person_id → people,
  kind text check (kind in ('interview','document','publication','government_record','family_record')),
  citation text not null, url text null, recorded_by uuid → auth.users, recorded_at
)

people_verifications(
  id uuid pk, person_id → people unique,
  verified_by uuid not null → auth.users, verified_at timestamptz not null,
  source_id uuid not null → people_sources, note text
)

people_corrections(
  id uuid pk, person_id → people, submitted_by uuid null → profiles,
  submitted_email text null, claim text not null, evidence text null,
  state text default 'open' check (state in ('open','accepted','rejected')),
  created_at, resolved_by uuid, resolved_at
)
```

**Publish gate, enforced in the database:**

```sql
alter table people add constraint publish_requires_source
  check (status <> 'published' or exists (
    select 1 from people_sources s where s.person_id = people.id
  ));
```

A `check` constraint cannot reference another table. Use a `before update` trigger that raises instead,
and assert it in the migration test. This is the single most important constraint in the schema —
without it the verification badge is decoration.

---

## 8. Marketplace and money

```sql
products(
  id uuid pk, business_id → businesses, slug citext, name text not null, description text,
  price_kobo bigint not null check (price_kobo >= 0),      -- integer minor units, never float
  currency char(3) not null default 'NGN',
  stock int null check (stock >= 0),                        -- null = unlimited / made to order
  is_available bool default true,
  created_at, updated_at, deleted_at,
  unique (business_id, slug)
)

orders(
  id uuid pk,
  reference text unique not null,             -- human + provider reference base
  buyer_id uuid not null → profiles,
  status text not null default 'pending'
    check (status in ('pending','paid','preparing','out_for_delivery','delivered','cancelled','refunded')),
  subtotal_kobo bigint not null, delivery_kobo bigint not null default 0,
  total_kobo bigint not null, currency char(3) default 'NGN',
  contact_name text not null, contact_phone text not null,
  delivery_method text check (delivery_method in ('pickup','delivery','quote')),
  delivery_address text null, delivery_landmark text null, notes text null,
  created_at, updated_at, paid_at timestamptz null
)

order_items(
  id uuid pk, order_id → orders on delete cascade, product_id → products,
  name_snapshot text not null, unit_price_kobo bigint not null, quantity int not null check (quantity > 0),
  line_total_kobo bigint not null
)

order_status_history(id uuid pk, order_id → orders, from_status text, to_status text not null,
                     actor_id uuid null, note text, created_at)

payments(
  id uuid pk, order_id → orders,
  provider text not null default 'paystack',
  provider_reference text unique not null,   -- idempotency key, from the provider
  amount_kobo bigint not null, currency char(3) not null,
  status text not null check (status in ('initialised','pending','succeeded','failed','abandoned')),
  raw_event_id text null,
  created_at, updated_at, verified_at timestamptz null
)

payment_events(                              -- append-only webhook ledger
  id uuid pk, provider text, event_id text unique not null,
  event_type text not null, payload_hash text not null,
  processed_at timestamptz null, error text null, received_at timestamptz default now()
)

delivery_requests(id uuid pk, order_id → orders unique, address text not null, landmark text,
                  contact_phone text not null, notes text, created_at)
```

**Snapshot the price on the order line.** `unit_price_kobo` is copied at order time. If the product
price changes later, the order still shows what the buyer agreed to.

**`payment_events.event_id` is unique.** That single constraint is what makes webhook replay safe.

---

## 9. Notifications

```sql
push_subscriptions(
  id uuid pk, user_id → profiles, endpoint text unique not null,
  p256dh text not null, auth text not null,
  user_agent text null, created_at, last_used_at, failed_count int default 0
)

notification_preferences(user_id → profiles pk, news bool default true, radio bool default false,
                         comments bool default true, forum bool default false)

notifications(id uuid pk, user_id → profiles, kind text, title text, body text, url text,
              read_at timestamptz null, created_at)
```

---

## 10. Audit

```sql
audit_events(
  id bigserial pk,
  actor_id uuid null → auth.users,
  actor_kind text check (actor_kind in ('staff','member','system')),
  action text not null,                    -- 'article.publish', 'forum.hide', 'order.refund', ...
  resource_type text not null, resource_id uuid null,
  outcome text not null check (outcome in ('success','denied','error')),
  metadata jsonb not null default '{}',    -- no secrets, no message bodies, no tokens
  created_at timestamptz default now()
)
```

Append-only for application roles: no `update` or `delete` grant. Retained 24 months; pruned by a
scheduled job, not by hand.

---

## 11. Indexes that matter

| Table | Index | Reason |
| --- | --- | --- |
| `articles` | `(published_at desc, id desc)` where published | The news home feed; stable pagination |
| `article_versions` | `(article_id, version_number desc)` | Version history |
| `article_versions` | GIN on `to_tsvector('english', title \|\| ' ' \|\| coalesce(summary,''))` | Search without a search service |
| `comments` | `(article_id, created_at)` where `state='visible'` | Thread load |
| `forum_threads` | `(category_id, is_pinned desc, last_activity_at desc)` | Thread list |
| `forum_posts` | `(thread_id, created_at)` | Thread view |
| `businesses` | `(category_id, area)` where `status='published'` | Directory filter |
| `business_reviews` | `(business_id, created_at desc)` | Review list |
| `orders` | `(buyer_id, created_at desc)`, `(status)` | Buyer history, seller queue |
| `payments` | `unique (provider_reference)` | Idempotency |
| `audit_events` | `(actor_id, created_at desc)`, `(resource_type, resource_id)` | Investigation |

---

## 12. Money — do not model naively

1. **Integers only.** `*_kobo bigint`. Never `numeric` with a float cast, never `real`, never a JS
   `number` parsed from a float string.
2. **Server recomputes.** The checkout handler reads `products.price_kobo` and rebuilds the cart. The
   request body's prices are ignored and logged when they differ.
3. **Idempotency lives in the database.** `payments.provider_reference unique` and
   `payment_events.event_id unique`. Not in application memory.
4. **Webhook is the truth.** A browser redirect after checkout proves nothing and must never set
   `orders.status = 'paid'`.
5. **Signature verified on the raw body**, before parsing, with the provider's secret.
6. **No `authenticated` write grant on `orders`, `payments`, `payment_events` or `order_items`.**
   Writes go through server-side functions with an explicit capability check.
7. **A reconciliation job** compares `payments` against the provider's records daily and alerts on
   mismatch. Without it, a missed webhook becomes a silent loss.
8. **Refunds and payouts are out of scope** and the schema does not pretend otherwise. `refunded` is a
   status a human sets after doing it in the Paystack dashboard.

---

## 13. Deletion and retention

| Data | On account deletion | Retention |
| --- | --- | --- |
| `profiles` | Anonymised: email destroyed with the auth user, handle replaced with `deleted-<hash>`, display name → "Deleted member" | Row kept for referential integrity |
| `comments`, `forum_posts` | Kept, shown as authored by a deleted member | Kept — other people replied to them |
| `businesses` (owned) | Delisted; reviews retained | Retained |
| `orders` | Retained with personal fields nulled | 7 years (financial record convention) |
| `payments` | Retained, never deleted | 7 years |
| `audit_events` | Actor anonymised | 24 months |
| `push_subscriptions` | Deleted on logout and on account deletion | — |

Deletion is a server-side routine with a test. It is never a `delete from` cascade that removes
someone else's content.

---

## 14. Migration order

| # | Migration | Phase |
| --- | --- | --- |
| 1 | `20261102133703_staff_access_foundation` **(applied)** | — |
| 2 | `capabilities_catalogue` — adds `capabilities`, migrates the existing grant | 2 |
| 3 | `editorial_core` — authors, categories, tags, articles, versions, view | 2 |
| 4 | `editorial_media_and_radio` — media assets, programmes, episodes, schedule, stream status | 2/4 |
| 5 | `people_directory` | 3 |
| 6 | `member_identity_and_comments` | 5 |
| 7 | `forum` | 6 |
| 8 | `business_directory` | 7 |
| 9 | `marketplace_and_payments` | 8 |
| 10 | `notifications_and_audit_hardening` | 9 |

Each migration ships with: the SQL, an RLS policy set, a negative test, and a line in the tracker.
