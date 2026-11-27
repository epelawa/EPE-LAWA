# November 2026 cleanup (after PR #276)

This note covers the open-ended cleanup pass after the business, radio and responsive redesign shipped. Every result below was measured; anything not measured is listed as not measured.

## 1. Shared rate ceilings (Strix finding on PR #275, CWE-770, LOW)

**Problem.** `formRateAllowance()` never passed `p_global_limit` to the `form_rate_limit` database function, so every scope used the function's default shared ceiling of 100 attempts per hour. A refused network adds nothing to the shared row, so about eight networks at the per-network limit could fill it. That would lock every visitor out of the form for the rest of the hour: sign-in, notification settings, submissions. `DELETE /api/notifications/subscribe` also charged that allowance for endpoints that had never been stored, so invented endpoints could drain it with no device behind them.

**Fix.** No migration was needed: the function already accepts `p_global_limit` from 1 to 10000.

- `frontend/apps/main/lib/form-server.ts` now sends a shared ceiling for each scope (`sharedHourlyLimit`). It **fails safe**: any scope not explicitly raised keeps the original 100/hour. Only scopes verified to send no email are raised. This was tightened after the Strix review on PR #277, which found mail-sending submission scopes on a 1000/hour catch-all.

| Scope | Shared ceiling per hour | Why |
|---|---|---|
| `auth_signin` | 500 | No email. The ceiling is also the only cross-network brake on password guessing, so it stays bounded: about 33 networks at 15 each to fill it, against 8 before |
| `push_subscribe` | 500 | No email. Every accepted subscribe writes a device row, so the ceiling bounds fake rows: about 100 networks at 5 each to fill it. Covers subscribe, topic changes and unsubscribe |
| `auth_password_change` | 500 | No email; signed-in members only |
| `forum_post`, `image_upload` | 2000 | No email; signed-in members only |
| `business_claim`, `moderation_appeal` | 1000 | No email; signed-in members with a confirmed email only |
| `auth_signup`, `auth_reset`, `auth_resend`, `auth_otp`, `business_submit`, `event_submit`, `history_submit`, `history_correction` | 100 (unchanged) | These send a staff notice and/or an acknowledgement over the shared auth-mail transport, so the ceiling guards the mail quota |
| `tourism_submit`, `article_correction`, `gallery_submit`, and any scope not listed | 100 (unchanged) | Signed-out visitors can store a row per request, so the ceiling bounds stored junk |

- `newsletter` and `enquiry` call the database function directly and still use its 100/hour default.
- The regression test works out which scopes send mail from the action files themselves (any file that calls `deliverAuthMessage`). It fails if one of those scopes is ever added to the raised table.
- The per-network limits are unchanged (the default is 12; `push_subscribe` is 5 to subscribe and 20 to change topics or remove).
- `PATCH /api/notifications/subscribe` looks the device up first. An unknown endpoint gets the same `404` as before but no longer costs any allowance.
- `DELETE /api/notifications/subscribe` looks up both the device table and the legacy table first. If neither holds the endpoint, it answers `{removed: true}` without charging. A read failure answers `503`.
- Regression test: `frontend/tests/web-push-wiring.test.mjs`, "shared rate ceilings cannot be drained by a few networks or by invented push endpoints".

**Second Strix pass on PR #277.** Sign-in and push-subscribe were first raised to 5000. Strix pointed out that each ceiling is also the only aggregate cap on password guessing and on anonymous device-row writes, so both were lowered to 500.

**Third Strix pass on PR #277.** `confirmNewsletter` charged the shared `newsletter` bucket, which guards sign-up mail, before checking the token. Confirmation sends no email and its 256-bit token cannot be guessed, so the charge was removed, matching `unsubscribeNewsletter`. The vitest case that asserted the old "through the limiter" order was outdated by this deliberate change, so it now asserts that invented tokens never call `form_rate_limit`. (Newsletter sign-up is off unless `NEWSLETTER_SIGNUP_ENABLED=true`.)

