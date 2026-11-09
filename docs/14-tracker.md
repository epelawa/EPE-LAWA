# EPE-LAWA — Implementation Tracker

**Last updated:** 2026-11-07.
**Scope:** First eight client-approved web sections plus cross-cutting auth, staff access, analytics, publishing, email templates, audit, privacy, accessibility and Playwright.
**Progress log:** `16-progress-log.md`.

`[x]` requires named evidence. Existing routes/schema are not proof of completion.

## Release work and status

| Area | Status | Evidence / next gate |
| --- | --- | --- |
| Trending News | Partial implementation in worktree | Verify published-only read, private preview, direct authorized publish, stale revision denial and audit in isolated tests. |
| Itan Ilu Mi / My Community History | Initial route/code exists; workflow remains unverified | A read-only audit found no correction/removal intake for published records. The contact form explicitly does not send or store drafts, and production schema writes remain blocked pending migration reconciliation. Do not imply correction requests are accepted. |
| Chat Forum / Digital Village Square | Existing schema/initial code; member flows unverified | Verify authenticated participation, reports, reasoned moderation, rate limits and audit. |
| Map & Navigation | Manual/outbound URL behavior in worktree | Current code generates safe Google Maps search/directions URLs only. No Maps API/Places/geocoding integration is configured or verified; offline maps optional future work. |
| Epe Business Directory & Marketplace | Existing schema/routes; complete workflows unverified | Verify approved listing, recorded human review, privacy and isolated order/payment gates. Paystack not confirmed operational. |
| Member auth and recovery | Not verified for release | Test signup, verification, login/logout, recovery, session security and enumeration resistance. |
| Staff access and analytics | Partial worktree changes; not fully tested | Verify secure staff session, fresh capability check, real query analytics, unavailable-versus-zero and audit. |
| Transactional email | Templates/configuration not verified | Test branded templates; sender/provider readiness unconfirmed pending authenticated domain and test delivery. |
| Builds/tests/Playwright | Current release checks not verified | Run typecheck, builds, tests and full Playwright at required widths; record actual results. |
| Deployment | Old public baseline checked; feature-branch preview unverified | Read-only Playwright on `https://epelawa.vercel.app` showed an older incomplete deployment; see `16-progress-log.md`. Production remained read-only. |

| Historical Sites & Tourism | In scope; implementation/verification status not established by this audit | Verify sourced destinations, approval, public fields, visit facts and map handoff. |
| EPE LAWA Radio | Admin read-error state implemented in PR #27; local production-mode preview confirms alert with no editor forms. Full data/provider/playback workflow remains unverified | Local screenshots: `/workspace/epe-lawa-release-screenshots/pr27-radio-error-local/375x812-radio-read-failure-local.png` and `/workspace/epe-lawa-release-screenshots/pr27-radio-error-local/1440x900-radio-read-failure-local.png`. Verify official stream permission/URL/format/playback, schedules/archive and staff capabilities. |
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
