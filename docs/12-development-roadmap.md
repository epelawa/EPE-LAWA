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


### 2026-11-09 11:45 WAT — Independent newsroom gate tested locally

Current checkout is `fix/newsroom-create-access`, based on `origin/main` at `cf7c8f0`. The independent RLS-scoped newsroom create-gate change is restored from the stash and remains local/unpushed while PR #24 check access is unresolved. Focused gate tests passed **2/2**; workspace typecheck **5/5**, builds **2/2**, suite **141 tests: 140 pass, 0 fail, 1 documented skip**. No production Supabase writes.

A five-width unauthenticated route check resolves `/admin/newsroom/new` to `/admin/login?next=%2Fadmin%2Fnewsroom%2Fnew` at 320/375/768/1024/1440px, with safe return path, no horizontal overflow, no external requests and no page errors. The staff login itself still has vertical overflow at every tested height; the storage notice falls below the viewport, and at 320×568 the sign-in card’s lower controls are clipped. Screenshots are local-only in `/workspace/epe-lawa-release-screenshots/phase7-admin-gate-local/`. Track this as a separate future layout fix, not part of the newsroom permission-gate change.

PR #24 remains open; its current head `2be5d84` has a READY Vercel preview at `https://epe-lawa-37s0p3yom-epe-lawa.vercel.app`, but unauthenticated access redirects to Vercel SSO and GitHub status endpoints return 403. Do not merge or attempt browser login; continue independent local work.


PR #24’s isolated auth-reference branch gate result was recovered from its completed CLI run: `pnpm typecheck` and production `pnpm build` completed successfully; the full test suite reported **139 total, 138 passed, 0 failed, 1 documented skip**. This is distinct from the current newsroom-gate branch’s 141-test run. Hosted GitHub check visibility remains blocked by 403; no merge was made.
