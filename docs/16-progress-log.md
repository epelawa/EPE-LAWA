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

No current full all-eight local/preview release pass, provider delivery, or live RLS pass is asserted in this log. A read-only production baseline is recorded below but does not verify this feature branch. No isolated Supabase development branch was created. Production migrations, schema, hosted email settings, and user-content writes remain unauthorized while migration reconciliation is pending; any separately owner-authorized staff-access changes are kept only in the private audit record.

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
### 2026-11-08 20:11 WAT — Same-origin staff routes, initial local verification

- Implemented the owner-approved same-origin staff workspace at `https://epelawa.vercel.app/admin/*`. The existing dashboard, newsroom, history, forum, business review, orders, people, radio, and tourism pages are mounted under `/admin`; staff links, redirects, and private cache invalidations use that base while public cache paths remain public. The standalone admin app retains root paths.
- Protected routes continue to use the existing server-side staff session/capability gate. The `__Host` cookie remains Secure, HttpOnly, SameSite=Lax, Path=/, and host-only (no `Domain`). Login `next` hints are validated as same-origin `/admin` destinations and never authorize access. `/admin/*` is excluded from crawlers. Unknown staff paths render the branded staff 404 shell with public header/footer suppressed.
- Fixed route-scoped styles needed by the imported staff components in the main app: separated brand lockup, visible primary staff actions, and a single active light/dark icon. Updated `docs/03-sitemap.md` to supersede the obsolete three-host plan with the canonical origin and exact mounted admin links. The legacy marketplace test was adjusted to accept the reformatted action while preserving its capability/RPC assertions.
- Node 22.23.4/pnpm 10.34.9 full suite: **135 tests; 134 passed, 0 failed, 1 documented PGlite skip**. Workspace typecheck passed **5/5** tasks. Both web app production builds passed **2/2** Turbo tasks with only reserved `.invalid` Supabase settings and dummy public keys.
- Local production-mode Chromium smoke: **33 assertions passed** at desktop and 375px mobile for staff login and unknown-route 404, public-shell suppression, no primary-admin email exposure, no horizontal overflow, and the unauthenticated `/admin/newsroom` redirect to `/admin/login`; external requests were blocked and none were observed. A separate computed-style check confirmed the cobalt CTA, separated brand text, and one active theme icon.
- Fresh captures: `/workspace/epe-lawa-release-screenshots/phase4-admin-shell-final/desktop-admin-login.png`, `/workspace/epe-lawa-release-screenshots/phase4-admin-shell-final/mobile-admin-login.png`, and `/workspace/epe-lawa-release-screenshots/phase4-admin-shell-final/mobile-admin-404.png`.
- Next.js streams the dynamic `notFound()` response as HTTP 200, but the page displays the branded 404 and carries `noindex` metadata. This is a framework streaming behavior; no staff data is exposed. No production Supabase settings, migrations, email configuration, or data were changed. Vercel preview verification is pending the PR commit.


### 2026-11-09 08:17 WAT — PR #21 merged; production deployment verified

- GitHub CLI confirms PR #21 merged at `39648719bd4f96654ce41282b8b2459cdef95102` (head `371f7a904160a46f07207a95348166178a4aaeb1`). The exact PR preview was READY before merge and the PR summary was CLEAN/MERGEABLE; individual status details returned HTTP 403 and were not independently visible via CLI.
- A read-only Vercel deployment listing confirmed the merge SHA is READY in Production at `epe-lawa-nqxddo7pm-epe-lawa.vercel.app`. `vercel inspect epelawa.vercel.app` resolved to that deployment, and the canonical public origin returned HTTP 200.
- No production Supabase Auth settings, migrations, or data were modified.


### 2026-11-09 08:35 WAT — Same-origin admin routing, final local verification (PR #22 pending)

