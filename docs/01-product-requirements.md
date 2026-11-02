# EPE LAWA — Product Requirements

**Document:** 01
**Status:** Re-baselined 2 November 2026. Supersedes the previous website-first first release.
**Authority:** `00-master-plan.md` governs scope and phase order. This document governs *what each
module must do*.
**Evidence status:** Derived from the client's PRD and developer decisions. No user research,
usability testing or analytics exist yet. Requirements below are commitments, not validated findings.

---

## 1. Product

**Name.** EPE LAWA — The Voice of Epe Division.

**What it is.** A community, news, cultural and commerce platform for Epe Division, Lagos State: an
editorial publication, a moderated public square, a broadcast home, a directory of the people who
built the division, and a marketplace for its businesses.

**Who it serves.**

| Audience | What they come for |
| --- | --- |
| Indigenes at home | Local news, community discussion, radio, businesses they can actually visit |
| Indigenes abroad | The same, plus the archive — the thing they cannot get anywhere else |
| Residents and visitors | Practical discovery: where to eat, sleep, buy, repair, hire |
| Business owners | Visibility and, eventually, orders |
| Public office holders | A verified, sourced record of what they hold and have done |
| Young people | A place to argue about the division's future in public |

**Mission.** Digitally unite the people of Epe Division, preserve its history, promote development,
empower its businesses, and amplify the community's voice globally.

**Why web first.** The audience is on affordable Android phones with constrained data. A website loads
in a browser, needs no store approval, updates instantly and costs nothing to install. A native app
follows once there is content worth installing it for. See `00-master-plan.md` §1.

---

## 2. Module 1 — News publishing (PRD §3.1)

### 2.1 Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| N1 | Staff create, save, preview and submit drafts; a different authorised person approves; an authorised publisher publishes | Must |
| N2 | Published content is immutable. A correction is a new version with its own approval | Must |
| N3 | Categories (Politics, Sports, Culture, Education, Events, Business, Community) and free tags | Must |
| N4 | Author records with public name, bio and photo; a profile page per author | Must |
| N5 | Search across published articles only, with pagination | Must |
| N6 | Share action producing a canonical public link | Must |
| N7 | Breaking-news banner, only when an editor flags a specific article, with an expiry | Must |
| N8 | Comments on articles, threaded one level, with reporting and moderation | Must (Phase 5) |
| N9 | Web push notification on publish, opt-in per member and per category | Must (Phase 5) |
| N10 | Offline cache of previously read articles | Should (Phase 9) |
| N11 | Trending block driven by real read counts | **Conditional** — omit unless real data exists |

### 2.2 Rules

- **A published article must never change silently.** Every edit after publication goes through review.
- **A draft is invisible.** Not in sitemap, not in search, not in the API, not in a cache, not in an
  OG preview. Unauthorised access returns 404, not 403 — 403 confirms the article exists.
- **No fabricated trending, no fabricated counts, no invented "breaking".**
- Article body supports headings, paragraphs, lists, quotes, links, images with captions and credits,
  and video embeds — and nothing else. Every element that renders is sanitised server-side.

### 2.3 Acceptance

A journalist, an editor and a publisher, as three separate accounts, complete draft → review →
approve → publish. The article is publicly readable at its canonical URL with correct metadata. The
draft returns 404 to everyone else. Unpublishing removes it from the site, the feed, search and the
sitemap within one cache cycle.

---

## 3. Module 2 — Who is Who (PRD §3.8)

### 3.1 Requirements

| ID | Requirement |
| --- | --- |
| W1 | Profile with name, portrait, biography, community of origin, and a list of offices held |
| W2 | Each office has a title, institution, term start, term end (nullable for current), and a source |
| W3 | At least one source is required before a profile can be published — enforced in the database |
| W4 | Verification badge shows only when a review is recorded with reviewer, date and source |
| W5 | Search by name, filter by office and by community |
| W6 | A corrections path: anyone can submit a correction, staff review and action it |
| W7 | Contributor field for the person or family who supplied biographical detail (with consent) |

### 3.2 Rules

- **This module makes claims about real, living people.** It is the highest reputational-risk surface
  in the product. Every published claim is attributed to a source. Disputed facts are recorded as
  disputed, not settled by assertion.
