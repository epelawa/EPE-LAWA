# EPE LAWA — Master Plan

**Status:** Active; scope reaffirmed 2026-11-07.
**Authority:** `docs/01-product-requirements.md` and client brief sections 3.1–3.8.
**Design direction:** Sckooly public-site structure, adapted to original EPE-LAWA branding and owner-approved Fig & Limestone direction, compact 90% typography and a full from-scratch UI rebuild informed by Sckooly, GetQuant and JĀSĀB.

## Product and current release

EPE LAWA is a web-first community, news, heritage, civic-discussion and commerce platform for Epe Division, Lagos State. This release includes all eight client-approved web areas (sections 3.1–3.8):

1. Trending News
2. Itan Ilu Mi / My Community History
3. Chat Forum / Digital Village Square
4. Map & Navigation
5. Epe Business Directory & Marketplace
6. Historical Sites & Tourism
7. EPE LAWA Radio
8. Who is Who in Epe

Cross-cutting requirements include web member signup, email verification, login and recovery; secure staff sessions and capability checks; real-result admin analytics; news publishing; branded transactional email templates; audit, privacy, accessibility and full Playwright coverage. Native mobile apps alone are deferred; section 5 enhancements remain on the full roadmap.

Use Sckooly's public-site structure as an information-architecture reference, not a source of copied assets or copy. Apply the owner-provided color direction with original EPE-LAWA branding. Never invent Epe facts, history, people, businesses, prices, reviews, map locations, metrics, article content or live status. Public content uses approved records only; empty, loading, error and denied states remain honest.

## Full roadmap beyond the current release
Keep the client brief section 5 future enhancements represented in the complete roadmap: event ticketing, emergency contacts, scholarship/job board, e-learning, English/Yoruba support, and an AI-powered local assistant. They are future enhancements, not features whose implementation is claimed here. Native mobile apps alone are deferred from current scope.

## Editorial, test and integration rules

A verified active staff member with `article.publish` may publish directly; a second reviewer is not required. Every transition must use the expected current revision; stale revisions are denied, and transitions are audited. Private drafts and test content stay private in isolated environments. Production checks are read-only; no production test articles, orders or payments.

The current Map page builds safe outbound Google Maps search/directions URLs. There is no configured Google Maps API key or verified Places/geocoding integration; do not claim full Maps API integration. Offline maps are optional future work. Email and Paystack provider operations are unconfirmed and must not be described as ready without evidence.

## Delivery and verification

Do not claim a check passed unless it was run and its result recorded. Release verification includes typecheck, production builds, tests and Playwright across 320/375/768/1024/1440 CSS px, including member/staff access, private content, publishing, accessibility and responsive behavior. Production reads only. Keep provider, preview and deployment status explicitly unverified until evidenced. No commit or push is authorized by this plan alone.

## Evidence notes

A supplied Vercel log records an older `main` build failure at `8885e16` on 2026-11-07 due to unresolved helper imports and filtered environment variables; the worktree includes those helper modules, but this does not prove a current build or preview passes. A read-only fetch of the public alias showed older site content. Deployment inspection requires authorization. No isolated Supabase development branch was created.
