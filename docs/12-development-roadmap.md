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


## 2026-11-09 — Public contact/privacy intake (local evidence; PR pending)

- The non-delivering contact form/action and public primary-admin mailbox link have been removed. About, Contact, Guidelines, Privacy, Terms and `/.well-known/security.txt` now avoid exposing that address. Contact is **not operational**: there is no safe persistent message destination, and no message is sent or stored. Keep intake disabled until a real route is configured and tested.
- Node 22.23.4/pnpm 10.34.9: workspace typecheck passed **5/5 tasks**; forced production app builds passed **2/2 tasks**; full suite passed **139 tests: 138 passed, 0 failed, 1 documented PGlite skip**. The initial suite used a loopback canonical site URL and failed that origin assertion; after rebuilding with the canonical `https://epelawa.vercel.app` origin and synthetic `.invalid` Supabase endpoints, the full suite passed. No production Supabase settings, migrations or user content were changed.
- Six local route checks returned HTTP 200. The five rendered public pages showed no private primary-admin email or `mailto:` link, and Contact rendered no form. Full-page mobile and desktop screenshots are recorded in `docs/16-progress-log.md` under `/workspace/epe-lawa-release-screenshots/pr28-public-contact-privacy/`.
- The Vercel preview for this branch is not yet verified. Separate visual follow-ups remain: the shared footer logo lockup still shows “EPE DIVISION,” and the fixed preference notice overlaps some lower-page copy while visible; neither is included in this privacy step.


### 2026-11-09 13:31 WAT — PR #28 and preview status update

This update supersedes the earlier “PR pending / preview not yet verified” note above. PR #28 is open for review at https://github.com/epelawa/EPE-LAWA/pull/28, based on code commit `03e843b51263ac29e7bf2ff447106633cd4d21fa`; it has not been merged. The read-only Vercel CLI confirmed deployment `dpl_5gRwUKWmq5NxdqtNye7VdUy7mi83` is **READY** for that exact commit at `https://epe-lawa-4wgt8y7ij-epe-lawa.vercel.app`. A direct HTTP request redirects (302) to Vercel SSO, so the hosted page could not be visually reviewed; the local screenshots remain the visual evidence. GitHub's status-check rollup, check-run and commit-status APIs returned 403 to the available integration, and the PR summary reported `UNSTABLE`; individual GitHub checks are therefore not certified as passing. Any later commit needs its own exact-head preview check. No production Supabase settings, migrations or user data were changed.
