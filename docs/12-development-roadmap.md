# EPE LAWA — Development Roadmap

**Document:** 12
**Status:** Active. Phase order is authoritative. See `00-master-plan.md` for scope and blockers.
**Rule:** a phase is not complete until its backend exists and an end-to-end test passes against a
real database. A page that renders is not a feature.

---

## Phase 1 — Public shell

**Objective.** A real, shippable public presence with correct typography, tokens, navigation, states
and metadata. No placeholder marketing.

**Frontend**
- Design tokens landed as CSS custom properties and Tailwind theme, matching `05-design-system.md`.
- Landing page: purpose, what the platform actually is, the five sections, honest state for anything
  not yet live, contact route.
- News site structure: masthead, article layout shell, category/author/tag/search routes rendering
  real empty states.
- Shared shell: header, navigation, footer, skip link, focus styles, reduced-motion support.
- Error, not-found, loading and empty components shared across apps.
- PWA manifest, icons, theme colour, offline fallback page.
- SEO: canonical, Open Graph, sitemap, robots — news stays `noindex` until Phase 2 publishes content.

**Backend.** None new. The existing staff-access migration stays as applied.

**Gate.** `typecheck`, `build` and `test` all pass. No horizontal overflow at 320/768/1024/1440.
Tab order is logical. Focus is visible on every interactive element. Lighthouse accessibility ≥ 95.
Every navigation target resolves — nothing links to a route that does not exist.

---

## Phase 2 — News engine

**Objective.** A working publication: staff write, a reviewer approves, a publisher publishes, readers
read.

**Backend first**
- Migration: `categories`, `tags`, `authors`, `articles`, `article_versions`, `article_version_tags`,
  `media_assets`, `audit_events`.
- Immutable version snapshots. `articles.published_version_id` is the only pointer the public reads.
- Transition function with compare-and-swap on `revision`; concurrency conflict returns a conflict, not
  a silent overwrite.
- RLS: anonymous reads only the published projection; staff read only their scope; no `authenticated`
  write grant on `article_versions` except through the transition function.
- Audit row written in the same transaction as the transition.

**Frontend**
- Admin: article list, editor (Tiptap), media picker, preview, review queue, publish action, version
  history.
- News: home, article, category, author, tag, search, share, related.
- Main: real headlines block fed by published articles.

**Gate.** Three distinct accounts — journalist, editor, publisher — complete the full flow. The
published article appears on the news host with correct metadata. A draft fetched directly by slug
returns 404. A draft never appears in the sitemap, in search, or in any cache. `unpublish` removes it
within one cache cycle and the test asserts that.

---

## Phase 3 — Who is Who

**Objective.** A sourced, reviewable directory of notable people and office holders.

**Backend.** `people`, `people_offices`, `people_sources`, `people_verifications`, `people_corrections`.

**Frontend.** Directory index with search and filter by office and community; profile page with
biography, offices held with term dates, sources list, verification badge; admin CRUD with a source
requirement and a review step.

**Gate.** Publishing is refused at the database when `people_sources` is empty for that person. The
badge renders only when `people_verifications` has a reviewer, a date and a source. An unpublished
profile returns 404. A correction creates a new record rather than overwriting history.

---

## Phase 4 — Radio

**Objective.** The EPE LAWA programme, live and archived, told truthfully.

**Backend.** `programmes`, `episodes`, `radio_schedule`, `stream_config`, `stream_status_checks`.

**Frontend.** Persistent but unobtrusive player with idle/loading/buffering/playing/paused/offline/
error states. Schedule page. Episode archive with playback. "LIVE" only when a status check within the
last 60 seconds succeeded.

**Gate.** A real authorised stream plays in Chrome and Firefox on desktop and in Chrome on a real
Android device over 4G. Killing the network mid-playback produces the offline state, not a frozen
spinner. The archive still works while the stream is down. **Blocked at launch by B1.**

---

## Phase 5 — Accounts, comments, notifications

**Objective.** One member identity that everything community-shaped depends on.

**Backend.** Public `profiles` separate from `staff_profiles`. Handles with uniqueness and a reserved
list. `comments` with soft delete and moderation state. `comment_reports`. `push_subscriptions`
(endpoint + keys, one row per device). `notification_preferences`. Account deletion routine that
anonymises authored content rather than orphaning it.

**Frontend.** Sign up, email verification, sign in, password reset, profile edit, delete account.
Comment thread with reply, edit, delete, report. Notification preference screen that states the iOS
Safari limitation plainly.

**Gate.** Two members cannot reach each other's data through any surface — page, API, direct table
read. A reported comment reaches a queue. A hidden comment shows a tombstone, not a hole. Account
deletion removes the email and the sessions and keeps referential integrity.

---

## Phase 6 — Forum

**Backend.** `forum_categories`, `forum_threads`, `forum_posts`, `forum_polls`, `forum_poll_votes`,
`forum_reports`, plus moderator capability grants.

**Frontend.** Category index, thread list with activity, thread view, composer with draft autosave,
poll creation and voting, report dialog, guidelines page, moderator queue.

**Gate.** A member posts, another member reports, a moderator hides with a recorded reason, the audit
row exists, the banned member's next insert is refused by RLS rather than by the UI. Rate limiting
stops a bulk-post flood.

---

## Phase 7 — Business directory

**Backend.** `businesses`, `business_categories`, `business_reviews`, `business_verifications`,
`business_featured`.

**Frontend.** Index with category and area filters, business profile with hours/location/contact/photos,
review form requiring an authenticated author, submission flow for owners, admin review queue.

**Gate.** An unverified business never renders a verified badge anywhere — index, profile, SEO metadata
or structured data. A review cannot be posted anonymously or twice by the same member. A featured slot
expires automatically and the test asserts the expiry, not just the creation.

---

## Phase 8 — Marketplace and payments

**Backend.** `products`, `orders`, `order_items`, `order_status_history`, `payments`, `payment_events`,
`delivery_requests`. Paystack initialise + verify + webhook. Idempotency keyed on provider reference.
Order totals recomputed server-side from product rows, never from the request body.

**Frontend.** Product browse and detail, cart, checkout with delivery option, order confirmation,
order history, seller order management.

**Gate.** A tampered client total is rejected. A replayed webhook produces exactly one paid order and
one fulfilment. A failed payment leaves a recoverable order and an honest user message. A member
cannot read another member's order. Refunds and payouts are **out of scope** and this is stated in the
UI, not hidden.

---

## Phase 9 — Hardening and release

- Accessibility audit with a screen reader on real devices; fix everything found.
- Performance: Core Web Vitals on a throttled 3G profile; image pipeline; bundle budget.
- Security: rate limits on every mutating route, dependency audit, secret scan, negative RLS test suite
  run against a real isolated Supabase project.
- Operations: backup and restore drill completed and recorded; Cloud Monitoring alerts; rollback
  procedure tested by actually rolling back a deploy.
- Release: documented exceptions, signed-off checklist, deploy.

---

## Cross-phase rules

| Rule | Detail |
| --- | --- |
| Backend before UI | Within each phase, migrations and policies land before the interface that uses them. |
| One commit per verified step | `typecheck` + `build` + `test` green, then commit and push. |
| No mock data in a branch that could merge | Test fixtures are in-memory and ephemeral. |
| Blockers are per-module | An open blocker stops a launch, not the start of work. |
| Docs move with the code | The doc changes in the same commit as the behaviour. |
