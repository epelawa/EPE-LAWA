# EPE LAWA — Page Specifications

**Document:** 04
**Status:** Active. Low-fidelity. Wireframes are described in words, not drawn. Contrast and layout
must be verified in a real browser before a page is considered done.

---

## 1. Shared patterns

### Public shell

```
[skip link]
[header: brand wordmark | News Who-is-Who Radio Forum Businesses Shop | Sign in]
[main: <h1> + content]
[footer: About · Contact · Guidelines · Privacy · Terms · WhatsApp]
```

- One `h1` per page. Header is `<header>`, navigation is `<nav aria-label="Main">`, footer is
  `<footer>`.
- Mobile: brand + menu trigger. Trigger has `aria-expanded`, escape closes, focus returns.
- Sticky header only on scroll-up. Never steals vertical space on a 320 px screen.

### Empty / loading / error / denied — one component each

| State | Content |
| --- | --- |
| Empty | Icon + one sentence explaining why it is empty + one action where one genuinely exists |
| Loading | Skeleton matching the shape of the content, with `aria-busy` |
| Error | What failed, whether the user's input survived, and a retry |
| Denied | What permission is needed, and how to get it. Never reveals the protected data |

---

## 2. Main — public pages

### 2.1 `/` — Landing

**Job:** in five seconds, say what EPE LAWA is and let the visitor act.

```
Hero
  eyebrow: EPE LAWA · Epe Division
  h1: The Voice of Epe Division
  lede: one sentence — news, conversation, radio and businesses for Epe Division,
        at home and abroad
  [Read the news]  [Listen to the radio]

Sections (five blocks, each a real link or an honest state)
  News          latest 3 published headlines, or "No stories published yet."
  Who is Who    three published profiles, or the empty state
  Radio         the player, in its honest current state
  Forum         three recent threads, or the empty state
  Businesses    three verified businesses, or the empty state

Trust line
  a short paragraph on sourcing, corrections and moderation, linking to /guidelines

[footer]
```

Rules: no invented metrics, no testimonials, no carousel, no autoplay, no fake urgency. A section with
no data shows its empty state — it is not hidden, and it is not filled.

### 2.2 `/about`

What EPE LAWA is, who runs it, where it broadcasts, how it is funded. Contact route. No team photos
until real ones exist.

### 2.3 `/contact`

Form: name, email, subject, message. Server validation, rate limit, honest success only on durable
acceptance. A WhatsApp link that opens the app and states that it leaves the site. Not an emergency
service, and the page says so.

### 2.4 `/within` — Who is Who

```
h1: Who is Who in Epe
[search input]  [office filter]  [community filter]
[result count, real]
[grid of profile cards: portrait, name, office, verified badge]
[empty state]  [pagination]
```

### 2.5 `/who-is-who/[slug]`

```
breadcrumb
h1: name   [verified badge]
portrait  |  biography
Offices held — table: title | institution | term | current
Sources — numbered list of citations with links
Correction notice, if any
[Report a correction]
```

The badge links to `/guidelines#verification`, which explains what verification means here.

### 2.6 `/radio`

```
h1: EPE LAWA Radio
player card: programme name, presenter, LIVE or "Not live right now"
[Play]  volume  state label
data-use note on mobile
This week's schedule — table: day | time | programme
[Browse the archive]
```

States: idle, loading, buffering, playing, paused, offline, error, unavailable. `LIVE` requires a
verified status check in the last 60 seconds. When unavailable, the archive is the primary action.

### 2.7 `/forum`, `/forum/[category]`, `/forum/t/[slug]`

Index: category cards with description, thread count, last activity.
Category: pinned threads first, then by `last_activity_at`. Row = title, author, replies, last activity.
Thread: original post, replies, quote blocks, composer at the bottom (or a sign-in prompt), report on
each post, poll rendered inside the first post.

### 2.8 `/business`, `/business/[slug]`

Index: filter bar (category, area), grid of cards. Card = photo, name, category, area, verified badge
**only when verified**, rating.
Profile: photo gallery, description, hours table, contact block (call, WhatsApp, directions as text —
no map in this phase), reviews with author handle and date, review form for signed-in members.

### 2.9 `/shop`, `/shop/[business]/[product]`, `/cart`, `/checkout`

Product: name, price in NGN, availability, business link, description, add to cart.
Cart: lines with quantity stepper, line total, subtotal.
Checkout: contact, delivery method (pickup / delivery / request a quote), notes, total breakdown, pay
button. Server recomputes the total; the client never sends prices.

### 2.10 Auth pages

`/login`, `/signup`, `/verify`, `/reset`, `/reset/[token]`. One column, labelled fields, inline errors,
a summary on submit failure. Generic messages that do not reveal whether an email is registered.

---

## 3. News host

### 3.1 `/`

```
masthead: EPE LAWA NEWS
section nav: Politics Sports Culture Education Business Community | Latest | Search
lead story: image, headline, dek, byline, date
secondary: two stories
[live region for breaking, only when published]
Latest — list of summaries
```

### 3.2 `/article/[slug]`

```
breadcrumb
category eyebrow
h1 headline
dek
byline · published date · updated date
hero image with caption and credit
[correction notice, if any]
article body (prose measure 62–72ch)
tags
share: copy link, WhatsApp, X
related stories
comments (Phase 5)
```

Structured data: `NewsArticle`. Canonical points here, never to the main host.

### 3.3 `/latest`, `/category/[slug]`, `/author/[slug]`, `/tag/[slug]`, `/search`

Consistent list layout: filter context, count, summaries, pagination. Empty states name the actual
filter that returned nothing.

---

## 4. Admin host

### 4.1 `/login`
Staff only. Email and password. Generic failure. No "register" link.

### 4.2 `/` — Dashboard
Real counts only: drafts awaiting review, approved awaiting publish, open reports, orders needing
action. Each is a link. Zero shows zero.

### 4.3 `/newsroom` and children
List: title, author, state, revision, updated. Filters by state.
Editor: title, summary, body (Tiptap), category, author, tags, featured image, SEO fields. Autosave
with an explicit save state. Preview opens a private, session-gated view.
Actions by capability: Save · Submit for review · Request revision · Approve · Publish · Unpublish.
Every transition sends `expectedRevision`; a 409 says "someone else changed this" and offers a reload.

### 4.4 `/newsroom/[id]` — version history
Version number, author, state, timestamp, reviewer. Diff is out of scope in this phase; side-by-side
view is enough.

### 4.5 `/people/*`
List and editor. Sources are a repeatable field. **Publish is disabled, with an explanation, until at
least one source exists** — and the database refuses regardless.

### 4.6 `/radio/*`
Stream config (secret, never rendered back to the client), status history, schedule editor, episodes.

### 4.7 `/moderation`
Queue: target, reporter, reason, age. Actions: hide, restore, dismiss — each requires a reason.
`/moderation/actions` is the audit view.

### 4.8 `/businesses/*`
Submissions with the fields to check, a verification form recording what was checked, publish/delist.

### 4.9 `/shop/orders`
Order queue with status, buyer contact for fulfilment only, advance-status action with a note.

### 4.10 `/staff`, `/audit`
Capability grants with a reason; audit log filtered by actor, action and resource.

---

## 5. Every page must answer

1. What is this page for, in one sentence, in the `h1` or a dek?
2. What does it look like with zero records?
3. What does it look like while loading?
4. What happens when the request fails?
5. What happens when the user lacks permission?
6. Does it work at 320 px, keyboard-only, at 200% text size?
7. Can a machine index it, and should it?
