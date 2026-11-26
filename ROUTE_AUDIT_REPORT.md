# Route audit report: non-admin routes

Baseline `4bea03d` → branch `arena/52ed10d5-epe-lawa`.

- Routes: 43 page routes at baseline, **44** now (`+ /itan-ilu-mi/correction`). `/search` is now a redirect handler.
- 46 paths × 10 viewports audited before and after, in both data states (1,840 automated captures), plus 82 scripted interaction checks and 39 forum flow checks.
- Evidence paths are relative to `docs/route-audit/`.

## Summary (populated data, 460 captures each)

| Metric | Before | After |
|---|---:|---:|
| Horizontal page overflow | 0 | **0** |
| Lorem ipsum | 0 | **0** |
| Duplicate provider naming | 0 | **0** |
| False "On air now" (no scheduled show) | 10 | **0** |
| Progress bars (excluding the `/auth` step indicator) | 0 | **0** |
| Targets < 44 px | 65 | **0**¹ |
| h1 ≠ 1 | 43 | **2**² |
| Console errors | 20 (`/map` CSP) | **10**³ |
| Non-200 | 1 (`/itan-ilu-mi/correction` 404) | **0** |

¹ The full after-run recorded 20, all fixed and re-verified. They were the breaking-ticker headline on `/` and `/news` at ≥768 px, plus the same homepage seen through the two `/search` redirect rows. After the ticker fix, a re-check of `/` and `/news` at all 10 viewports recorded 0.
² Both are `/dashboard` captures caught mid-redirect for signed-out visitors (loading shell, then `/login`). They are present at baseline too; see P3-4.
³ All on `/search?q=market`: the redirect opens the search dialog, and `/api/search` returns 503 because the stub has no business, people, forum or tourism fixtures. The dialog shows its error and retry state. This is environmental (see P3-6).

In the read-failure data state (every DB read failing): small targets 55 → 0, h1 ≠ 1 40 → 0, false on-air 10 → 0, `/map` errors 20 → 0.

## Findings

Status key: **Fixed** = implemented and verified; **Owner** = needs an owner decision or asset; **Doc** = documented, out of scope.

### P0
No P0 findings. There were no security exposures, no data-loss paths and no invented content on any route.

### P1

| # | Route | Finding | Evidence | Repro | Fix | Status |
|---|---|---|---|---|---|---|
| P1-1 | `/radio` | False live claim: "On air now: station programming" with a red live dot whenever the page is open, even with no EPE LAWA programme scheduled. | `before-data` `onAirClaim` true on 10/10 captures; `before-data/screens/radio-375.jpg` | Open `/radio` at any time with no scheduled programme. | The red marker and "On air now: X (per schedule)" appear only when the schedule says a programme is on. Otherwise: "No EPE LAWA programme is scheduled right now…", or "The programme schedule is unavailable" if the read fails. | Fixed (0/10) |
| P1-2 | `/map` | The OpenStreetMap iframe was blocked by CSP: with no Turnstile key, `frame-src` was dropped (falling back to `default-src 'self'`); with a key, only Cloudflare was allowed. | 20 console errors on `/map` | Load `/map`; the console shows a `frame-src` violation and the map area is blank. | `lib/csp.ts`: `https://www.openstreetmap.org` is always in `frame-src`. | Fixed (0 errors) |
| P1-3 | `/forum/thread/*` | A failed reply redirected to `/forum?forum_error=` (the forum home), losing the reply text and the thread context. There was no pending state. | Code: `4bea03d:app/forum/actions.ts` `fail()` | Reply in a locked thread, or as a member with an inactive profile. | `replyWithState` plus `ReplyComposer`: inline `role=alert` error, the draft kept, focus returned to the input, Send disabled while pending, success only after the DB confirms. | Fixed (`forum/forum-flows.json`, 39/39) |
| P1-4 | `/forum/thread/*` (mobile) | The floating Support button covered the composer's Send button at 320 to 767 px. | Observed in the first `forum-flows` run (screenshot since replaced by the fixed state); widget `bottom: 84px` vs the sticky composer at `bottom: 0` | Open any thread at 375 px. | The composer publishes `--forum-composer-h`, and the widget sits above it on phones unless the member dragged it. | Fixed (overlap check passes at 320, 375 and 1440) |
| P1-5 | Header bell (all routes) | The bell was a link to `/radio/reminders`. There was no notification centre and no way to opt in to News push. | `4bea03d:components/radio-reminder.tsx` | Click the bell. | The Notification Centre (see `PLATFORM_UI_*`). | Fixed |
| P1-6 | Push (backend) | Subscribing never wrote `notification_preferences`, and dispatch sends only where `push_news`/`push_radio` is true, so a subscriber would have received nothing. | `4bea03d:app/api/notifications/subscribe/route.ts` | Subscribe, then dispatch `news_published`: 0 recipients. | POST upserts topics; PATCH and DELETE added. | Fixed (no production subscribers existed: 0 rows) |
| P1-7 | `/itan-ilu-mi/correction` | The route did not exist (404). The correction form was inline on the archive page. | `before-data` status 404 | Visit the URL. | A dedicated page with steps, the private intake form, the intake-disabled state and "never published". | Fixed (200 at all viewports) |

