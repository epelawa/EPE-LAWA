# EPE-LAWA — Implementation Tracker

**Last updated:** 2026-11-07.
**Scope:** First eight client-approved web sections plus cross-cutting auth, staff access, analytics, publishing, email templates, audit, privacy, accessibility and Playwright.
**Progress log:** `16-progress-log.md`.

`[x]` requires named evidence. Existing routes/schema are not proof of completion.

## Release work and status

| Area | Status | Evidence / next gate |
| --- | --- | --- |
| Trending News | Partial implementation in worktree | Verify published-only read, private preview, direct authorized publish, stale revision denial and audit in isolated tests. |
| Itan Ilu Mi / My Community History | Initial route/code exists in worktree; workflow unverified | Verify consent, provenance, private submissions, review and correction/takedown behavior. |
| Chat Forum / Digital Village Square | Existing schema/initial code; member flows unverified | Verify authenticated participation, reports, reasoned moderation, rate limits and audit. |
| Map & Navigation | Manual/outbound URL behavior in worktree | Current code generates safe Google Maps search/directions URLs only. No Maps API/Places/geocoding integration is configured or verified; offline maps optional future work. |
| Epe Business Directory & Marketplace | Existing schema/routes; complete workflows unverified | Verify approved listing, recorded human review, privacy and isolated order/payment gates. Paystack not confirmed operational. |
| Member auth and recovery | Not verified for release | Test signup, verification, login/logout, recovery, session security and enumeration resistance. |
| Staff access and analytics | Partial worktree changes; not fully tested | Verify secure staff session, fresh capability check, real query analytics, unavailable-versus-zero and audit. |
| Transactional email | Templates/configuration not verified | Test branded templates; sender/provider readiness unconfirmed pending authenticated domain and test delivery. |
| Builds/tests/Playwright | Current release checks not verified | Run typecheck, builds, tests and full Playwright at required widths; record actual results. |
| Deployment | Old public baseline checked; feature-branch preview unverified | Read-only Playwright on `https://epelawa.vercel.app` showed an older incomplete deployment; see `16-progress-log.md`. Production remained read-only. |

| Historical Sites & Tourism | In scope; implementation/verification status not established by this audit | Verify sourced destinations, approval, public fields, visit facts and map handoff. |
| EPE LAWA Radio | Public route exists; final full-flow verification outstanding | Verify official stream permission/URL/format/playback, truthful status, schedules/archive and staff capabilities. |
| Who is Who in Epe | Public route exists; final full-flow verification outstanding | Verify approved profiles, human role checks, privacy, correction/removal and staff flow. |
## Cross-cutting release rules

Verified active staff with `article.publish` may publish directly; a second reviewer is not required. Stale revisions are denied and each transition is audited. Test content remains private in isolated environments. No production test articles, orders or payments.

A supplied Vercel log records an older `main` build at `8885e16` failing from unresolved helper imports and filtered environment variables. A fresh read-only public-alias baseline still showed missing routes; it does not verify this feature branch. Current Vercel preview status remains unverified. No isolated Supabase development branch was created. Email and Paystack providers are unconfirmed.

## Next actions

1. Complete and verify the eight in-scope module experiences and cross-cutting member/staff flows.
2. Run full Playwright route/auth/publishing/privacy coverage at 320/375/768/1024/1440, plus accessibility review.
3. Run and record current typecheck/build/test results; keep production read-only.
4. Verify only the provider integrations actually required, in isolated environments; leave unverified paths unavailable.
5. Update evidence and blockers without claiming unrun gates passed.


## Current audit snapshot — 2026-11-09

| Module | Checked-in implementation and focused gap |
| --- | --- |
| Trending News | Published-only pages and protected article RPC actions are present. The previously reported missing date/media helpers are a false positive: both files exist and the current local build passed. PR #25's `article.create` display-gate fix is open; production draft persistence remains unverified. |
| Itan Ilu Mi / Community History | Private contribution and staff review/publication paths exist in checked-in code; focused source tests passed 9/9. No correction/dispute/removal request or public-record takedown path was found. Publication UI asks staff to verify provenance/rights but does not persist explicit attestations. |
| Chat Forum / Digital Village Square | Member threads, replies, polls/reports, and staff report-resolution RPC paths exist; forum audit tests passed 8/8 before the focused fix, and the new redirect regression passes 4/4. PR #26 moves the final redirect outside the RPC catch. No rate limit was found; production RPC/RLS remains unverified. |
| Map & Navigation | Reads bounded published-business data and provides manual search/directions via safe outbound Google Maps URLs; no Maps API/Places service is configured. Focused source tests passed 3/3; behavioral URL-builder tests remain a small hardening opportunity. |
| Epe Business Directory & Marketplace | Submission, moderation, and unpaid order request paths are implemented in source; no payment integration is claimed. Publishing currently uses separate verification/status RPC calls, allowing a partial write. The audit's standalone focused command did not complete; the full workspace suite did complete afterward. |
| Historical Sites & Tourism | Public browse, private contribution, and capability-gated review/publication paths exist; focused source tests passed 6/6. Strict action-level UUID/slug/coordinate validation and clearer consent-copy coupling remain gaps. |
| EPE LAWA Radio | Programme/schedule/episode authoring paths exist; the public player truthfully remains Coming Soon. Focused tests passed 5/5. Staff episode/schedule read errors are not surfaced distinctly; stream management is not implemented. |
| Who is Who in Epe | Public directory and staff profile/source/verification RPC paths exist; focused staff-console tests passed 5/5. The public correction link does not persist a correction request, and profile plus achievements edits use separate RPC writes. |

### Current verification and hosted gates

- On `fix/forum-report-redirect` based on `main` commit `cf7c8f0`, Node 22.23.4/pnpm 10.34.9 full gates passed: typecheck 5/5 tasks, production builds 2/2 tasks, full suite 140 tests (139 passed, 0 failed, 1 known PGlite skip). The focused Forum moderation regression passed 4/4.
- PR #24 and PR #25 are open and unmerged. PR #26 is open at code head `f4af888`; Vercel reports its deployment READY, but preview access redirects to SSO and GitHub status-check details return 403. Do not merge while required hosted status remains inaccessible.
- These are local source/build results, not live Supabase, deployed RLS/RPC, provider-delivery, or production-persistence verification. Production Supabase remains read-only until the migration/schema/capability drift is reconciled.