**Fourth Strix pass on PR #277.** `tourism_submit` and `article_correction` had been raised to 1000. Signed-out visitors can store a row with each request, so both went back to 100.

**Follow-ups (not done here; they need a migration or a product decision):** ~~per-account sign-in throttling or a challenge after repeated failures~~ (done, see §5); a cap on total `web_push_devices` rows plus a reaper for devices that never receive a delivery; fanout ordered by most recently active device; recording each solved human-check token as spent, so one solution cannot be replayed from many networks during its lifetime.

**Residual risk.** The mail-sending scopes keep the 100/hour ceiling on purpose. A coordinated flood from many networks can still pause signup, password reset and the business, event and history submission forms for up to an hour. That is the trade-off for not exhausting the email provider's quota.

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
- The desktop masthead language switch was 40×36. CodeRabbit flagged it on PR #277, and it is now 44×44 (`components/navigation-refinement.css`). The pill stays inside the existing 72 px masthead bar. The header height and layout measurements are in the PR.

## 4. Other checks

- **Responsive audit** (`scripts/responsive-audit.mjs`): 616 route×viewport combinations, 0 with findings. This run includes the 24 px checkbox fix from PR #276, which had not been re-audited before. Measured before the touch-target change above.
- **Dead internal links:** every literal `href`, `path` and `url` beginning with `/` in `frontend/apps/main/{app,components,lib}` resolves to a page, route, public file or configured redirect.
- **Removed features:** no UI string for song requests or the programme archive remains. The leftover entries in `lib/yo/part-5.ts` are dictionary rows only. Nothing renders them, so they were left for the owner's Yorùbá review.
- **Maintenance-gate exemptions:** `/api/human-check` and `/api/push/scheduled` are not exempt from the maintenance gate. This is consistent with the gate's purpose: forms and reminders pause while the site is down. The only scheduled job, `epe-radio-push-tick`, runs `public.push_radio_tick()` in the database and succeeded on every run in the last two days.
- **Supabase advisory query:** every public table has RLS, and every `SECURITY DEFINER` function pins `search_path`. Five views are owner-rights views readable by `anon`: `published_article_engagement`, `active_business_sponsorships`, `forum_poll_results`, `radio_status` and `business_ad_carousel`. Each one exposes only aggregate or published columns; none exposes personal data or the encrypted stream URL. They were left unchanged, because switching them to `security_invoker` would hide rows that the public pages rely on.

## 5. Per-account sign-in throttle (owner decision, November 2026)

The network limiter (`auth_signin`: 15 per network, 500 shared per hour) cannot stop many networks guessing **one**
account, and the staff login had no limit at all. Both sign-in forms now share a per-account lock:

- **Order of checks (both forms):** first the shared `auth_signin` network budget (15 per network, 500 shared per hour;
  the staff form now has it too), then the sign-in human check, then the per-account admission, then the password. A
  network-refused caller writes nothing to the per-account table.
