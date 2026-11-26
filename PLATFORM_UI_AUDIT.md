# Platform UI audit: shared shell, search, notifications and push

Baseline: `main` at `4bea03d` (PR #273 merged). Scope: shared non-admin UI in `frontend/apps/main`. The homepage design and `/admin/**` were excluded.

## Shared shell and components (baseline)

| Area | Finding | Sev |
|---|---|---|
| Header search icon | Plain link to a standalone `/search` page. It does not match the brief (modal from the header) and is a full navigation away from context. | P2 |
| Header bell | `RadioReminder` rendered the bell as a link to `/radio/reminders`. It is labelled "Radio notification settings", so the bell was neither a notification centre nor a place to manage News alerts. | P1 |
| Push opt-in | `components/notification-prompt.tsx` existed but was **not mounted** anywhere (`layout.tsx` asserted its absence). There was no first-visit onboarding, so members had no way to opt in to News push. | P1 |
| Push topics vs dispatch | `/api/push/dispatch` sends only to members whose `notification_preferences.push_news` / `push_radio` is `true` (columns default `false`). The baseline `POST /api/notifications/subscribe` registered the device via `push_subscription_register` but **never wrote preferences**, so every subscriber would have received nothing. Production has 0 `push_subscriptions` rows, so nobody was affected yet. | P1 |
| Subscribe API surface | POST only. There was no GET (current topics), PATCH (change topics) or DELETE (turn off on this device), so a preferences centre could not be built truthfully. | P2 |
| Dialogs | `BrandedDialog` and native `<dialog>` are used consistently. There was no shared Tab containment for custom dialogs. Native `showModal()` makes the page inert, but Tab can still leave the dialog for the browser chrome. | P2 |
| Toasts / notices | `Notice` (role status/alert) and `toast.tsx` exist and are used. They were kept; new states reuse `Notice` and `role=status` patterns. | – |
| Empty / error panels | `EmptyPanel` always rendered an h2, so full-page error states (invalid slug plus read failure) had **no h1** (40 baseline captures). | P2 |
| Touch targets | 55 baseline captures had interactive targets under 44 px: radio Mute 36×36, breadcrumb back links 38×23, "Back to News" 92×23, tourism caption links 300×20. | P2 |
| Map CSP | With no Turnstile key, `frame-src` was dropped, so the OpenStreetMap iframe fell back to `default-src 'self'` and was **blocked** (20 console errors on `/map`). With a key, `frame-src` listed only Cloudflare, so OSM was blocked there too. | P1 |
| Progress bars | No top or scroll progress bars remained after turn 2. The audit's only `progressBars` hit is the `/auth` step indicator, which is a form element and not a page progress bar. | – |
| Visual language | The palette and type system from `AGENTS.md` are applied. There are no gradients or glassmorphism to remove. Some secondary buttons (e.g. enquiry "Back") were unstyled native buttons. | P3 |

## Search (baseline)

- `lib/site-search.ts` and `/search` page: real queries across published articles, businesses, tourism destinations, people and forum threads. There were no fake results, which was good.
- There was no modal, no debounce or stale protection (it was a form GET), and no keyboard result navigation. The error state was conflated with "no results".

## Notification data (verified read-only in production)

- `notifications` (in-app feed): RLS gives own-row SELECT plus UPDATE of `read_at`. 3 rows in production.
- `notification_preferences`: own-row INSERT, SELECT and UPDATE for `authenticated`.
- `push_subscriptions`: own-row access for all four commands. 0 rows.
- `push_subscription_register(p_endpoint,p_p256dh,p_auth,p_user_agent)` RPC exists.
- **Conclusion:** the notification centre, preferences and unsubscribe can be built with no schema or policy change.
