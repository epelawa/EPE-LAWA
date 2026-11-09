# EPE-LAWA — Implementation Tracker

**Last updated:** 2026-11-09 11:45 WAT.
**Scope:** All eight client-approved web sections plus identity, staff access, analytics, publishing, email templates, audit, privacy, accessibility and Playwright.
**Progress log:** `16-progress-log.md`.

`Done` requires named evidence. A route/schema or a successful local build is not proof that a production workflow is complete. Native mobile apps alone are deferred.

## Release work and status

| Area | Status | Evidence / next gate |
| --- | --- | --- |
| Foundation and same-origin staff routing | Merged baseline; hosted route work previously verified | PR #22 adds `/admin/*` on `https://epelawa.vercel.app/` with server-side session/capability checks and host-only `__Host` cookies. Keep this boundary; validate any new action independently. |
| Member auth visuals and flows | PR #24 open; not live | PR #23 staged forms are merged/deployed. PR #24 (`https://github.com/epelawa/EPE-LAWA/pull/24`) adapts the `266649.jpg` composition. Vercel CLI confirmed its current head `2be5d84` READY at `epe-lawa-37s0p3yom-epe-lawa.vercel.app`, but the preview redirects to SSO. GitHub status/commit/deployment endpoints return 403; required-check state is unavailable and the PR is not merged. |
| Member dashboard and account settings | Remaining | Dashboard/account route and interaction completeness still needs an explicit route/feature audit; do not imply a complete account center based on auth screens alone. |
| Trending News | Partial; production workflow blocked by schema drift | Published-only routes and private draft/publish policy have local tests. Verify the newsroom create/edit/publish actions against reconciled schema and isolated data. News reference image `253590.jpg` is unavailable; follow the written design direction without claiming an exact image match. |
| Itan Ilu Mi / My Community History | Partial; final end-to-end workflow remains | Private contribution, consent/provenance, review and approved-publication rules have local/schema tests. Verify the full staff review lifecycle after migration reconciliation. |
| Chat Forum / Digital Village Square | Partial; final end-to-end workflow remains | Member thread/reply/report and moderation policy checks exist. Verify RLS/production schema compatibility, rate limiting and moderation outcomes after reconciliation. |
| Map & Navigation | Manual handoff implemented; API integration unavailable | The web map uses safe outbound Google Maps search/directions links and explicit opt-in device location. No configured Maps API/Places/geocoding integration or offline map is claimed. |
| Epe Business Directory & Marketplace | Partial; payment remains unavailable | Listings, review, order privacy and audited database paths have local/schema tests. Verify staff moderation and current production schema; do not enable payments without provider sandbox evidence. |
| Historical Sites & Tourism | Partial; no invented content | Routes/actions enforce approved-record and rights/provenance rules; local tests cover privacy and truthful empty states. Confirm production schema after reconciliation; no destinations are seeded. |
| EPE LAWA Radio | Partial; official stream unverified | Player and management routes use database-backed records and honest unavailable states. Do not label the stream live or expose its URL until permission/playback are verified. |
| Who is Who in Epe | Partial; final data/staff workflow remains | Public-field/privacy and capability-gated staff paths have local tests. Verify approved profiles and correction flow after migration reconciliation. |
| Newsroom create permission gate | Local branch `fix/newsroom-create-access`; not pushed/PR'd | On current `origin/main` (`cf7c8f0`), the page now reads the signed-in staff user's RLS-scoped `article.create` grant and separates unavailable-check from missing-access states; the create action remains RPC-only and database capability enforcement is unchanged. Focused tests **2/2**, workspace typecheck **5/5**, builds **2/2**, suite **141: 140 pass, 0 fail, 1 documented skip**. No production writes. |
| Staff sign-in layout | Separate visual follow-up identified; not changed | Local Playwright route check safely redirects `/admin/newsroom/new` to `/admin/login?next=%2Fadmin%2Fnewsroom%2Fnew` at all five widths, no horizontal overflow/external calls/page errors. The staff login page has vertical overflow at 320/375/768/1024/1440; its storage notice sits below the viewport, and the 320x568 card controls are clipped. Screenshots: `/workspace/epe-lawa-release-screenshots/phase7-admin-gate-local/`. Keep this separate from the permission gate. |
| Transactional email / OTP | UI templates and branded callback paths exist; delivery unverified | Supabase Auth remains the identity/session authority. Keep native Supabase delivery unless a verified Resend setup exists; confirm authenticated sender and real test delivery before claiming email works. Google OAuth stays disabled until configured. |
| Production migrations/schema | Blocked pending local reconciliation | Read-only CLI audit found duplicate version `20261107213000`, remote ledger/name conflicts, helper/RLS drift and stack-specific semantic risks. No migration has been applied. The owner authorized application only after corrections and complete safe review. |
| Hosted preview/merge for PR #24 | Merge held | Exact deployment for head `2be5d84` is READY but SSO-protected. GitHub checks/status/deployment endpoints return HTTP 403. Do not merge until the required-check state can be confirmed without browser login. |

## Cross-cutting release rules

Only the verified owner's identity may receive primary-admin access; do not put that address on public pages or metadata. All other signups remain regular members. Same-origin return hints never authorize staff access. Public/test content remains private until expressly approved. The canonical origin is `https://epelawa.vercel.app/`. Never report a feature, provider, hosted preview, migration or test as complete without the corresponding evidence.

## Next actions

1. Keep PR #24 open while required checks are inaccessible; do not browser-login or merge without visible required-check state.
2. Keep the newsroom permission-gate change on its own local branch and open its PR only after the current release sequence allows.
3. Address the staff sign-in notice/short-height layout in its own focused change, preserving the separate permission-gate diff.
4. Finish the nine-stack migration corrections and CLI dry-run before any owner-authorized production migration.
5. Continue one independently tested PR at a time through all eight web modules with honest data/provider state.


## PR #24 isolated local gate evidence

On the auth-reference branch before its final documentation-only head update, the Node 22/pnpm 10 run completed `pnpm typecheck`, `pnpm build` (both web apps), and the full test suite: **139 total tests, 138 passed, 0 failed, 1 documented skip**. This result excludes the two newsroom-create-gate tests; that separate local branch has 141 total tests.
