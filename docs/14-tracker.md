# EPE-LAWA — Implementation Tracker

**Last updated:** 2026-11-09.
**Scope:** First eight client-approved web sections plus cross-cutting auth, staff access, analytics, publishing, email templates, audit, privacy, accessibility and Playwright.
**Progress log:** `16-progress-log.md`.

`[x]` requires named evidence. Existing routes/schema are not proof of completion.

## Release work and status

| Area | Status | Evidence / next gate |
| --- | --- | --- |
| Trending News | Partial implementation in worktree | Verify published-only read, private preview, direct authorized publish, stale revision denial and audit in isolated tests. |
| Itan Ilu Mi / My Community History | Initial workflow partial; correction/removal explicitly marked Coming Soon in open PR #30 | Focused public/staff History tests 11/11; full suite 140 passed, 0 failed, 1 documented skip. No persistent correction intake or published-record edit/withdraw path was established. Local screenshots are in `pr30-history-correction-coming-soon/`. Next gate: reconcile migrations and design a durable, audited correction path before enabling intake. |
| Chat Forum / Digital Village Square | Existing schema/initial code; member flows unverified | Verify authenticated participation, reports, reasoned moderation, rate limits and audit. |
| Map & Navigation | Manual/outbound URL behavior in worktree | Current code generates safe Google Maps search/directions URLs only. No Maps API/Places/geocoding integration is configured or verified; offline maps optional future work. |
| Epe Business Directory & Marketplace | Existing schema/routes; complete workflows unverified | Verify approved listing, recorded human review, privacy and isolated order/payment gates. Paystack not confirmed operational. |
| Member auth and recovery | Not verified for release | Test signup, verification, login/logout, recovery, session security and enumeration resistance. |
| Staff access and analytics | Partial worktree changes; not fully tested | Verify secure staff session, fresh capability check, real query analytics, unavailable-versus-zero and audit. |
| Transactional email | Templates/configuration not verified | Test branded templates; sender/provider readiness unconfirmed pending authenticated domain and test delivery. |
| Builds/tests/Playwright | Local workspace gates pass for PR #30; complete release Playwright remains outstanding | Node 22.23.4/pnpm 10.34.9 typecheck 5/5, builds 2/2, full tests 140 passed / 0 failed / 1 documented PGlite skip. This does not prove every authenticated module flow. |
| Deployment | PR #30 open; exact preview is READY but SSO-protected | Preview `epe-lawa-9z8ff7wun-epe-lawa.vercel.app` matches head `ce96a1e`; HTTP request redirects to Vercel SSO. PR summary is CLEAN; individual GitHub check details are inaccessible through the CLI connector. No merge or production database changes. |

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
