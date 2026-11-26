# Platform UI test report

All results below were produced in this sandbox on the branch's production build (`next build --webpack`, then `next start`) unless noted. Headless Chromium only. **No real-device, Safari, Firefox or screen-reader testing was done**, and an automated pass is not a WCAG conformance claim.

## Scripted interaction checks: `docs/route-audit/interactions.mjs`

**82 / 82 passed**: 44 distinct checks run at 375×812 and 1440×900. Layout checks are viewport-specific (desktop width or popover at 1440, sheet at 375); the rest run at both. Results: `docs/route-audit/interactions/interactions.json`.

| Area | Checks |
|---|---|
| Search dialog | Trigger is a button with an accessible name. Title and subtitle; placeholder; input focused on open; desktop width within 600–720; mobile full-height sheet; 1 character shows a hint and sends no request; results grouped; ArrowDown moves into and through results; stale (slower, older) response ignored; no-results state; error state from the **real** API, plus a retry control; focus trapped while open; Escape closes; focus restored to the trigger; backdrop click closes; `/` opens the dialog; no horizontal overflow with the dialog open |
| Legacy URLs | `/search?q=` redirects home with the dialog open and the query kept; redirect params cleaned from the address bar |
| Notification Centre | The bell is a button with no badge when signed out; subtitle; desktop popover within 380–440; mobile bottom sheet full width; close button; Escape and focus restore; honest signed-out feed and push states; denied permission shows "Blocked" with recovery steps and no Enable button; member feed shows an honest empty state; member push "Off" with Enable and topic switches; **enabling without a push service reports failure and never false success**; no unread badge without real unread rows |
| Onboarding | Not shown immediately on load; appears for a signed-in member after the delay; exact copy; three buttons; topic toggles revealed by "Choose what I receive"; "Not now" remembered; never re-prompts after dismissal; never shown once the browser permission is decided; never shown to signed-out visitors |

### How the environment was simulated (and what that means)
- `/api/search` was mocked in the browser for the result, empty and stale checks. The error check uses the real API, which fails against the stub because the stub has no business, people, forum or tourism tables.
- `/api/notifications/subscribe` and the browser-side `notifications` read were mocked for the member test, because the stub sends no CORS headers. Server-side, the route was verified directly: a fixture-session GET authenticates and returns **503** when preferences cannot be read. That is the honest failure, and it showed up only after a local proxy misconfiguration (the source of the earlier 401) was fixed.
- Headless Chromium reports `Notification.permission` as `denied` even after `grantPermissions`. The "fresh browser" cases stub only the permission getter and `requestPermission`. The real `pushManager.subscribe()` still runs and fails because headless has no push service, which is exactly what the failure check asserts.
- **Real push delivery was not tested.** No production pushes were sent, and production has 0 subscriptions.

## Defects found by these checks and fixed
1. **The focus trap leaked.** With native `showModal()`, Tab could leave the dialog for the browser chrome. Fixed with the shared `trapTabKey()` on the search dialog and the Notification Centre.
2. **The topic switches showed preferences from a previous subscription while the device was off.** Fixed: stored topics are applied only when this device is subscribed.
3. **A stalled feed request left an endless skeleton.** Fixed with a 10 s abort leading to the "could not be loaded / Try again" state, plus an sr-only "Loading notifications…" status.
4. **Switch styling** was overridden by the global checkbox rule. Fixed (see `PLATFORM_UI_VISUAL_REVIEW.md`).

## Unit and static tests (clean environment, CI order)
`env -i … CI=true pnpm typecheck && pnpm build && pnpm test`

| Step | Result |
|---|---|
| `pnpm typecheck` (turbo, 5 tasks) | pass |
| `pnpm build` (turbo, 2 tasks) | pass |
| `test:node` | **448 pass, 0 fail, 1 skip** (449) |
| vitest | **152 / 152** (49 files) |
| `pnpm audit --audit-level=high` | no known vulnerabilities |
| `git diff --check` | clean |

Retargeted tests are listed with reasons in `PLATFORM_UI_CHANGELOG.md`. Each one moved because the feature moved (for example, the `/search` page became a dialog plus a redirect). The guarantees were kept, and none were deleted.

## Browser smoke suite
See `ROUTE_TEST_REPORT.md`.
