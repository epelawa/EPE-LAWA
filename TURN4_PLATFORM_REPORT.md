# Turn 4 — public forms, guest push, scheduled radio push, nav, Yorùbá, RLS

Branch `arena/f799e669-epe-lawa` (base `c02dfb7`). Screenshots: `docs/route-audit/turn4/`.

## What changed

| Area | Change |
| --- | --- |
| Public forms | Business, Events, Ìtàn Ilú Mi (contribution + correction), Tourism and news corrections work signed out or in. The "Please sign in before submitting a business…" gate is removed. Guests leave a name and email, which are stored only on the private row. |
| Form routing | Each form writes to its own table and admin section: business → Business review, events → new staff **Events** page, Ìtàn → Ìtàn review (contributions **and** a new corrections queue), tourism → Tourism review, news corrections → article correction reports. |
| "Could not confirm whether the submission was saved" | Root cause: database regexes with repeat bounds above 255 failed at insert time. Fixed in migration `20261128000000`. |
| "Too many attempts from this network…" on the first try | Three causes: React `cache()` is not request-scoped inside server actions, so the limiter failed closed; the limit was checked **before** validation, so fixing a typo used up the allowance; and the limit was 5/hour per IP, which carrier-grade NAT shares across many phones. Now: a per-request `headers()` WeakMap, checks run only after validation and the human check, and the default limit is 12/hour. |
| Human check | EPE LAWA's own Turnstile-style check (`lib/human-check.ts`, `components/human-check.tsx`): a signed, timestamped SHA-256 proof-of-work challenge solved in the browser. It must be at least 2.5 s old, expires after 2 h, uses no third-party script and does no tracking. If both Cloudflare Turnstile keys are set, real Turnstile is used automatically. If `FORM_RATE_SECRET` is missing, forms fall back to the honeypot plus rate limit. Note: a solved token can be reused within its window; it is a cost barrier, and the per-network limit is the hard cap. |
| Image uploads | Shared client resizer (`lib/client-image.ts`); 25 MB phone photos are reduced in the browser and stored in R2 (`lib/media-r2.ts`). Events, Ìtàn and business logos use it. |
| Events | Stepped submit modal on mobile ("Start time (WAT)" is no longer cut off), images, "Add to calendar" (Google Calendar link + `.ics` per event and a full feed). |
| Guest push | Push notifications no longer need an account: a visit plus browser permission is enough. Device endpoints and keys are **encrypted at rest** (AES-256-GCM, HKDF from `PUSH_DATA_KEY` or `FORM_RATE_SECRET`) and looked up by an HMAC hash; the table is service-role only. The "linked to a member account… Sign in to turn them on" copy is removed. Delivery uses standard Web Push (VAPID), which Chrome routes through Firebase Cloud Messaging, so no Firebase SDK is needed. |
| Scheduled radio push | pg_cron runs `push_radio_tick()` every minute. It queues a send at each programme's start (Lagos time) and pings `/api/push/scheduled`, which fans out to subscribed devices. It works with every EPE LAWA tab closed. The "works while this site is open, without an account" copy is removed. With `radio_schedule` empty, the documented Thursday 13:30 slot is used. |
| Onboarding prompt | "Stay connected to Epe." slides up from the bottom centre shortly after arrival; permission is requested **only** when the visitor clicks Enable. Respects reduced motion. |
| Cookie banner | Fixed to the page bottom, with no entrance animation or movement. |
| Nav audit | Added the missing **Events**, **Newsletter** and **Support** links to the desktop menu, drawer and footer navigation (all public routes are now reachable). |
| Desktop | Hamburger hidden at ≥961px (links are in the bar); the EN/YO switch sits in the masthead there. |
| Drawer | Smaller text, 2–3 column groups, no scrolling at 375×812 (measured 810/810), above the dashboard top bar. The language switch moved to the Account row so focus order is Close → sections → language → account. |
| Ticker | No dots, single baseline. |
| Buttons | Every form button has a visible style. |
| Admin | Floating Support button removed on admin: `apps/admin/app/layout.tsx` no longer renders it, and `FloatingSupport` returns nothing on `/admin*`. New staff Events page plus nav/capability entry; review pages show guest submitters. |
| Yorùbá | Choosing YO now translates the interface: 1,873 dictionary entries in `lib/yo/part-1..8.ts`. They are applied only to nodes React has already hydrated, so streamed sections cause no hydration errors. User content (articles, names, businesses) stays as written. Machine-assisted first pass — **a native-speaker review is still needed.** |

