# Platform UI changelog (turn 3)

## Added
- `components/site-search.tsx` and `site-search.module.css`: the header search dialog, "Search EPE LAWA".
- `components/open-search-button.tsx`: a button that opens the dialog (used on the 404 page).
- `lib/site-search.ts`: a server-only search over published articles, businesses, tourism destinations, people and forum threads.
- `lib/site-search-events.ts`: `openSiteSearch()`, `OPEN_SEARCH_EVENT` and `trapTabKey()` (Tab containment for custom dialogs).
- `app/api/search/route.ts`: the JSON search API (`no-store`; 503 on any read error).
- `app/search/route.ts`: a 308 redirect from legacy `/search?q=` URLs to `/?open=search&q=`.
- `components/notification-centre.tsx` and `.module.css`: the bell panel, with the recent feed, mark all read and push preferences.
- `components/push-onboarding.tsx` and `.module.css`: the first-visit push opt-in card, "Stay connected to Epe."
- `lib/push-client.ts`: permission, subscription and topics client. It is the only place that calls `Notification.requestPermission()`, and only on a click.

## Changed
- `components/site-header.tsx`: the search icon is now a dialog trigger (`aria-haspopup="dialog"`) and the bell opens the Notification Centre. The layout, logo, hamburger and the absence of a progress bar are unchanged from turn 2.
- `app/layout.tsx`: mounts `SiteSearch` (via the header) and `PushOnboarding`.
- `components/slash-focus.tsx`: `/` opens the search dialog.
- `components/radio-reminder.tsx`: the logic is extracted to `useRadioOpenPageReminder`, and the Thursday reminder is reachable from the Notification Centre.
- `app/api/notifications/subscribe/route.ts`:
  - GET returns topics;
  - POST registers the device and upserts `notification_preferences`;
  - PATCH updates topics;
  - DELETE removes the caller's own endpoint.
- `components/navigation-refinement.css`: `.header-notification { position: relative }`, the positioning context for the unread badge.
- `lib/site-search-events.ts` `anotherDialogIsOpen()`: widened to detect any open `<dialog>` or `[role=dialog]`, so onboarding never appears over another dialog.

## Removed
- `app/search/page.tsx`: replaced by the dialog plus the redirect. The search utilities and APIs are kept.
- `components/notification-prompt.tsx`: it was never mounted and is superseded by `PushOnboarding` plus `push-client`.

## Tests retargeted (behaviour moved, guarantees kept)
| Test | Change |
|---|---|
| `features-batch1.test.mjs` | Search covers 5 collections through `/api/search` and the dialog. The `/search` page is gone; the redirect is a 308 to `open=search`. |
| `news-listing.test.mjs` | The header renders `<SiteSearch />` with the dialog trigger attributes. |
| `community-history.test.mjs` | The correction form lives on `/itan-ilu-mi/correction`, still gated by `ENQUIRY_INTAKE_ENABLED` and still "never published". |
| `web-push-wiring.test.mjs` | Onboarding gates (session, permission `default`, seen flag, dialog check, no `requestPermission`). `push-client` reports success only on `saved: true`. The route writes topics and supports DELETE. |
| `news-feature-readiness.test.mjs` | "Unconfigured push never asks permission" now reads `push-client` (`if (!WEB_PUSH_READY) return "disabled"`) and onboarding (`pushSupport() !== "supported"`). |
| `forum.test.mjs` / `forum-community-live.test.mjs` | The composer moved to `reply-composer.tsx` (same `composerForm` class, `useActionState`, kept-draft copy). |
| `vitest/structured-data.test.ts` | The SearchAction template is `/?open=search&q={search_term_string}`, avoiding a redirect hop. |
