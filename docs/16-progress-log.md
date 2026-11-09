# EPE-LAWA — Timestamped Progress Log

**Time zone:** Africa/Lagos (UTC+01:00).
**Last scope update:** 2026-11-07.

## Current scope and rules

The current release includes all eight client-approved sections (3.1–3.8): Trending News; Itan Ilu Mi / My Community History; Chat Forum / Digital Village Square; Map & Navigation; Epe Business Directory & Marketplace; Historical Sites & Tourism; EPE LAWA Radio; and Who is Who in Epe. Cross-cutting requirements are web member signup/verification/login/recovery, secure staff sessions/capabilities, admin analytics, news publishing, branded transactional email templates, audit, privacy, accessibility and full Playwright testing.

This scope corrects stale documentation. Historical entries below record prior statements at the time and are not current scope or proof that features exist. Use Sckooly’s public-site structure with original EPE-LAWA content and the latest owner-approved cobalt palette, compact 90% typography and a full from-scratch UI rebuild informed by Sckooly, GetQuant and JĀSĀB; do not copy assets.

An active, verified staff member with `article.publish` may publish directly without a required second reviewer. Stale revisions are denied and transitions audited. Test content stays private in isolated environments; production is read-only. Current Map behavior builds safe outbound Google Maps search/directions URLs only; no API key or verified Places/geocoding integration exists. Offline maps are optional future work. Email and Paystack provider readiness are unconfirmed.

## Historical timeline and evidence

- **2026-11-07 18:50:45** — Earlier Node 22 typecheck and optimized builds passed before later route/auth/UI edits; rerun required.
- **2026-11-07 18:51:07** — Earlier full unit/schema/smoke suite reported 47 pass, 4 fail, 1 skip; stale and not a current release result.
- **2026-11-07 18:52:24–18:52:56** — Earlier focused admin auth/session tests reported 6/6 with local mocks; not full E2E evidence.
- **2026-11-07 19:11:49** — Supplied Vercel log: `main` commit `8885e16` failed due to unresolved helper imports; Turbo warned configured env names were filtered.
- **2026-11-07 19:15:57** — Read-only fetch of public alias returned older site content, not the current branch.
- **2026-11-07 19:16:15** — Vercel API inspection required authorization; current preview state not verified.
- **2026-11-07 19:07–19:22** — Earlier task notes recorded changing scope decisions, including an interim all-section direction. These are historical only; the authoritative current scope is all eight sections 3.1–3.8.

## Current verification snapshot

No current full all-eight local/preview release pass, provider delivery, or live RLS pass is asserted in this log. A read-only production baseline is recorded below but does not verify this feature branch. No isolated Supabase development branch was created. No production writes are authorized.

### 2026-11-08 — Cobalt and motion polish, local evidence

- The appearance switch, half-width mobile drawer with outside-close behavior, concise navbar lockup, dot-free editorial labels and two-column footer are implemented. The custom Tidegate motif covers initial loading and route fallbacks; scroll sections blur/lift into view with reduced-motion fallbacks.
- Node 22.23.4: both app TypeScript checks and optimized production builds passed. The complete frontend/backend suite reported **121 tests: 120 passed, 0 failed, 1 skipped**. The skipped case is the documented PostgreSQL exclusion-constraint case unsupported by PGlite.
- A local Playwright run checked 21 public pages and staff login at 320/375/768/1024/1440px. Theme switching, measured drawer widths (150/177.5/215px), outside-click closure, two footer columns, scroll-transition completion and no horizontal overflow passed; no browser page errors were reported. Initial preloading was observed at every width. Nine anonymous staff routes retained HTTP redirects to login. Reduced motion and a nonblocking preloader without JavaScript were checked.
- The attempted staff root loading boundary was removed after it changed the auth redirect into a streamed response; `foundation.test.mjs` now passes with the protected-route fallback retained. No protected data was exposed by the fallback.
- Changed-source credential/payload scanning and an independent read-only review found no credential material, concrete prompt-injection/exfiltration payload, or obvious remaining security regression.
- These are local UI and automated test results, not a full live-data release pass. Missing local Supabase configuration prevents real member/data workflows; unavailable/error states were not counted as successful authenticated flows. Hosted preview access protection and unavailable GitHub individual check-run permissions remain separate gates. No merge or production deployment was performed.

## Immediate verification priorities

1. Verify all eight in-scope routes and member authentication journeys.
2. Verify protected staff sessions, capability checks, analytics, direct authorized article publishing, stale revision denial and audit.
3. Test private history submissions, forum moderation and business/order workflows in isolated environments.
4. Confirm current map behavior is represented as outbound URL handoff, not API integration.
5. Run full Playwright at required responsive sizes and accessibility checks; record results without overclaiming.
6. Keep email/Paystack-dependent actions unavailable until provider setup and isolated testing are confirmed.

