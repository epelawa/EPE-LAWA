# EPE LAWA — Master Plan

**Status:** Active. This is the authoritative document for scope, phase order and release gates.
**Re-baselined:** 2 November 2026 — the previous website-only first release is superseded.
**Owner:** the developer.
**Supersedes:** the Phase 1 baseline in the original `01-product-requirements.md`, and the phase
order in the original `12-development-roadmap.md`.

If any other document disagrees with this one, this one wins and that document must be corrected.

---

## 1. What we are building

A community, news, cultural and commerce platform for Epe Division, Lagos State, Nigeria.

**Delivery form, settled:**

| Form | Status | Notes |
| --- | --- | --- |
| Web application (Next.js, installable PWA) | **Building now** | The complete product. Works on any phone, no store approval, no install. Hosted on Vercel. |
| Native app (React Native + Expo) | **Later phase** | Shares the same Supabase backend. Not a WebView wrapper, not Capacitor. |
| Android APK / iOS build | **Not now** | Deferred by decision, not by inability. |

The client brief says "mobile application". We meet that need web-first because a website is the only
thing that can be in front of users this week, and because a PWA on an affordable Android phone is a
better first experience than an APK nobody has installed yet. The native shell follows once the
web product has real content and real users. **This is a decision the client must be told explicitly,
in writing.** Do not let it be discovered at handover.

---

## 2. Approved build scope — five modules

In dependency order. Full requirements in `01-product-requirements.md`.

### 2.1 News publishing

A real publication, not a blog template. Staff create drafts, a reviewer approves, an authorised
publisher publishes. Published versions are immutable snapshots; corrections create a new version.
Readers get categories, tags, authors, search, share links and real SEO. Breaking banners exist only
when an editor actually flags something. Comments arrive with the accounts phase.

**Acceptance:** a draft can be created, reviewed, approved and published by three different roles; it
appears publicly with correct metadata; an unpublished draft is unreachable by direct URL, by search,
by sitemap, or by any cache.

### 2.2 Who is Who

A directory of notable people and public office holders, with biography, office held, term dates,
sources and a verification badge. Political office classification is data, not prose.

**Acceptance:** a profile cannot be published without at least one recorded source; the verification
badge displays only when a human review is recorded with reviewer and date; an unpublished profile
returns 404; the index is searchable by name and by office.

### 2.3 Live radio

The EPE LAWA programme on Radio Lagos 107.5 FM Àmitítí: a player, a schedule, and an episode archive.
"LIVE" is a verified state, never decorative.

**Acceptance:** a real authorised stream plays in a real browser on a real Android phone; the player
has distinct idle, loading, buffering, playing, paused, offline and error states; the LIVE indicator
appears only when status was actually verified; when the stream is down the listener sees the truth
and gets the archive instead.

**Blocker:** the direct stream URL, its format and the permission to embed it have not been supplied.
This blocks launch of this module, not the start of work on it.

### 2.4 Public accounts, comments and notifications

One member identity used across comments, forum, reviews and orders. Profiles, handles, avatars,
account deletion, email verification, web push opt-in.

**Acceptance:** a member can register, verify, comment, edit their own comment, delete their account;
member A cannot read member B's private data through any surface; comment moderation and reporting
work and are logged.

**This phase is the gate for everything community-shaped.** Forum and marketplace both sit on top of
it. Building either first means building authentication twice.

### 2.5 Community forum

The digital village square: categories, threads, posts, quotes, polls, reporting, moderation queue,
verified badges for public office holders, community guidelines. Soft delete only.

**Acceptance:** a member can create a thread and reply; a reported post reaches a moderator queue; a
moderator can hide it with a recorded reason; the action is audited; a banned member cannot post.

### 2.6 Business directory

Discovery half of the marketplace: business profiles, categories, opening hours, location, contact,
photos, reviews. Verified vs unverified is visible and honest. Paid featured placement is a database
record with a start, an end and a payment reference — never a hardcoded flag.

**Acceptance:** a business can be submitted, reviewed and published; an unverified listing never
renders as verified; reviews require a real authenticated author; search filters by category and
location; featured slots expire on their own.

### 2.7 Marketplace and payments