- Added a Next.js 16 `proxy.ts` for `/admin/:path*` that overwrites and forwards the actual pathname in a server-only request header. The existing server-side `AdminAccessGuard` still verifies the staff session and capability; the header is only a return-path hint, validated by `safeAdminNextPath` and honored only after successful sign-in. The standalone admin app continues to use its own `/login` path and ignores this main-app header.
- Updated the source environment example and origin helpers to use `https://epelawa.vercel.app` as the canonical host, with News and staff paths on the same origin. This is repository guidance/code only; hosted Vercel and Supabase settings were not changed.
- Node 22.23.4/pnpm 10.34.9: workspace typecheck passed **5/5 tasks**; both production app builds passed **2/2 tasks** and Next.js recognized the Proxy entry; full suite passed **139 tests: 138 passed, 0 failed, 1 documented PGlite skip**. The focused admin route/return-path tests passed **3/3** before the final full run.
- Local production-build Chromium matrix passed **89 assertions** at **320, 375, 768, 1024 and 1440px** for staff login and unknown-route shells, accessible email label, reduced-motion preference, public chrome suppression, private-email non-disclosure, and no horizontal overflow. The anonymous `/admin/newsroom` request reached `/admin/login?next=/admin/newsroom`; unsafe hints remain rejected. The streamed not-found response is HTTP 200 with the designed staff 404 and `noindex` metadata. No external browser requests were observed; test backends used reserved `.invalid` endpoints and dummy keys.
- Fresh screenshots: `/workspace/epe-lawa-release-screenshots/phase4-admin-shell-rebased/desktop-admin-login.png`, `mobile-320-admin-login.png`, `mobile-375-admin-login.png`, `desktop-admin-404.png`, and `mobile-admin-404.png`.
- A local anonymous newsroom probe logged an `Unauthorized` denial from the placeholder backend while the browser completed the staff-login redirect; no production data or credentials were used. One earlier test attempt had `ALLOW_INDEXING=false`, which intentionally made the homepage fixture noindex; the full gates were rerun with the correct synthetic production-indexing flag and passed as recorded above. PR creation, hosted preview verification and production deployment remain pending.
- Independent read-only review found no material route-authentication or unsafe-redirect blocker; focused same-origin and site-indexing tests passed **6/6**.


### 2026-11-09 10:45 WAT — Member auth form polish, final local verification (PR #23 pending)

- Reworked member signup into four validated single-field steps and member sign-in into a compact two-step flow, preserving the existing server actions, safe redirects and non-enumerating recovery response. Added accessible progress/focus behavior, concise labels and placeholders, and compact mobile action/link rows. Auth cards omit the manual theme toggle while the saved preference remains active; public footer chrome stays hidden.
- The storage notice is pinned on focused auth forms with measured reserved space, safe storage-error handling and zero reserved height after dismissal. At 320px the form remains above the notice; interactive touch targets remain at least 44px.
- Node 22.23.4/pnpm 10.34.9 verification: workspace typecheck **5/5 tasks**, both production builds **2/2 tasks**, and the full suite **139 tests: 138 passed, 0 failed, 1 documented PGlite skip**. Builds/tests used only synthetic `.invalid` Supabase endpoints and dummy public keys.
- The local production-build Playwright matrix passed **21 states**: 20 route/viewport combinations for sign-in, signup, recovery and new-password at **320/375/768/1024/1440px**, plus the 320px pre-hydration sign-in state. Keyboard step focus/validation, reduced motion, saved dark-theme persistence, local font loading, the fixed notice and no-footer/no-toggle auth shell were checked. No overflow, notice overlap, external requests or browser page errors were found. **37 matrix screenshots** were saved, plus a fresh-context **375px default-light** screenshot, under `/workspace/epe-lawa-release-screenshots/phase5-auth-polish-final/`.
- A scripts-disabled browser remains on the app-wide streamed `app/loading.tsx` fallback, with route content held in a hidden segment; this existing Next.js streaming limitation means no-JavaScript auth interaction is **not claimed** by this PR. The separate auth-flow review found no material issue.
- This UI step made no production Auth, email-provider, schema, migration or user-content changes. Hosted email delivery remains untested; preview verification and PR merge are still pending.


### 2026-11-09 11:32 WAT — Auth reference redesign, local gates and migration handoff (PR #24 preparation)