- **Sign-in human check (Strix review on PR #280):** both sign-in forms (member `/login`, staff `/admin/login`, and the
  standalone admin app) show the site's own human check. It uses the same proof-of-work as the public forms with two
  differences. It is harder: 16 bits instead of 14, which the browser solves while the visitor types. Each solved
  token is good for **one** password check: `verifySigninHumanCheck` spends it in `human_check_spent` and refuses a
  replay. After every result, such as a wrong password, the form starts a fresh solve. If the spend cannot be recorded,
  sign-in is refused (fail closed). If Cloudflare Turnstile keys are set (`TURNSTILE_SECRET_KEY` and
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY`), Turnstile is used instead and its tokens are single-use at Cloudflare. Turnstile
  is the stronger option: the proof-of-work costs a scripted attacker running native code very little per solve. What
  it does guarantee is that every counted check needs a fresh server-issued challenge, so a plain replayed request can
  no longer arm a lock. On the standalone admin app, Turnstile would also need its script allowed in that app's CSP;
  production serves `/admin` from the main app, which already allows it. The sign-in forms now need JavaScript, as the
  public forms already did.
- **Rule:** only provider-confirmed wrong passwords count. The 8th wrong password within a 15-minute window locks that
  email for 15 minutes.
  - **Admission is atomic.** Each check first reserves a slot under a database row lock (`signin_throttle_admit`) and
    gets a reservation token. At most 8 checks per email can be spent or in flight in a window, so a burst of parallel
    requests cannot all slip past the lock (Strix review on PR #280).
  - **In-flight checks never start a lock.** When 8 checks are already spent or still in flight, a further attempt is
    refused with "Several sign-in attempts for this email are still being checked. Try again in about a minute." No
    lock is set; the lock starts only when the 8th wrong password is actually confirmed (CodeRabbit review on PR #280).
  - **What 15 minutes means:** it is the length of **each** lock, not a cap on disruption. Someone who keeps sending
    eight wrong passwords every time a lock expires can keep an account locked for longer. The lock is deliberately
    fixed rather than escalating, so each cycle costs that person eight more attempts and the account holder at most
    15 minutes. A completed password reset, or a valid emailed sign-up code, normally ends the lock at once.
  - **Re-arming (Strix review on PR #280, LOW):** because anyone can type an address, someone who knows a member or
    staff email can keep re-arming that lock. Each lock now costs them 8 network-budgeted requests **and** 8 solved,
    single-use challenges (see the human check above). The account holder always keeps a way out: see the reserved lane
    below. Staff can also lift a lock with the per-account unlock below.
  - **The way out cannot be closed (Strix review on PR #280, LOW):** password reset (`auth_reset`) and emailed-code
    checks (`auth_otp`) normally draw on a 100-per-hour budget shared by the whole site, which anyone could fill. While
    an address is **locked**, those two forms fall back to a small per-address allowance when the shared budget
    refuses: 3 reset emails and 10 code checks per address per hour (`signin_throttle_exit_allowance`). The general
    queue cannot consume it, and it opens only for a locked address, so it cannot be used to mail arbitrary inboxes.
    If someone else spends the reset allowance, every one of those emails still goes to the real owner, and the newest
    link works.
  - **Why there is no daily cap on locks:** Strix also suggested capping how many locks one address can take in a day.
    Without a lock, the 8-checks-per-window budget would keep refusing that address as "busy" anyway. So a cap would not
    let the owner in. It would only let a guesser continue past the cap with no lock. The reserved lane above is what
    restores the owner's access, so the lock stays as it is.
- **Closing each attempt** (`signin_throttle_record(key, outcome, reservation)`):
  - `"rejected"` (provider-confirmed `invalid_credentials`) counts one confirmed failure.
  - `"verified"` (successful sign-in, or `email_not_confirmed`, which proves the password) clears the email. A completed
    password reset and a valid emailed sign-up code also record `"verified"`, with no reservation needed.
  - `"unknown"` (outage, provider rate limit, or an error thrown after admission) releases the slot without counting it.
  - **Each reservation is its own slot** (`20261129050000_signin_throttle_slots.sql`, CodeRabbit review on PR #280).
    The reservation token is a random slot id. `held` maps each live slot to its admission time, and `pending` equals
    the number of held slots. A slot idle for 2 minutes belongs to a request that died without recording. It is moved
    to `released`, which is kept for 20 minutes, and its place is freed for a new check. If that late outcome arrives
    after all, a rejection still counts as a failure, once, but it frees nothing, so it can never release a slot that a
    current check holds. A cleared key or an expired lock empties both maps, so outcomes from before it change nothing.
  - **Window rollover.** A plain rollover keeps the generation, so checks still in flight stay matched. An outcome that
    lands after its window has closed rolls the window forward and counts in the window it lands in. It never adds to
    the expired window, so a lock only comes from 8 failures inside one window (CodeRabbit). It is never dropped
    either, so a batch timed across the boundary cannot win a second set of eight checks (Strix review on PR #280).
    Idle slots are released on **every** admission and every recording, including the recording that rolls the window
    forward. Seven dead requests therefore cannot keep an address "busy" into the next window (CodeRabbit).
- **Table growth bound:** at most 1000 new account keys can be created per rolling hour, twice the shared sign-in
  ceiling, so the cap never trips in normal use. Beyond it, new addresses get "temporarily unavailable" while known
  addresses keep their counts. Rows idle for a day are pruned whenever a new key is created.
- **Privacy:** the database stores only an HMAC of the email, keyed with `FORM_RATE_SECRET` (domain
  `signin-account:v1:`). Every email string is treated the same way, registered or not, so the lock never reveals
  whether an account or staff account exists.
- **One spelling:** both forms lower-case and trim the email once, and send that same string to the auth provider. The
  lock is therefore keyed on exactly the identifier that is authenticated, and a respelling (for example a capital
  dotted `İ`) cannot reach the same account under a fresh budget.
- **Fail-safe:** on Vercel, if the lock cannot be checked (missing secret or service key, database error), sign-in is
  refused with the existing "temporarily unavailable" message, matching `formRateAllowance`. Local development stays
  usable.
- **Code:** `frontend/apps/admin/lib/signin-throttle.ts` (shared helper, including `signinLockExitAllowed`),
  `frontend/apps/main/app/auth/actions.ts` (`signIn`, `requestPasswordReset`, `updatePassword`, `verifyEmailOtp`),
  `frontend/apps/main/lib/human-check.ts` (`verifySigninHumanCheck`), `frontend/apps/main/components/human-check.tsx`,
  `frontend/apps/admin/lib/login-actions.ts`, and
  `signInAdminWithPassword` in `frontend/apps/admin/lib/supabase-access.ts`, which reports `password:
  "rejected" | "verified" | "unknown"`.
- **Database:** `backend/supabase/migrations/20261129000000_signin_account_throttle.sql` (table
  `auth_signin_throttle`), `20261129010000_signin_throttle_atomic_admission.sql` (atomic admission) and
  `20261129020000_signin_throttle_reservations.sql` (separate pending and confirmed counts, reservation tokens, new-key
  cap, prune), `20261129030000_signin_throttle_window_check.sql` and `20261129040000_signin_throttle_rollover.sql`
  (window-rollover accounting), `20261129050000_signin_throttle_slots.sql` (one slot per reservation),
  `20261129060000_signin_lock_exit_lane.sql` (reserved reset and code lane) and
  `20261129070000_human_check_single_use.sql` (single-use sign-in challenges). All of it is service_role only.
- **Tests:** `backend/tests/signin-account-throttle.test.mjs`, `frontend/tests/signin-account-throttle.test.mjs` and
  `frontend/vitest/human-check.test.ts`.

### Unlocking an account

1. **Self-service (preferred):** the account holder resets their password from `/forgot-password`. Completing the reset
   lifts the lock. While the address is locked, the reset form keeps a reserved allowance even when the shared hourly
   budget is full. Clearing the lock is best effort: if the database call fails, the new password is still saved and the
   reset still reports success, but the lock stays until it expires. If the person still sees the "too many
   unsuccessful attempts" message after a successful reset, use the per-account unlock in step 2.
2. **One account, by staff:** the row key is an HMAC, so it can only be found with `FORM_RATE_SECRET`. That secret is
   held in the Vercel project environment, which only the project owner can read. With the secret in the shell
   environment, compute the key for the address:

   ```sh
   node -e 'const c=require("node:crypto");process.stdout.write(c.createHmac("sha256",process.env.FORM_RATE_SECRET).update("signin-account:v1:"+process.argv[1].trim().toLowerCase()).digest("hex")+"\n")' 'person@example.com'
   ```

   Then delete only that row: `delete from public.auth_signin_throttle where account_key = '<the 64-hex key>';`
3. **Bulk reset (emergency only, clears every account's lock):**
   `delete from public.auth_signin_throttle where locked_until > now();`
