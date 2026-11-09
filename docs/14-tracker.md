# EPE-LAWA — Implementation Tracker

**Last updated:** 2026-11-09 11:35 WAT.
**Scope:** All eight client-approved web sections plus identity, staff access, analytics, publishing, email templates, audit, privacy, accessibility and Playwright.
**Progress log:** `16-progress-log.md`.

`Done` requires named evidence. A route/schema or a successful local build is not proof that a production workflow is complete. Native mobile apps alone are deferred.

## Release work and status

| Area | Status | Evidence / next gate |
| --- | --- | --- |
| Foundation and same-origin staff routing | Merged baseline; hosted route work previously verified | PR #22 adds `/admin/*` on `https://epelawa.vercel.app/` with server-side session/capability checks and host-only `__Host` cookies. Keep this boundary; validate any new action independently. |
| Member auth visuals and flows | PR #24 open; not live | PR #23 staged forms are merged/deployed. PR #24 (`https://github.com/epelawa/EPE-LAWA/pull/24`) adapts the `266649.jpg` composition, adds accessible password toggles and disabled Google Coming Soon state. Its hosted preview is pending CLI verification. |
| Member dashboard and account settings | Remaining | Dashboard/account route and interaction completeness still needs an explicit route/feature audit; do not imply a complete account center based on auth screens alone. |
| Trending News | Partial; production workflow blocked by schema drift | Published-only routes and private draft/publish policy have local tests. Verify the newsroom create/edit/publish actions against reconciled schema and isolated data. News reference image `253590.jpg` is unavailable; follow the written design direction without claiming an exact image match. |
| Itan Ilu Mi / My Community History | Partial; final end-to-end workflow remains | Private contribution, consent/provenance, review and approved-publication rules have local/schema tests. Verify the full staff review lifecycle after migration reconciliation. |
| Chat Forum / Digital Village Square | Partial; final end-to-end workflow remains | Member thread/reply/report and moderation policy checks exist. Verify RLS/production schema compatibility, rate limiting and moderation outcomes after reconciliation. |
| Map & Navigation | Manual handoff implemented; API integration unavailable | The web map uses safe outbound Google Maps search/directions links and explicit opt-in device location. No configured Maps API/Places/geocoding integration or offline map is claimed. |
| Epe Business Directory & Marketplace | Partial; payment remains unavailable | Listings, review, order privacy and audited database paths have local/schema tests. Verify staff moderation and current production schema; do not enable payments without provider sandbox evidence. |
| Historical Sites & Tourism | Partial; no invented content | Routes/actions enforce approved-record and rights/provenance rules; local tests cover privacy and truthful empty states. Confirm production schema after reconciliation; no destinations are seeded. |
| EPE LAWA Radio | Partial; official stream unverified | Player and management routes use database-backed records and honest unavailable states. Do not label the stream live or expose its URL until permission/playback are verified. |
| Who is Who in Epe | Partial; final data/staff workflow remains | Public-field/privacy and capability-gated staff paths have local tests. Verify approved profiles and correction flow after migration reconciliation. |
| Newsroom create permission gate | Separate follow-up, not in auth PR | A safe RLS-scoped current-user grant check and distinct unavailable state are held in local stash `Separate newsroom-create-access follow-up`; reapply on a separate branch and rerun tests. The server RPC remains the write-time boundary. |
| Transactional email / OTP | UI templates and branded callback paths exist; delivery unverified | Supabase Auth remains the identity/session authority. Keep native Supabase delivery unless a verified Resend setup exists; confirm authenticated sender and real test delivery before claiming email works. Google OAuth stays disabled until configured. |
| Local build/test/auth viewport gate | Passed for current auth branch | Node 22.23.4/pnpm 10.34.9: typecheck **5/5**, builds **2/2**, full suite **139: 138 pass, 0 fail, 1 documented skip**. Auth Playwright: **20 route/viewport checks + 9 interaction checks** at 320/375/768/1024/1440px; no overflow, notice overlap, external requests or browser errors. |
| Screenshots | Captured from local production build | `/workspace/epe-lawa-release-screenshots/phase6-auth-reference-final/` includes auth screens at the required widths and a password-step state. They are local preview, not hosted/live screenshots. |
| Production migrations/schema | Blocked pending local reconciliation | Read-only CLI audit found duplicate version `20261107213000`, remote ledger/name conflicts, helper/RLS drift and stack-specific semantic risks. No migration has been applied. The owner authorized application only after corrections and complete safe review. |
| Hosted preview/merge for PR #24 | Pending | Inspect the exact latest Vercel deployment with CLI and GitHub status via the authenticated wrapper. Merge normally only if preview and required checks are healthy. Do not use browser login. |

## Cross-cutting release rules

Only the verified owner's identity may receive primary-admin access; do not put that address on public pages or metadata. All other signups remain regular members. Same-origin return hints never authorize staff access. Public/test content remains private until expressly approved. The canonical origin is `https://epelawa.vercel.app/`. Never report a feature, provider, hosted preview, migration or test as complete without the corresponding evidence.

## Next actions

1. Verify the exact PR #24 preview and check state through CLI; merge only if it is healthy.
2. Reapply the separated newsroom create-gate change on a new branch and verify it as its own PR.
3. Finish the nine-stack migration corrections, including duplicate version/ledger reconciliation, then run complete local schema/tests and an explicit CLI dry-run before any owner-authorized production migration.
4. Continue one independently tested PR at a time through the eight modules and attach truthful local/hosted screenshots for each visual step.