- No rankings, no "greatest", no political scoring. A directory, not a leaderboard.
- A deceased person's profile is marked as such. A living person may request correction; the request
  path must be visible on their own page.
- Photographs require recorded rights. No scraped images of public figures.
- **The distinction between Eko Epe and Ijebu Epe is respected.** Do not flatten distinct communities
  into one.

### 3.3 Acceptance

Publishing without a source fails at the database level and the test proves it. The badge appears only
after a recorded review. An unpublished profile 404s. A submitted correction appears in the admin queue
and creates an audit row when actioned.

---

## 4. Module 3 — Live radio (PRD §3.7)

### 4.1 Requirements

| ID | Requirement |
| --- | --- |
| R1 | Live audio player with play, pause, volume (where the device allows) and mute |
| R2 | Distinct states: idle, loading, buffering, playing, paused, offline, error, unavailable |
| R3 | "LIVE" indicator only when a status check within the last 60 seconds succeeded |
| R4 | Programme schedule, sourced from staff-entered data, not hardcoded |
| R5 | Episode archive with playback for past programmes |
| R6 | Notification before broadcast, opt-in (Phase 5) |
| R7 | Share link to the radio page |

### 4.2 Rules

- **Never claim live status you have not verified.** A configured URL is not a live stream. A social
  page is not a live stream.
- No autoplay. Playback is always user-initiated.
- When the stream is unavailable, the listener is offered the archive. The page does not look broken.
- Audio data use on a metered connection is stated near the player.

### 4.3 Blockers

B1 — the official direct stream URL, its format and permission to embed it have not been supplied. This
is a launch gate for the module, not for the work.

---

## 5. Module 4 — Accounts (prerequisite for community)

### 5.1 Requirements

| ID | Requirement |
| --- | --- |
| A1 | Public member registration with email and password, email verification |
| A2 | Unique handle, display name, optional avatar |
| A3 | Separate identity from staff. A member never inherits staff capability |
| A4 | Password reset with a single-use, time-limited link |
| A5 | Account deletion that anonymises authored content and destroys sessions |
| A6 | Session security: httpOnly cookies on web, secure storage on native, refresh rotation |
| A7 | Rate limiting on registration, login and reset |

### 5.2 Rules

- Account enumeration is prevented: the response to "email exists" and "email does not exist" is
  identical.
- Passwords are never logged, never stored outside the auth provider, never emailed.
- A member's email is never public. A handle is.
- Deletion is a real operation, tested, and it does not break referential integrity of published
  content.

---

## 6. Module 5 — Community forum (PRD §3.3)

### 6.1 Requirements

| ID | Requirement |
| --- | --- |
| F1 | Categories managed by moderators, with a description and posting rules |
| F2 | Threads with title and body; replies; quoting a previous post |
| F3 | Polls attached to a thread: 2–10 options, single choice, closeable, results visible after voting |
| F4 | Report a post or thread with a reason |
| F5 | Moderator queue: hide, restore, lock thread, ban member — each with a recorded reason |
| F6 | Verified badge for public office holders, sourced from the Who is Who record |
| F7 | Community guidelines page, linked from the composer |
| F8 | Soft delete only. Hidden content keeps a tombstone so replies still make sense |
| F9 | Rate limits: posts per hour per member, and a new-account cooldown |

### 6.2 Rules

- **Moderation is a record, not a mood.** Every action stores who, what, why, when.
- A banned member is blocked at the database. The UI is not the enforcement point.
- No direct messages in this phase. No real-time chat. No anonymous posting.
- The verified badge links to the sourced profile. It is not a decoration.

---

## 7. Module 6 — Business directory (PRD §3.5, discovery)

### 7.1 Requirements

| ID | Requirement |
| --- | --- |
| B1 | Business profile: name, category, description, area, address, phone, WhatsApp, hours, photos |
| B2 | Categories: Hotels, Food & Drink, Fashion, Markets, Services, Trades, Health, Education, Transport |
| B3 | Owner submission flow with an admin review before publication |
| B4 | Verification: a human checked the business exists and the contact works |
| B5 | Reviews with a 1–5 rating and text, one per member per business, editable |
| B6 | Search and filter by category and area |
| B7 | Featured placement, paid, with a start date, end date and payment reference |