The commerce half: product listings, cart, checkout, orders, order state machine, delivery requests,
Paystack payments, webhooks, receipts.

**Acceptance:** a member can order and pay; the order total is recomputed server-side and a tampered
client total is rejected; a replayed webhook does not double-charge or double-fulfil; a failed payment
leaves the order in a recoverable state; the seller sees the order and can advance its status.

**Explicitly out of scope unless separately approved:** payouts and settlement to businesses, refund
automation, multi-vendor commission splitting. Those need a payments/legal decision, not a sprint.

### 2.8 Deferred product

Speak Up Epe reporting, heritage archive, tourism pages, events calendar, scholarship/job board,
e-learning, multi-language, AI assistant, map navigation. None of these get code, routes, nav entries
or "coming soon" placeholders during the current build.

---

## 3. The phase table

Every phase has a frontend chunk, its own backend chunk, and an end-to-end gate. **No phase is
complete until its backend exists and a real end-to-end test passes. No UI ships against mock data.**

| # | Phase | Frontend chunk | Backend chunk | Gate — must actually pass |
| --- | --- | --- | --- | --- |
| 1 | **Public shell** | Landing page, news site structure, navigation, design tokens in code, empty/loading/error states, SEO, PWA manifest | none beyond the existing staff migration | `typecheck` + `build` + `test` green · no overflow at 320/768/1024 · keyboard reachable |
| 2 | **News engine** | Admin editor and review queue; news home, article, category, author, tag, search | `articles`, `article_versions`, `categories`, `tags`, `authors`, `media_assets`; RLS; publish/unpublish transitions; audit | draft → review → approve → publish by three distinct roles; article public; draft unreachable by direct URL, sitemap or search |
| 3 | **Who is Who** | Directory index and profile page | `people`, `people_offices`, `people_sources`, `people_corrections`; verification record | publish blocked without a source; badge only from a recorded review; unpublished → 404 |
| 4 | **Radio** | Player, schedule, episode archive | `programmes`, `episodes`, `radio_schedule`, `stream_config`, `stream_status_checks` | real stream plays on a real phone; LIVE only when verified; outage shows archive |
| 5 | **Accounts + comments + notifications** | signup, login, verify email, profile, comment thread, report, notification prefs | `profiles` (public), handles, `comments`, `comment_reports`, `notification_subscriptions`, `push_subscriptions` | member A cannot read member B's data; comment can be reported, hidden, audited; account deletion works |
| 6 | **Forum** | categories, thread list, thread view, composer, polls, report, guidelines | `forum_categories`, `forum_threads`, `forum_posts`, `forum_polls`, `forum_poll_votes`, `forum_reports`, moderation actions | reported post hideable by moderator with reason and audit; banned member blocked at the database, not just the UI |
| 7 | **Business directory** | index, filters, business profile, review form | `businesses`, `business_categories`, `business_reviews`, `business_verifications`, `business_featured` | unverified never renders as verified; review requires auth; featured expires |
| 8 | **Marketplace + payments** | product pages, cart, checkout, orders, delivery request, seller order view | `products`, `orders`, `order_items`, `order_status_history`, `payments`, `payment_events`, `delivery_requests`; Paystack webhook | server-recomputed totals; tampered price rejected; replayed webhook idempotent; failed payment recoverable |
| 9 | **Hardening and release** | accessibility pass, performance pass, offline/PWA, SEO audit | rate limits, backups, monitoring, alerting, restore drill | full audit run; real-provider security tests; documented exceptions; release sign-off |

Ordering rationale: news first because every other module borrows its editorial and media patterns.
Who is Who next because it is the cheapest possible second consumer of that pattern. Radio in
parallel with accounts because it has no dependency on identity. Forum and marketplace both blocked
on accounts. Payments last because money is the most expensive thing to get wrong.

---

## 4. Dependency graph

