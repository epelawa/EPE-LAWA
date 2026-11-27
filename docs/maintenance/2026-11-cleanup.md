# November 2026 cleanup (after PR #276)

This note covers the open-ended cleanup pass after the business, radio and responsive redesign shipped. Every result below was measured; anything not measured is listed as not measured.

## 1. Shared rate ceilings (Strix finding on PR #275, CWE-770, LOW)

**Problem.** `formRateAllowance()` never passed `p_global_limit` to the `form_rate_limit` database function, so every scope used the function's default shared ceiling of 100 attempts per hour. A refused network adds nothing to the shared row, so about eight networks at the per-network limit could fill it. That would lock every visitor out of the form for the rest of the hour: sign-in, notification settings, submissions. `DELETE /api/notifications/subscribe` also charged that allowance for endpoints that had never been stored, so invented endpoints could drain it with no device behind them.

**Fix.** No migration was needed: the function already accepts `p_global_limit` from 1 to 10000.

- `frontend/apps/main/lib/form-server.ts` now sends a shared ceiling for each scope (`sharedHourlyLimit`):

| Scope | Shared ceiling per hour | Why |
|---|---|---|
| `auth_signup`, `auth_reset`, `auth_resend`, `auth_otp` | 100 (unchanged) | These send email, so the old ceiling stays as a guard on the SMTP quota |
| `auth_signin` | 5000 | Sign-in must not be lockable by a few networks |
| `auth_password_change` | 2000 | |
| `push_subscribe` | 5000 | Covers subscribe, topic changes and unsubscribe |
| `forum_post`, `image_upload` | 2000 | |
| every other scope | 1000 | |

- The per-network limits are unchanged (the default is 12; `push_subscribe` is 5 to subscribe and 20 to change topics or remove).
- `PATCH /api/notifications/subscribe` looks the device up first. An unknown endpoint gets the same `404` as before but no longer costs any allowance.
- `DELETE /api/notifications/subscribe` looks up both the device table and the legacy table first. If neither holds the endpoint, it answers `{removed: true}` without charging. A read failure answers `503`.
- Regression test: `frontend/tests/web-push-wiring.test.mjs`, "shared rate ceilings cannot be drained by a few networks or by invented push endpoints".

**Residual risk.** The email scopes keep the 100/hour ceiling on purpose. A coordinated flood from many networks can still pause signup and password-reset email for up to an hour. That is the trade-off for not exhausting the email provider's quota.

## 2. Unknown slugs return HTTP 200, not 404 (measured; not changed)

**Measured** on a local production build (`next build --webpack`, then `next start`, Next 16.4.5) against the browser-smoke Supabase stub. Fixture mode was `directory`, so a real fixture business exists and an unknown slug is genuinely absent.

| Request | Browser UA | Googlebot | Bingbot | curl |
|---|---|---|---|---|
| `/business-directory/no-such` | 200 | 200 | 200 | 200 |
| `/business-directory/fixture-business-1` (exists) | 200 | 200 | 200 | 200 |
| `/no-such-page` (no route) | 404 | 404 | — | — |

The same 200 was measured on `/news/<missing>`, `/tourism/<missing>`, `/who-is-who/<missing>`, `/forum/thread/<missing>`, `/forum/category/<missing>` and `/news/author/<missing>`. Under the stub, some of these hit a read failure rather than a genuine miss, so only the business profile row above is a clean "missing record" measurement.

**Why.** `app/loading.tsx` (root) and `app/business-directory/loading.tsx` are Suspense fallbacks. Next.js commits `200 OK` when it streams the first fallback chunk, so a later `notFound()` cannot change the status. The Next 16 docs in `node_modules/next/dist/docs/01-app/02-guides/streaming.md` ("The HTTP contract") describe exactly this.

**What protects search today.** The streamed not-found response carries `<meta name="robots" content="noindex, nofollow"/>`, checked in the HTML for both browser and bot user agents. Search engines therefore do not index these URLs; they show up as "excluded by noindex" rather than as indexed pages.

**Tried and rejected.**
- Calling `notFound()` inside `generateMetadata`: rebuilt and re-measured, and the status was still 200 for browser, Googlebot, Bingbot and curl. Reverted.

**Options for a real 404.** Each has a cost, so the owner should choose:
1. Remove the root `loading.tsx` and add loading boundaries only to index pages, using route groups so they do not wrap `[slug]` children. Client navigation to detail pages would lose the instant "Finding your page." feedback, which matters on slow mobile connections.
2. Check that the slug exists in `proxy.ts` before rendering. This costs an extra database round trip on every detail-page request, and the existence rules would be duplicated outside the pages.

## 3. Touch targets (AGENTS.md: 44×44)

**Measured** at 375×812 across 17 public routes on the production build. Inline text links inside sentences were excluded. Three elements were below 44 px:

| Element | Before | Fix |
|---|---|---|
| Language switch buttons (drawer and footer) | 44×40 | `min-height: 44px` (`app/globals.css`) |
| Support drag handle | 40×48 | `min-width: 44px` (`components/floating-support.module.css`) |
| Radio volume slider | 251×32 | `min-height: 44px` (`components/radio-player.module.css`) |

- The 24×24 consent checkboxes on `/tourism` and `/itan-ilu-mi` sit inside their `<label>`, so the whole label is the hit target. They were left alone.
- The desktop masthead language switch (40×36, desktop only) is part of the header the owner specified, so it was not resized. It meets the WCAG 2.2 AA floor of 24 px.

## 4. Other checks

- **Responsive audit** (`scripts/responsive-audit.mjs`): 616 route×viewport combinations, 0 with findings. This run includes the 24 px checkbox fix from PR #276, which had not been re-audited before. Measured before the touch-target change above.
- **Dead internal links:** every literal `href`, `path` and `url` beginning with `/` in `frontend/apps/main/{app,components,lib}` resolves to a page, route, public file or configured redirect.
- **Removed features:** no UI string for song requests or the programme archive remains. The leftover entries in `lib/yo/part-5.ts` are dictionary rows only. Nothing renders them, so they were left for the owner's Yorùbá review.
- **Maintenance-gate exemptions:** `/api/human-check` and `/api/push/scheduled` are not exempt from the maintenance gate. This is consistent with the gate's purpose: forms and reminders pause while the site is down. The only scheduled job, `epe-radio-push-tick`, runs `public.push_radio_tick()` in the database and succeeded on every run in the last two days.
- **Supabase advisory query:** every public table has RLS, and every `SECURITY DEFINER` function pins `search_path`. Five views are owner-rights views readable by `anon`: `published_article_engagement`, `active_business_sponsorships`, `forum_poll_results`, `radio_status` and `business_ad_carousel`. Each one exposes only aggregate or published columns; none exposes personal data or the encrypted stream URL. They were left unchanged, because switching them to `security_invoker` would hide rows that the public pages rely on.