### 7.2 Rules

- **An unverified business never shows a verified badge.** Anywhere. Including structured data.
- Featured is a database record with an expiry. It is not a hardcoded boolean.
- A business can be delisted on request without deleting its review history.
- No invented reviews. No seeded businesses.

---

## 8. Module 7 — Marketplace (PRD §3.5, commerce)

### 8.1 Requirements

| ID | Requirement |
| --- | --- |
| M1 | Products under a business: name, description, price in NGN, stock, images, availability |
| M2 | Cart per member, price re-read from the database at checkout |
| M3 | Checkout with delivery option: pickup, local delivery, or request a quote |
| M4 | Paystack payment. Server initialises, verifies by webhook, reconciles by reference |
| M5 | Order state machine: `pending → paid → preparing → out_for_delivery → delivered`, plus `cancelled` and `refunded` |
| M6 | Order history for the buyer, order management for the seller |
| M7 | Status changes recorded with actor and time |
| M8 | Delivery request: address, landmark, notes, contact |

### 8.2 Rules — money

- **Never trust the client for a price or a total.** Recomputed server-side from product rows.
- **Never trust a browser callback for payment status.** The webhook is the only source of truth.
- **Every payment operation is idempotent** on the provider reference. A replayed webhook must not
  double-charge or double-fulfil.
- Currency is NGN, minor units, stored as integers. No floats anywhere in the money path.
- A failed payment leaves a recoverable order with an honest message.
- **Out of scope unless approved:** seller payouts, refund automation, commission splitting. The UI
  says so rather than implying they exist.

---

## 9. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Accessibility | WCAG 2.2 AA target. Keyboard operable, visible focus, semantic HTML, 4.5:1 body text contrast, labelled controls, announced errors, reduced-motion respected |
| Responsive | 320 / 375 / 768 / 1024 / 1440. No horizontal overflow. Targets ≥ 44×44 px |
| Performance | LCP < 2.5 s on a throttled 3G profile in Lagos. Initial JS kept small; images sized and lazy |
| Slow networks | Skeletons rather than blanks, cancelled requests on navigation, retry affordances, no render-blocking third-party scripts |
| Resilience | Offline page, cached shell, honest connectivity notices, no silent failure |
| Security | See `08-permissions-security.md`. RLS on every exposed table, server-side authorisation, no secrets client-side |
| Privacy | Minimum collection, stated purpose, retention defined, NDPR-aware, no third-party analytics without consent |
| SEO | Canonical URLs, sitemap, structured data for articles, people and businesses, private content excluded |
| i18n | English now. Yoruba is future and requires a decision on translation and review |
| Observability | Structured logging without personal data, error reporting, uptime checks, alert on auth failure spikes |

---

## 10. Future product — approved as vision, not as work

Speak Up Epe (non-emergency reporting), heritage archive, tourism and historical sites, events
calendar, scholarship and job board, e-learning, map navigation, multi-language, AI assistant, native
Expo app.

Each requires its own scope, privacy review and approval. **None of them receive routes, nav entries,
placeholders or "coming soon" cards during the current build.**

---

## 11. Success measures

Measured from real records. No targets are committed until the developer and client agree them.

| Measure | Source |
| --- | --- |
| Published articles per week | `articles` published count |
| Readers | privacy-conscious page views, aggregated only |
| Members who comment or post | distinct authors in `comments` / `forum_posts` |
| Verified businesses | `business_verifications` records |
| Paid orders | `orders` where `status = 'paid'` |
| Radio sessions | player start events, aggregated |
| Correction requests resolved | `people_corrections` closed count |

No subscriber counts, no testimonials, no growth percentages are published until they are real.

---

## 12. Decisions recorded

| Date | Decision |
| --- | --- |
| 2 Nov 2026 | Re-baselined to a five-module first build. Website-first delivery; native app deferred. |
| 2 Nov 2026 | Hosting moved to Google Cloud. Storage moved to Google Cloud Storage. |
| 2 Nov 2026 | Native app will be React Native + Expo. Capacitor and WebView wrappers rejected. |
| 2 Nov 2026 | Payments via Paystack. Payouts and refund automation out of scope. |
| 2 Nov 2026 | Public member accounts approved as a prerequisite phase, separate from staff identity. |
