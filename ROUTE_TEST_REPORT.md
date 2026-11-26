# Route test report

All results come from this sandbox and the PR's GitHub checks. Headless Chromium only; **no real-device, Safari, Firefox or assistive-technology testing**, and no WCAG conformance claim is made from automated checks.

## 1. Static, unit and build (clean env, CI order)
| Step | Result |
|---|---|
| `pnpm typecheck` | pass (5/5 turbo tasks) |
| `pnpm build` | pass (2/2) |
| `test:node` | **448 pass / 0 fail / 1 skip** (449) |
| vitest | **152 / 152** (49 files) |
| `pnpm audit --audit-level=high` | no known vulnerabilities |
| `git diff --check` | clean |
| GitHub `CI / verify` on PR #274 | **pass** |
| CodeQL, Strix security review | **pass** |

### Failures found along the way, and their categories
| Test | Category | Resolution |
|---|---|---|
| `features-batch1` #191: `/search` redirect assertion | Outdated (the feature moved) | Asserts the 308 and `open: "search"` params |
| `forum-community-live` #226: composer class in the thread page | Outdated (the composer was extracted) | Asserts `<ReplyComposer />` and the class in `reply-composer.tsx` |
| `news-feature-readiness` #319: reads the deleted `notification-prompt.tsx` | Outdated (component replaced) | Same guarantees on `push-client.ts` and `push-onboarding.tsx` |
| `vitest/structured-data`: SearchAction `/search?q=` | Outdated (intentional) | `/?open=search&q=` (no redirect hop) |
| `foundation` #238: site URL `http://127.0.0.1:3100` | Environment | Passes after a clean `pnpm build`; the sandbox build had a local URL baked in |
| `foundation` #241: `fetch failed` | Environment | Seen once, in the same run as #238 (a sandbox-env build was in `.next`); passed in the clean CI-order run and in GitHub CI; not reproduced |

No test was weakened or deleted. Each retargeted assertion checks the same behaviour at its new location.

## 2. Browser smoke suite (`playwright.smoke.config.ts`, 67 tests)
| Run | Result |
|---|---|
| GitHub "Browser smoke / public shell" on PR #274 | **success** |
| Local, `--retries=1` (matches CI) | **65 passed, 2 flaky, 0 failed** (exit 0). The same profile as turn 2 (65 + 2 flaky) |
| Local, no retries | 64 passed, 3 failed: all `next dev` compile timeouts, see below |

Two smoke tests were **retargeted** because the bell changed by design. `public-shell` "radio reminder bell…" and `public-routes-audit` "radio keeps listening…" now go bell → Notification Centre → "Thursday radio reminder" → `/radio/reminders`. The full opt-in and opt-out flow is kept.

Flaky tests: these fail only on a cold `next dev` compile and pass on retry and in isolation.
- `news groups, linked covers and pagination at 320px`: the failure screenshot shows the dev "Compiling" badge after the article click. It passed 3/3 in isolation (cold first run 17.6 s, the same as baseline).
- `public routes … overflow at 320px / 1440px`: a 240 s budget spent waiting on route compiles, or a dev-server connection reset.
- `radio reminder bell…`: the screenshot shows `/radio/reminders` already rendered with a "Rendering" badge, reached just after the 10 s URL assertion.
- `signed-in mobile Discover…`: failed once with a CSP console error from the dashboard's own notifications query; passed on re-run.

## 3. Route sweep (`docs/route-audit/audit.mjs`)
46 paths × 10 viewports, in two data states, before (`4bea03d`) and after: 1,840 captures. Summary in `ROUTE_AUDIT_REPORT.md`; raw rows in `docs/route-audit/*/metrics-*.json`.

| Populated state | Before | After |
|---|---:|---:|
| Page overflow | 0 | 0 |
| Small targets | 65 | 0 (after the ticker fix; re-checked on `/` and `/news`) |
| h1 ≠ 1 | 43 | 2 (signed-out `/dashboard` mid-redirect, also at baseline) |
| False on-air | 10 | 0 |
| Console errors | 20 | 10 (the search API 503 against the stub: environment) |
| Non-200 | 1 | 0 |

News stress (`news-many`, 10 viewports): 0 overflow on `/news` and the author page. The console errors there are fixture images on `images.example.com`, which does not resolve in the sandbox.

## 4. Interaction and flow scripts
| Script | Result |
|---|---|
| `interactions.mjs` (search, notifications, onboarding, redirect) | **82 / 82** |
| `forum-flows.mjs` (thread, composer failure, reactions, widget overlap) | **39 / 39** |

## 5. Not tested
Real devices; iOS and Android push delivery; Safari and Firefox; VoiceOver, TalkBack and NVDA; Lighthouse for this branch (TBT is unreliable in this sandbox); the production deployment (not deployed, by instruction); and the Vercel preview, which needs a Vercel login.