- **2026-11-07 20:43** — Owner reaffirmed web scope: all eight client brief areas 3.1–3.8, plus cross-cutting auth/admin/email/security/privacy/analytics/testing. Only native mobile apps are deferred. Preserve section 5 future enhancements (event ticketing, emergency contacts, scholarship/job board, e-learning, English/Yoruba, AI local assistant) in the complete roadmap. Documentation/public-copy scope correction only; no tests or deployments run.
- **2026-11-07 21:22** — Read-only Playwright baseline against `https://epelawa.vercel.app` covered all eight module routes at 320/375/768/1024/1440 px and the public auth routes. News, Radio and Who-is-Who returned 200; Itan Ilu Mi, Forum, Map, Business Directory, Tourism and the auth routes returned 404; Radio overflowed at 320/375 px. This is the older production deployment, not the feature branch. No forms were submitted and no production writes occurred; the feature-branch preview remains unverified.

### 2026-11-08 — Urgent official-logo hero patch (PR #17)

- The owner prioritized the supplied EPE LAWA logo in the homepage hero. This isolated patch replaces the editorial artwork with the existing official logo in an uncropped responsive white panel, without shipping unfinished account/News/admin/module changes.
- Node 22.23.4/pnpm 10.34.9 `pnpm typecheck`, both app production builds, and the complete test suite passed: 120 passed, zero failed, one skipped. The old illustration-only regression assertion now protects the requested official-logo behavior.
- Production-build Playwright checks at 320/375/768/1024/1440 CSS px confirmed HTTP 200, the correct 1348×1167 logo, `object-fit: contain`, and no horizontal overflow. No production writes were made. Production deployment is checked separately after the PR gate; local checks alone do not prove the public alias updated.

### 2026-11-08 — Navbar and compact notice refinement, review hold

- The first PR also refines the navbar/menu: Sign in remains visible at all tested widths, theme/menu controls fit, destinations scroll independently, and Create account/Sign in stay pinned in the drawer. Keyboard Escape and outside-click closure remain intact.
- Inspected the real JĀSĀB offline notice in a disposable browser context: 13px title, 11px support copy, 8px radius, approximately 61px high. EPE LAWA uses the same compact hierarchy in its cobalt palette with 44×44px action targets and unchanged measured connectivity/live-region behavior. The storage notice is also compact.
- Current Node 22/pnpm 10 gate passed typecheck, both production builds and the full suite: **123 tests, 122 passed, zero failed, one documented PGlite skip**. Local production-build Playwright checks passed at 320/375/768/1024/1440px: official uncropped logo, no horizontal overflow, visible header Sign in, pinned account actions, Escape/outside closure, true browser-context offline notice followed by probe-confirmed Back online, compact dimensions and 44px toast buttons.
- Desktop/mobile screenshot files were captured for owner review. **No merge or production deployment is authorized until the owner reviews the screenshots and gives a fresh go-ahead.** This supersedes the earlier instruction to merge the hero/menu first. The larger redesign is not included in this isolated patch.

### 2026-11-08 18:19 — Auth callback recovery, local verification

- Added sanitized expired/invalid email-link routes, a query/hash error router that removes callback parameters before navigation, a same-origin verification resend action, and fixed safe callback destinations for signup and password recovery. Provider error descriptions and token values are never rendered. The earlier screenshot-review hold above is superseded by the owner's newer instruction to continue with individually verified PRs and merge after their checks pass.
- Node 22.23.4/pnpm 10.34.9 typecheck, both app production builds, and the full suite passed: **127 tests, 126 passed, 0 failed, 1 documented PGlite skip**. Focused callback/foundation integration tests passed **7/7**. Local Chromium checks passed **3/3** for expired query, expired hash, and generic error callbacks; URLs were cleaned and recovery actions rendered without public header/footer. Four clean mobile/desktop screenshots were captured outside the repository.
- Supabase email delivery was not exercised against the hosted project; the UI truthfully states that delivery depends on the project's email configuration. No production Auth settings, migrations, or data were changed.


### 2026-11-08 18:34 — Shared web typography, local verification

