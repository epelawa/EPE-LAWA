# Route changelog (turn 3)

All changes are in `frontend/apps/main` unless noted. No `/admin/**` files, migrations, RLS policies, env vars or deploy config were changed.

## News
- `app/news/listing.module.css`: the category tab row (already `overflow-x: auto` with a thin visible scrollbar and 44 px tabs) is now a deliberate, contained rail.
  - `min-width: 0` on the rail and its parent, so it can never widen the page.
  - `overscroll-behavior-x: contain`, so a swipe does not chain to the page.
  - Proximity scroll-snap.
  - An **inset** focus ring, so keyboard focus on a partly scrolled tab is never clipped.
  - The search button is narrower at 400 px and below.
  - The page body never scrolls sideways; the audit found 0 overflow captures at every width.
- `app/newsletter/unsubscribe/unsubscribe.module.css`: the "Back to News" link is now a 44 px target (was 92×23).
- Search moved to the header dialog (see `PLATFORM_UI_CHANGELOG.md`).

## Who is Who
- `app/who-is-who/[slug]/page.tsx`: new `person-head` layout (portrait plus identity) with a compact action row: Back to the directory, View sources (only when sources exist), Suggest a correction. The buttons use `btn-compact`, keep 44 px height and focus rings, and wrap at 320 px. Source links get `ui-tap-link`.
- The read-failure panel is now the page h1 (`EmptyPanel as="h1"`).
- `app/globals.css`: `person-head`, `person-actions` and `btn-compact` utilities.

## Radio
- `app/radio/page.tsx`: the on-air line is truthful.
  - The red marker and "On air now: X (per schedule)" appear only when an EPE LAWA programme is scheduled for the current time.
  - Otherwise the page says "No EPE LAWA programme is scheduled right now. Stations play their own programming." If the schedule read fails, it says so.
  - The baseline showed "On air now: station programming" with a live dot at all times.
- `components/radio-player.tsx`:
  - A single provider credit, "Station catalogue: Naija Radio ↗", with an sr-only "(opens in a new tab)".
  - The title falls back to the chosen station's name instead of "Radio".
  - The provider link is a 44 px target.
- `components/radio-player.module.css` and `radio-page.module.css`: the Mute button is 44×44 (was 36×36), and there are idle-dot and schedule-note styles.
- **No ad slot was added.** There is no approved provider logo asset in the repo or storage, and the brief forbids inventing one. Owner input needed (see report).

## Ìtàn Ilú Mi
- New `app/itan-ilu-mi/correction/page.tsx` and `correction.module.css`: a separate correction and removal request page.
  - It has a back link, a three-step "what happens next" list and the existing `EnquiryForm kind="correction"`, which provides validation, pending, success, error and duplicate-submit prevention, and goes to the private `private_enquiry_submit` intake.
  - It states that requests are never published automatically. When `ENQUIRY_INTAKE_ENABLED` is off it shows a warning instead of the form.
- `app/itan-ilu-mi/page.tsx`: the inline form is replaced by a "Request a correction or removal" link. The page still shows only approved records or the empty state; it contains no Lorem.
- `components/enquiry-form.tsx`: an optional `messageLabel` prop, and the Back button is styled `btn-secondary`.
- Image upload was **not** shipped. The `history*` tables have no media column, so a private, review-gated upload would need a schema change (documented in `ROUTE_IMPROVEMENT_PLAN.md`).

## Forum
- `app/forum/actions.ts`: `replyWithState` / `createThreadWithState` return `ForumFormState` on failure (with an attempt counter) and redirect only after the database confirms. The no-JS form actions are kept.
- New `app/forum/reply-composer.tsx`, a messaging-style composer:
  - the draft is controlled, so a failure keeps it ("Your message is still here");
  - Send is disabled while pending or empty;
  - Enter sends and Shift+Enter adds a newline (fine pointers only);
  - the draft is cleared only after a confirmed send.
- New `app/forum/new/new-thread-form.tsx`: the same truthful states for new threads, with the poll fields kept.
- `app/forum/thread/[slug]/page.tsx`:
  - uses `ReplyComposer`;
  - the last message carries `id="latest"`, so the post-reply redirect (`?posted=1#latest`) lands on it, with a scroll margin that clears the sticky header;
  - the error panel is the h1.
- `app/forum/category/[slug]/page.tsx`: the error panel is the h1.
- `app/forum/reaction-bar.tsx` and `reaction.module.css`: optimistic reactions revert on failure and show an inline error; buttons are 44 px with `aria-pressed`.
- `app/forum/forum.module.css`: composer, bubble and scroll-margin styles.
- `app/manifest.ts`: PWA shortcuts for News, Forum and Radio. The forum was already in the mobile bottom nav and menu.

## Map
- `lib/csp.ts`: `frame-src https://www.openstreetmap.org` is always present, with or without Turnstile. Before, the OSM embed was blocked (20 console errors at baseline, 0 after).

## Business directory
- `app/business-directory/[slug]/page.tsx`: the read-failure panel is the h1. No businesses or fields were invented; the listing and submit flows were left unchanged after review.

## Tourism
- `app/tourism/tourism.module.css`: caption links are 44 px targets (were 300×20).

## Shared
- `components/design-system.tsx`: `EmptyPanel` gained `as?: "h1" | "h2"`.
- `app/globals.css`: `.ui-back-link` and breadcrumb links are 44 px targets; shared utilities.
- `app/not-found.tsx`: the search link opens the dialog (`<OpenSearchButton />`).
- `app/sitemap.ts`, `lib/structured-data.ts`, `app/llms.txt/route.ts`, `public/manus-routes.json`: removed or retargeted `/search`.