- Current branch is `feat/auth-reference-redesign`, based on merged PR #23 (`cf7c8f0`). PR #22 same-origin `/admin/*` routing and PR #23 staged member auth are merged/deployed according to prior authenticated GitHub CLI verification. This entry describes the current local branch only; no PR #24 hosted preview or merge has been checked yet.
- Adapted the owner-provided `266649.jpg` composition for EPE-LAWA: soft light texture, cobalt abstract art panel with official mark, overlapping white rounded form card, pill controls, clear accessible password visibility, strong CTA, legal/account links, and disabled/labeled Google Coming Soon. Preserved staged validation and the existing server-action/redirect/recovery contract. Kept the storage notice compact and non-blocking at 320px.
- Isolated this PR from the independent newsroom article-create permission fix. The latter is saved in local stash `Separate newsroom-create-access follow-up`; do not accidentally include it in PR #24. Reapply it on its own branch after this PR and rerun its focused tests.
- Node 22.23.4/pnpm 10.34.9, current auth-only worktree: workspace typecheck passed **5/5 tasks**; production builds passed **2/2 apps**; full test suite passed **139 tests: 138 passed, 0 failed, 1 documented PGlite skip**. One earlier full-suite run exposed a stale assertion for the former storage-notice wording; the test now checks the actual shortened copy and the rerun is clean.
- Local production-build Chromium: **20/20 auth route/viewport checks** across login/signup/recovery/new-password at **320, 375, 768, 1024 and 1440px**, plus **9 staged-flow/password-toggle interaction checks**. The harness waited for the preloader to be removed and confirmed the storage notice was visible. No vertical overflow, card/notice intersections, public footer or manual theme toggle, external requests or browser errors. Auth screenshot archive: `/workspace/epe-lawa-release-screenshots/phase6-auth-reference-final/`; key examples are `375x812-login.png`, `375x812-signup.png`, `1440x900-login.png`, `1440x900-signup.png`, `375x812-signup-password-step.png`, and `320x568-login.png`. These are local production-build screenshots, not live-site or Vercel-preview captures.
- Docs updated: product requirements, sitemap, design system, roadmap and implementation tracker. Current sitemap routes are labeled MOUNTED rather than falsely implied LIVE; the account dashboard remains an open product route/workflow audit.
- Production Supabase remained unchanged in this batch: no schema, migration, auth-setting or content writes. A local-only audit across nine logical migration stacks found blockers requiring corrections, including duplicate version `20261107213000`, remote migration-ledger/name conflicts, missing authorization/schema helper compatibility, and behavior/data risks across the reviewed member/forum/business/history/editorial/radio/tourism stacks. Do not apply production migrations until local fixes and a complete safe CLI review/dry-run are clean. Owner authorization permits migration work only after this audit/correction gate.
- Next: commit/push with author and committer email `info.epelawa@gmail.com`, create PR #24 with the authenticated GitHub CLI wrapper, inspect the exact Vercel preview through the saved CLI token, and merge normally only if checks/preview are healthy. Then restore the separate newsroom-gate stash to a new branch and proceed one focused PR at a time. No browser login; no public test content; no native app.


### 2026-11-09 11:35 WAT — PR #24 opened; hosted preview pending

- Created PR #24 from `feat/auth-reference-redesign` to `main`: https://github.com/epelawa/EPE-LAWA/pull/24. Initial implementation commit `5a6ca448f941992a37cdcae006c16bd09a7f2453` has author and committer `epelawa <info.epelawa@gmail.com>`. A documentation follow-up is being added to the same PR to record its open state and current handoff.
- Local gates remain the current evidence: typecheck **5/5**, builds **2/2**, tests **139: 138 pass, 0 fail, 1 documented skip**; Playwright **20 auth route/viewport checks + 9 interactions**, with no overflow, notice overlap, external calls or page errors. Screenshots remain local production-build captures in `/workspace/epe-lawa-release-screenshots/phase6-auth-reference-final/`.
- The exact latest Vercel preview and GitHub required-check state have not yet been verified; do not merge until the authenticated CLI reports a healthy preview and no known failed/pending required checks. No browser login or production Supabase changes.


### 2026-11-09 11:38 WAT — PR #24 hosted status

- Authenticated Vercel CLI found deployment `epe-lawa-h90vmkk31-epe-lawa.vercel.app` READY for exact head `3e143f6ed9e514c24c52b8a1be74d19cd0b5e7ea` (`feat/auth-reference-redesign`). An unauthenticated `curl` to `/login` redirected to Vercel SSO; no browser login or hosted-page screenshot was attempted. The local-production screenshots remain the visual evidence.
- GitHub CLI `pr view` confirms #24 OPEN and MERGEABLE at that head. However, `gh pr checks`, REST commit status and REST deployments endpoints each return HTTP 403 `Resource not accessible by integration`. Required-check state is therefore not confirmed; **do not merge** until it can be verified through authorized CLI access. Continue independent local work; production Supabase remains untouched.


### 2026-11-09 12:28 WAT — Auth reference visuals, short-phone pass and final local verification (PR #24)