- PR #18 (sanitized auth-link recovery) was merged to `main`; this isolated typography branch starts from merge commit `2689c79`. Both web apps now load the variable Plus Jakarta Sans family locally using `@fontsource-variable/plus-jakarta-sans@5.3.0` (SIL Open Font License 1.1; upstream font release v12), replacing the remote Inter loader and removing the remaining Georgia exceptions. The complete OFL license is served at `/licenses/plus-jakarta-sans-OFL.txt` from each app.
- Node 22.23.4/pnpm 10.34.9 typecheck passed (5/5 tasks); both production app builds passed (2/2 Turbo tasks; local dummy Supabase URL/key only); the full suite reported **129 tests: 128 passed, 0 failed, 1 documented PGlite skip**. The new focused font/license checks passed **2/2**.
- A loopback-only Chromium smoke checked the public homepage at 1440px, public sign-in at 375px, and staff sign-in at 1440px and 375px. All four returned HTTP 200, computed the same Plus Jakarta Sans family, passed `document.fonts.check`, loaded local WOFF2 assets, and made zero non-loopback requests. Both apps served their full OFL file with HTTP 200 (4,534 bytes). Four interim screenshots are at `/workspace/epe-lawa-release-screenshots/phase2-plus-jakarta/`.
- These captures verify typography/loading only; they are not final design acceptance. In the inspected base, public sign-in and staff sign-in still show shared footers, so the owner's focused auth/admin chrome and broader page redesign remain open for separate verified steps. No production Auth settings, migrations, database data, or deployment were changed.


### 2026-11-08 18:56 WAT — PR #19 merged; production font check

- PR #19 (`feat/plus-jakarta-sans-web`) was merged to `main` at `bca28d59422736fd46e75aa532cfc76ffe3823e` after the exact-commit Vercel preview reached READY. The post-merge production deployment also reached READY; a read-only check of `https://epelawa.vercel.app/` confirmed the served CSS and same-origin Plus Jakarta Sans font assets. No Supabase settings, migrations, or production data were changed.

### 2026-11-08 19:00 WAT — PR #20 auth-shell work started

- The isolated branch `feat/auth-shell-chrome` starts from merged `main` at `bca28d59422736fd46e75aa532cfc76ffe3823e`. Scope is presentation only: centered, branded sign-in/sign-up/recovery screens; focused callback/error chrome; and route-scoped removal of public header/footer. Auth actions, Supabase configuration, migrations, and production data remain untouched.

### 2026-11-08 19:17 WAT — PR #20 local verification

- Replaced the two-column account presentation with a centered responsive member card and shared brand/theme controls. Auth, callback issue, 404, and runtime-error screens hide public navigation/footer while retaining theme controls and recovery actions. The informational storage notice remains visible with its privacy link but now flows after content on focused routes; real connectivity notices also flow rather than covering form controls. Public-page notice behavior is unchanged.
- Node 22.23.4/pnpm 10.34.9 workspace typecheck passed (5/5 tasks); both web app builds completed (main rebuilt and admin build reused its cache); focused auth/callback/member/notices tests passed **10/10**. The full suite reported **132 tests: 131 passed, 0 failed, 1 documented PGlite skip**.
- Local production-build Chromium checks covered seven auth/recovery/404 routes at 1440px desktop and 375px mobile: **14/14** route/viewport checks passed. All had expected status/headings, no public chrome, local font ready, no horizontal overflow, no external hosts, and no page errors. The manual theme default/persistence check passed. The privacy notice was `position: static` and did not intersect the content panel on all 14 checks. Eleven fresh screenshots are in `/workspace/epe-lawa-release-screenshots/phase3-auth-shell-final/`.
- These are local UI/code checks only. No production Supabase settings, migrations, or data were changed; hosted email delivery was not tested.
- Independent read-only review found no auth/security regression. It noted that the nonblocking storage notice may be below the initial viewport on tall focused screens; this is an intentional tradeoff to keep the notice in document flow rather than covering inputs. The signup form retains its own Privacy link.


### 2026-11-08 20:23 WAT — Staff session-cookie chunk handling (pre-PR)

- Added a shared bounded parser/writer for host-only staff session cookies. It reassembles contiguous numbered chunks for authorization, refresh follow-up, Supabase client construction and logout; malformed, missing, duplicate or out-of-range fragments fail closed. Initial sign-in and refresh now use the same 4,000-character chunk writer, expire stale fragments when a session shrinks, and reject oversized payloads. `__Host` cookie flags remain `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, with no `Domain`.
- Node 22.23.4/pnpm 10.34.9 typecheck passed (5/5 tasks); both web production builds passed (2/2 tasks) with only reserved `.invalid` Supabase URLs and dummy keys. Focused staff session/sign-in/logout/auth tests passed **8/8**. After building the clean worktree, the full suite passed **135 tests: 134 passed, 0 failed, 1 documented PGlite skip**. An initial pre-build full-suite run had three local HTTP smoke-test socket resets; those same smoke tests passed after the apps were built.
- No production Supabase settings, migrations, data or deployment were changed. This branch is not yet merged; no production-live claim is made for the fix.