### P2

| # | Route | Finding | Fix | Status |
|---|---|---|---|---|
| P2-1 | `/tourism` | 6 caption links at 300×20 | 44 px tap targets | Fixed |
| P2-2 | `/radio` | Mute button 36×36 | 44×44. The station name now wraps to 2 lines at ≤480 px instead of truncating to "Radio Lag…" | Fixed |
| P2-3 | `/`, `/news` (≥768) | Breaking-ticker headline 219×23 | Ticker links get a 44 px minimum height (band +2 to 4 px; homepage design unchanged) | Fixed |
| P2-4 | `/radio/archive`, `/news/author/*`, `/newsletter/unsubscribe` | Breadcrumb and back links 23 px tall | `.ui-back-link` and the unsubscribe back link are 44 px | Fixed |
| P2-5 | Invalid slugs: `/business-directory/*`, `/forum/category/*`, `/forum/thread/*`, `/who-is-who/*` | No h1 when the read fails (the `EmptyPanel` title was an h2) | `EmptyPanel as="h1"` | Fixed (h1 = 1 on all 40 captures) |
| P2-6 | `/forum/thread/*` | Reactions reverted silently on failure; the signed-out link went to `/forum`; a glyph heart | Inline `role=alert` reason, `next=` the current thread, SVG heart, 44 px | Fixed |
| P2-7 | `/forum/thread/*` | "Report" on the member's own (blue) bubble was near-invisible, and its target was 18 px tall | Light text on own bubbles; 44 px summary | Fixed |
| P2-8 | `/forum/thread/*` | The post-reply redirect pointed at `#latest`, but no element had that id; the composer draft persisted after a confirmed send | `id="latest"` on the last message with a header-clearing scroll margin; the draft is cleared only when the action returns no new (error) state | Fixed |
| P2-9 | `/who-is-who/[slug]` | No compact action row; source links were small | `person-head` layout, compact 44 px buttons (Back, View sources, Suggest a correction), `ui-tap-link` | Fixed |
| P2-10 | `/news` | The category rail could widen its flex parent with many categories; focus rings were clipped by the scroller | `min-width: 0`, overscroll containment, scroll-snap, inset focus ring | Fixed (0 overflow, including `news-many` at 320) |
| P2-11 | `/search` | A standalone page; the brief requires a modal | Dialog plus a 308 redirect that keeps `q` | Fixed |
| P2-12 | `/radio` | Provider named twice in one line ("Guts FM catalogue powered by Naija Radio") and the link was small | "Station catalogue: Naija Radio ↗", 44 px, with "opens in a new tab" for screen readers | Fixed |

### P3

| # | Route | Finding | Status |
|---|---|---|---|
| P3-1 | `/forum/thread/*` | Bare "•" avatar for members without a photo | Fixed: initials |
| P3-2 | `/forum/thread/*` | The meta line could start with "·" when wrapping; an empty notices region added a gap | Fixed |
| P3-3 | `/itan-ilu-mi/correction` | The enquiry "Back" button was an unstyled native button | Fixed: `btn-secondary` |
| P3-4 | `/dashboard` | The loading shell has no heading before the signed-out redirect to `/login` | Doc: transient, auth flow deliberately not touched |
| P3-5 | Invalid slugs | Soft 200 rather than 404 when the database read *fails* (a true not-found still calls `notFound()`) | Doc: correct for transient failures (avoids de-indexing on a blip) |
| P3-6 | `/api/search` | All-or-nothing: if any one of the 5 collection reads fails, the dialog shows "Search is unavailable" instead of partial results | Doc: deliberate, so a missing bucket is never presented as "no results". All 5 tables exist in production |

## Owner inputs (not fabricated)

1. **Radio ad slot:** no approved provider logo asset exists in the repo or storage. The compact ad slot with disclosure is not shipped until the owner supplies the approved logo file and the advertiser link.
2. **Ìtàn Ilú Mi image uploads:** need a schema change (a private `history_submission_media` table or column, plus an R2 private prefix and a review-gated publish step). This is not done because the brief forbids schema changes unless genuinely necessary. Design in `ROUTE_IMPROVEMENT_PLAN.md`.
3. **Map and business data:** production has 1 published business and 0 tourism destinations. Nothing was invented, so the pages show honest empty or sparse states until content is approved.
4. **Yoruba strings** (e.g. "Ìtàn Ilú Mi") need native-speaker review.