- On `feat/auth-reference-redesign`, refined member and same-origin staff sign-in to closely follow the owner’s `266649.jpg` reference. Member login is one screen, signup remains staged, recovery/new-password actions remain intact, and accessible password visibility is retained. The disabled Google Coming Soon action stays visible at every checked size. Short-phone panel copy was tightened so the full title and subtitle remain legible at 320×568 and 320×640; the storage notice stays fixed without intersecting the cards. The member/staff secondary destinations fit in 44px navigation rows.
- Removed the custom pull-to-refresh gesture from the public app while preserving ordinary scrolling and its offline/recovery behavior. The saved theme still drives the matching light/dark browser theme color. No role checks, sign-in server actions, return-path validation or production settings were weakened.
- Final Node 22.23.4/pnpm 10.34.9 run: workspace typecheck **5/5 tasks**, both production builds **2/2 tasks**, full suite **138 tests: 137 passed, 0 failed, 1 documented PGlite skip**. A previous intermediate suite run had one stale 620px breakpoint assertion; it was updated to the new 680px compact breakpoint, and the final full suite then passed.
- Fresh local production-build Playwright: **30 route/viewport checks** across member login, signup, recovery, new password and same-origin staff login at 320×568, 320×640, 375×812, 768×1024, 1024×768 and 1440×900. Login/password visibility, four-stage signup, saved dark-theme/theme-color, and mobile touch overscroll with ordinary document scrolling were exercised. No scroll overflow, notice/card overlap, external requests or page errors were observed. Fourteen screenshots are in `/workspace/epe-lawa-release-screenshots/pr24-auth-pull-refresh/`; they are local captures, not Vercel/live screenshots.
- PR #24 is OPEN; its latest local changes still need to be pushed and the exact resulting head checked. Earlier preview access redirected to Vercel SSO; GitHub status contexts returned 403, so no merge is claimed. PR #25 (`fix/newsroom-create-access`) is separately OPEN; production newsroom draft creation remains unproved while schema drift is unresolved.
- Production Supabase stayed read-only: no schema, migration, auth-setting or content write was made. Google OAuth and actual email delivery remain unverified. Continue with CLI only and keep the migration-ledger/helper conflicts as release blockers.


### 2026-11-09 14:05 WAT — Staff-login short-height fix (PR #29)

- Implemented a staff-error-only compact layout for short mobile viewports. It preserves the page title, disabled Google Coming Soon state, password visibility control and 44px submit/staff-switch targets; the error form stays centered when there is room, top-aligns below 600px and can scroll only when content exceeds the viewport. The existing sign-in action, validated `next` path, role checks and cookies were not changed.
- Final Node 22.23.4/pnpm 10.34.9 verification: workspace typecheck **5/5 tasks**, both production builds **2/2 tasks**, full suite **138 tests: 137 passed, 0 failed, 1 documented PGlite skip**.
- Final local production-mode Chromium fixtures: 320×568 clean/error, 375×568 error, 320×640 error and a 320×480 scroll-fallback geometry exercise. At 320×568 and 375×568 there is no page overflow or card/submit/switch overlap with the fixed storage notice; 320×640 remains centered. The error text was injected locally for screenshotting; no sign-in credentials were submitted. Captures are at `/workspace/epe-lawa-release-screenshots/pr29-staff-login-shortheight/`.
- Commit `96c49dad75ede630b6c7737856ac4c536d3636dd` has author and committer `EPE LAWA <info.epelawa@gmail.com>`. PR #29 (https://github.com/epelawa/EPE-LAWA/pull/29) is OPEN, based on `feat/auth-reference-redesign` (PR #24). The PR summary reports `UNSTABLE`; exact deployment/check details remain subject to the read-only CLI inspection. No merge was performed.
- No production Supabase settings, schema, migrations, content, user data or provider settings were changed. The local screenshots are not hosted-preview evidence.


### 2026-11-09 14:08 WAT — PR #29 hosted CLI status

- Authenticated GitHub CLI confirms PR #29 is OPEN and CLEAN at head `108d69a94a0103ed5069543e22c96bd26485314e`, based on `feat/auth-reference-redesign`. `gh pr view` with status-rollup and `gh pr checks 29` both return GraphQL `Resource not accessible by integration`; required check details are not visible, so no merge was attempted.
- Read-only Vercel CLI confirms that exact SHA is READY at https://epe-lawa-pz9vljcno-epe-lawa.vercel.app (branch alias https://epe-lawa-git-fix-staff-login-short-height-epe-lawa.vercel.app). A HEAD request to `/admin/login` returns HTTP 302 to Vercel SSO. No browser login was attempted; hosted visual review remains unavailable.
- No Vercel configuration or production Supabase settings/data were changed. This status applies to SHA `108d69a`; a later docs-only commit requires a new exact-head preview check.