## Migrations (all applied to production, additive)

| Version | Purpose |
| --- | --- |
| `20261128000000_public_submissions_and_media` | Guest submitter columns, image keys, events anon read, staff event RPCs, Ìtàn correction queue, regex fix |
| `20261128010000_form_rate_scope_repair` | Adds the new limiter scopes to the CHECK and function |
| `20261128020000_guest_article_corrections` | Guest name/email on correction reports |
| `20261128030000_article_correction_staff_read_repair` | Staff read policy drift fix |
| `20261128040000_appeal_song_request_read_repair` | Policy drift fix |
| `20261128050000_guest_web_push_and_radio_schedule` | `web_push_devices` (encrypted), schedule settings, scheduled sends, `push_radio_tick`, pg_cron job; grant hardening (views read-only, `primary_administrators` revoked from anon/authenticated, TRUNCATE/REFERENCES/TRIGGER revoked) |
| `20261128060000_push_and_history_index_repair` | `updated_at` triggers on the two push tables; indexes on `history_correction_requests` FKs |

`20261128050000` now guards `pg_cron`/`pg_net` so the PGlite schema test can run it; the production behaviour is unchanged.

## RLS / data exposure

RLS is enabled on every public table. Personal data (emails, names, phones, push endpoints) is reachable only through staff, own-row or deny-all policies. Anonymous users see business contact fields only on published listings. Push device data is encrypted, so a leaked row is useless without the server key.

## Environment needed (owner)

* `FORM_RATE_SECRET` (≥32 bytes) — rate limiter, built-in human check and push encryption. Optional `PUSH_DATA_KEY` to separate push encryption.
* Push: `NEXT_PUBLIC_WEB_PUSH_ENABLED=true`, `WEB_PUSH_VAPID_*`, `PUSH_DISPATCH_SECRET`.
* Optional Cloudflare Turnstile: both `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
* The cron pings `site_origin` (`https://epelawa.vercel.app`, checked live). If the domain changes, update `push_schedule_settings.site_origin`.
* Grant someone `events.review` (no account holds it yet); add `radio_schedule` rows for exact programme times.

## Tests

Categories follow the repo rule (regression / outdated / environment).

* `tsc --noEmit` main + admin: clean.
* `pnpm run build`: success.
* `test:node`: run with the built app and CI=true. 448 pass, 0 fail, 1 skip (skip is pre-existing).
* vitest: 157/157 (adds `human-check.test.ts`).
* Browser smoke (Playwright, Chromium 158 via `@sparticuz/chromium`, 320/375/768/1024/1440): the first full run found one regression and one outdated locator.
  * The drawer focused the new language switch instead of Close. Fixed by moving the switch.
  * The `/News/` locator also matched the new Newsletter link. Tightened to `/^News$/`.
  * After the fixes, the affected spec passes (26/26 incl. keyboard). Two specs are flaky on cold compiles and pass on retry.
* **Outdated tests updated** because the owner changed the behaviour (member-only → guest submissions, open-page reminder → scheduled push, Ìtàn corrections via own queue, sponsor slot on radio, Yorùbá enabled, photo uploads on Ìtàn, ticker 18 s): `business-directory`, `features-batch2`, `community-history`, `history-admin`, `home-corrections`, `itan-ilu-mi-prd`, `news-listing`, `public-copy-availability`, `tourism`, `tourism-contribution-input`, `schema` (8-arg history RPC), vitest `business-submission`, `i18n-parity`, `r2-image-backup`, `radio-reminder-ui`, smoke `public-shell`/`public-routes-audit`, plus the route manifest (`/admin/events`).
* Regression fixed in admin: `resolveHistoryCorrection` now creates the staff client outside `try`, so an expired session bounces to login.
