# EPE-LAWA — Implementation Tracker

**Last updated:** 2026-11-09.
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
| Historical Sites & Tourism | In scope; implementation/verification status not established by this audit | Verify sourced destinations, approval, public fields, visit facts and map handoff. |
| EPE LAWA Radio | Public route exists; final full-flow verification outstanding | Verify official stream permission/URL/format/playback, truthful status, schedules/archive and staff capabilities. |
| Who is Who in Epe | Public route exists; final full-flow verification outstanding | Verify approved profiles, human role checks, privacy, correction/removal and staff flow. |
| Member auth and recovery | Not verified for release | Test signup, verification, login/logout, recovery, session security and enumeration resistance. |
| Staff access and analytics | Partial worktree changes; not fully tested | Verify secure staff session, fresh capability check, real query analytics, unavailable-versus-zero and audit. |
| Transactional email | Templates/configuration not verified | Test branded templates; sender/provider readiness unconfirmed pending authenticated domain and test delivery. |
| Public contact and correction intake | Intentionally unavailable; privacy fix prepared on `fix/public-contact-privacy` | Removed the non-delivering public form/action and private mailbox link. Contact is **not operational**: no safe persistent message destination is configured. About, Guidelines, Privacy, Terms and `security.txt` disclose this; do not claim messages are received or stored. |
| Builds/tests/local route checks | Focused local gates passed for this privacy change; full release suite remains outstanding | Node 22.23.4/pnpm 10.34.9: typecheck 5/5; forced app builds 2/2; full suite 139 tests (138 passed, 0 failed, 1 documented PGlite skip). Six route checks returned HTTP 200; five rendered pages contain no primary-admin email/mailto, and Contact has no form. Full all-eight Playwright/accessibility release pass remains outstanding. |
| Deployment | Feature-branch preview pending | Check the exact PR commit with the Vercel CLI; production Supabase and user data remain read-only. |

## Cross-cutting release rules

Verified active staff with `article.publish` may publish directly; a second reviewer is not required. Stale revisions are denied and each transition is audited. Test content remains private in isolated environments. No production test articles, orders or payments.

The contact status page does not receive or store messages. Keep request intake disabled until a safe, persistent delivery/storage route is configured and tested. Public business-directory email links, when present, are listing-specific data and are distinct from the private primary-admin address.

## Separate visual follow-ups

- The shared footer brand lockup still displays “EPE DIVISION”; this conflicts with the owner's tagline-removal requirement and needs a separate focused fix.
- The fixed preference notice overlaps some lower-page copy while it is visible. It has not been hidden in the captured screenshots; review the notice layout in a separate step.

## Known status

A supplied Vercel log documents an older `main` build failure at `8885e16` from unresolved helper imports and Turbo-filtered environment variables. Helpers now exist in the worktree, but a current hosted preview is not thereby proven. The public alias returned older site content and does not verify this branch. No isolated Supabase development branch was created. Email sender authentication and Paystack setup remain unconfirmed. The map page does not use a configured Google Maps API, Places or geocoding integration.

## Next actions

1. Complete and verify the eight in-scope module experiences and cross-cutting member/staff flows.
2. Run full Playwright route/auth/publishing/privacy coverage at 320/375/768/1024/1440, plus accessibility review.
3. Run and record current typecheck/build/test results; keep production read-only.
4. Verify only the provider integrations actually required, in isolated environments; leave unverified paths unavailable.
5. Keep contact intake unavailable until a safe persistent destination is configured; handle the footer lockup and fixed-notice overlap as separate steps.
6. Update evidence and blockers without claiming unrun gates passed.
