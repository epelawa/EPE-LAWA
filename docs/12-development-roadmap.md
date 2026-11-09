# EPE-LAWA — Development Roadmap

**Status:** Active. Scope is the all eight client-approved web sections in `docs/01-product-requirements.md`, plus cross-cutting requirements. No out-of-scope modules are planned in this release.

## Product and delivery rules

The eight sections are Trending News, Itan Ilu Mi / My Community History, Chat Forum / Digital Village Square, Map & Navigation, Epe Business Directory & Marketplace, Historical Sites & Tourism, EPE LAWA Radio, and Who is Who in Epe. Native mobile apps alone are deferred. Keep section 5 future enhancements in the complete roadmap: event ticketing, emergency contacts, scholarship/job board, e-learning, English/Yoruba support, AI-powered local assistant. Rebuild the web experience using Sckooly’s public-site structure, original EPE-LAWA content and the latest owner-approved cobalt palette, compact 90% typography and a full from-scratch UI rebuild informed by Sckooly, GetQuant and JĀSĀB. Do not copy assets or invent facts/content. Test content remains private in isolated environments; production is read-only.

A verified staff member with `article.publish` may publish directly without a second reviewer. Reject stale revisions and audit transitions. Do not claim email, Paystack, or Maps API integrations are operational without verification. Current map functionality uses safe outbound Google Maps search/directions URLs; offline maps are optional future work.

## Work sequence and gates

| Workstream | Required work | Acceptance evidence |
| --- | --- | --- |
| Foundation and UI | Public shell, responsive eight-module navigation, staff/public boundaries, honest states | Typecheck/build/tests; route audit; Playwright at 320/375/768/1024/1440; no dead links or false content |
| Member identity | Signup, verification, login/logout, recovery; secure member sessions | Isolated account and negative access tests; generic recovery/sign-in responses |
| Staff/admin | Verified staff sessions, fresh capability checks, admin analytics from real queries, audit | Unauthorized and authorized Playwright checks; no service credentials in browser bundle |
| Trending News | Published-only listing/search; private drafts/previews; revision-aware direct publish, corrections and audit | Isolated private draft/publish/stale revision tests; public reads exclude drafts |
| Community History | Provenance, consent, private contribution, review, correction/dispute/takedown | Private fixtures and access tests; only approved records public |
| Digital Village Square | Authenticated threads/replies/reports; reasoned moderation and audit | Member/moderator Playwright and negative permission tests |
| Map & Navigation | Manual search and safe external directions handoff | Verify URL safety, labels, no default GPS/private address exposure; no API integration claim |
| Directory & Marketplace | Reviewed listings, real products, protected order/payment paths as configured | Isolated data; real provider sandbox required before enabling payment; production read-only |
| Historical Sites & Tourism | Sourced destination records, approved descriptions and verified visit details | Source review; location facts and map handoff checked; empty/error states verified |
| EPE LAWA Radio | Stream player, status, schedule/archive where approved records exist | Rights/URL/format/playback evidence; unavailable state checked; no invented programming |
| Who is Who in Epe | Searchable verified public profiles and correction path | Human verification evidence for roles; privacy/public-field audit and correction tests |
| Transactional email | Branded verification/recovery templates and essential notices | Template rendering; provider delivery only claimed after authenticated sender and test evidence |
| Integrated QA/release | Full Playwright, accessibility, responsive, privacy and security pass | Record actual command/browser results; unresolved external gates remain blockers |

## Section 5 future enhancements (retained in full roadmap)
These are future roadmap items, not a reason to omit them or imply they are already implemented: event ticketing; emergency contacts; scholarship/job board; e-learning; English/Yoruba support; and an AI-powered local assistant. Sequence and acceptance gates require owner planning and evidence. Native mobile applications alone are deferred from the current web scope.
Do not mark any gate complete without evidence. No commit, push or merge is implied by this roadmap.

## Known status

A supplied Vercel log documents an older `main` build failure at `8885e16` from unresolved helper imports and Turbo-filtered environment variables. Helpers now exist in the worktree, but a current build and preview have not thereby been proven. The public alias returned older site content and does not verify this branch. No isolated Supabase development branch was created. Email sender authentication and Paystack setup remain unconfirmed. The map page does not use a configured Google Maps API, Places or geocoding integration.


## 2026-11-09 — Community History correction disclosure (PR #30)

The public Itan Ilu Mi archive and staff History review page now state that published-record correction/removal handling is **Coming Soon**. The current contribution queue is explicitly described as new-contributions-only; no nonfunctional form or false delivery promise was added. This is a truthful disclosure, not an implemented correction workflow. No existing record is edited or withdrawn.

Local verification on Node 22.23.4/pnpm 10.34.9 passed workspace typecheck (5/5), both production builds (2/2), focused History tests (11/11), and the complete suite (140 passed, 0 failed, 1 documented PGlite skip). The final main-app production build was rerun after the temporary screenshot route was removed. Local production-mode screenshots, not hosted captures: `/workspace/epe-lawa-release-screenshots/pr30-history-correction-coming-soon/375x812-public-history.png`, `1440x900-public-history.png`, `375x812-staff-history.png`, and `1440x900-staff-history.png`. The staff screenshots used a temporary local-only fixture inside the same-origin shell; the fixture was removed before the final build.

PR #30 is open and unmerged at `https://github.com/epelawa/EPE-LAWA/pull/30`, head `ce96a1e05049e3264a5d33a618cd820f8f80f36f`. Read-only Vercel CLI inspection reports the exact preview READY, but HTTP redirects to the Vercel SSO login, so hosted page content could not be reviewed. The PR summary is CLEAN; individual GitHub checks are inaccessible through the CLI integration. No production Supabase settings, schema, migrations, or data were changed.

The durable correction intake and audited staff edit/withdraw path remain blocked until migration-ledger conflicts and production schema drift are reconciled. Next gate: produce a read-only CLI reconciliation plan with explicit backup, ledger/schema comparison, migration ordering, and rollback safeguards; do not write production changes while conflicts remain.