```
                    ┌──────────────┐
                    │ 1 Public     │  (no backend dependency)
                    │   shell      │
                    └──────┬───────┘
                           ▼
                    ┌──────────────┐
                    │ 2 News       │◄──── editorial + media patterns
                    │   engine     │
                    └───┬──────┬───┘
            reuses      │      │      reuses
              ┌─────────┘      └──────────┐
              ▼                           ▼
      ┌──────────────┐            ┌──────────────┐
      │ 3 Who is Who │            │ 4 Radio      │  (independent)
      └──────────────┘            └──────────────┘
              │                           │
              └──────────┬────────────────┘
                         ▼
                 ┌──────────────┐
                 │ 5 Accounts   │  ← THE GATE
                 │ + comments   │
                 └───┬──────┬───┘
             ┌───────┘      └────────┐
             ▼                       ▼
      ┌──────────────┐        ┌──────────────┐
      │ 6 Forum      │        │ 7 Directory  │
      └──────────────┘        └──────┬───────┘
                                     ▼
                              ┌──────────────┐
                              │ 8 Marketplace│
                              │   + payments │
                              └──────────────┘
                                     ▼
                              ┌──────────────┐
                              │ 9 Hardening  │
                              └──────────────┘
```

---

## 5. What changed in the re-baseline, and why

| Change | Reason |
| --- | --- |
| First release expanded from "main site + news + admin" to the five client modules | The client's priority is the product, not a brochure. A website with no publishing, no radio and no directory serves nobody. |
| Forum moved from "Phase 2" to phase 6; Who is Who from "Phase 3" to phase 3; directory from "Phase 4" to phase 7 | The old order was editorial-first. The new order is dependency-first, then client priority. |
| Marketplace and payments admitted to scope | They are in the PRD as revenue. They were previously excluded. They now have a dedicated phase with a hard money gate. |
| Native app recorded as React Native + Expo, deferred | The client expects an app. Capacitor/WebView is explicitly rejected — it is a website in a box and would fail store review and user expectation. |
| Hosting moved to Vercel | Developer decision. Vercel hosts the three Next.js apps with preview deploys per PR. |
| Object storage is Cloudflare R2 | S3-compatible, no egress fees; media rows store object keys, never full URLs. |
| Public member accounts introduced | Forum, comments, reviews and orders all need them. No prior document modelled them. |
| `.github/` and CI permitted | Required for the "verify before commit" rule to mean anything. |
| Branch policy relaxed to commit-and-push per verified step | The old "do not merge without instruction" rule was blocking delivery. |

---

## 6. Open blockers

Tracked here, resolved in the named document. Nothing may be marked complete while its blocker is
open and its output is user-visible.

| # | Blocker | Blocks | Owner | Status |
| --- | --- | --- | --- | --- |
| B1 | Official direct radio stream URL, format, and permission to embed | Phase 4 launch | Client | **Open** |
| B2 | Paystack account, secret key, webhook secret, settlement details | Phase 8 | Developer | **Open** |
| B3 | Domains and DNS: `epelawa.ng`, `news.epelawa.ng`, `admin.epelawa.ng` | Phase 1 deploy | Client | **Open** |
| B4 | Licensed, authentic Epe photography and logo element rights | Phases 1–7 visual quality | Client | **Open** |
| B5 | Editorial staff identified, and who may approve what | Phase 2 | Client | **Open** |
| B6 | WhatsApp destination number and contact form recipient | Phase 1 contact | Client | **Open** |
| B7 | Privacy policy, terms, corrections policy, retention periods | Phase 5 launch | Client + legal | **Open** |
| B8 | Real launch content: first articles, first businesses, first profiles | Phases 2, 7 | Client | **Open** |
| B9 | Google Cloud project, billing, IAM, Cloud Run service accounts | Deploy | Developer | **Open** |
| B10 | Expo/EAS account for the future native build | Deferred | Developer | **Not started** |

Work proceeds around open blockers by using honest empty states. A blocker only stops the *launch* of
its module, never the start of work on it — except B1, which is a hard launch gate for radio.

---

## 7. Rules that do not bend

1. No demo data. No seeded records. No fake counts. Ever.
2. No UI shipped against mock data. If the backend is not there, the state is "empty", not "sample".
3. Every phase ends with an end-to-end test against real data in a real database.
4. Money, authorisation and deletion get explicit review in every PR that touches them.
5. `typecheck`, `build` and `test` pass before any commit.
6. Never claim a check passed that was not run.
