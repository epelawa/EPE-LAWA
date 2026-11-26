# Platform UI implementation plan (as executed)

Principles: reuse the existing design system (`components/design-system.tsx`, `native-controls.css`, the palette in `AGENTS.md`), add no new libraries, keep the turn-2 header exactly as it is (transparent hamburger, chip-free logo, search beside the bell, no progress bar), and never show data the backend did not return.

## 1. Search modal (replaces `/search` page)

- `lib/site-search.ts` (server-only): one query helper over the 5 public collections. If any collection read fails, the whole response becomes an error (503), never a partial "no results".
- `app/api/search/route.ts`: `GET ?q=&type=`, min length 2, `no-store`.
- `components/site-search.tsx` and `.module.css`: native `<dialog>` with title, subtitle and placeholder from the brief.
  - Category chips only for collections the API returns: All, News, Businesses, Places, People, Forum.
  - 260 ms debounce, with `AbortController` plus a request sequence id for stale protection.
  - Loading, idle, short-query, empty, no-results, error and retry states, each mirrored to an sr-only `role=status`.
  - Arrow, Home and End keys move through results; Escape and backdrop close; Tab stays inside; focus returns to the trigger.
  - Desktop width is 680 px; on mobile it is a full-height sheet with `env(safe-area-inset-*)` padding.
- `lib/site-search-events.ts`: `openSiteSearch(query?)` event plus the `trapTabKey` helper shared by both dialogs.
- `app/search/route.ts`: a 308 from `/search?q=x` to `/?open=search&q=x`. The page is deleted, and the sitemap, structured data, `llms.txt`, `manus-routes.json` and not-found link are updated.

## 2. Notification Centre (bell)

- `components/notification-centre.tsx` and `.module.css`: the bell opens a native dialog. On desktop it is a popover-positioned panel (420 px); on mobile it is a bottom sheet (88 dvh).
  - **Recent:** the member's real `notifications` rows (8 max), with mark-all-read. Each state is honest: loading (with a 10 s timeout), signed out, error with Try again, and "No notifications yet".
  - **Push notifications:** device state is one of checking, disabled (not configured), unsupported, signed out, denied, revoked, off or on. When on, News and Radio topic switches save via PATCH, and Turn off calls DELETE.
  - The unread badge appears only for signed-in members with a real unread count.
- The radio reminder is preserved: its logic moved into `useRadioOpenPageReminder` and is linked from the panel.

## 3. Push onboarding

- `components/push-onboarding.tsx` and `.module.css`: shown once, 9 s after load, only to signed-in members whose permission is `default`, who have no subscription and who have not seen it before.
  - It skips auth, dashboard and form routes and defers while any dialog or form is active.
  - Phases: intro, working, success, denied and error (with retry).
  - "Not now" stores the dismissal, so the member is never prompted again. "Choose what I receive" opens the Notification Centre.
- `lib/push-client.ts`: the only place that calls `Notification.requestPermission()`, and only from a click. It reports success only when the server responds `{saved:true}`.

## 4. Subscribe API and dispatch gap

- `app/api/notifications/subscribe/route.ts`:
  - GET returns topics (401 when signed out).
  - POST registers the device and **upserts topic preferences** (fixes the dispatch gap).
  - PATCH updates topics.
  - DELETE removes only the caller's own endpoint.
  - It is rate-limited, size-capped and validated, and every response is `no-store`.
- `/api/push/dispatch` was left unchanged. It already filters by topic column; the gap was on the write side.

## 5. Shared refinements

- `EmptyPanel as="h1"` for full-page error states, so every page has one h1.
- 44 px targets: radio Mute, back links, tourism captions, the provider link.
- Map CSP: the OSM `frame-src` is always allowed.
- Honest radio on-air copy.
- Forum composer and reactions with truthful pending, success and error states.
- The Who is Who person head and compact action row.
- A news filter rail with intentional, accessible horizontal scroll.
