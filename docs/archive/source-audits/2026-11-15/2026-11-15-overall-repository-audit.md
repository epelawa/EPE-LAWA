# EPE LAWA — Overall Repository, Product & Production Readiness Audit

**Audit date:** 15 November 2026
**Repository:** `epelawa/EPE-LAWA`
**Audited branch:** `main`
**Audited commit:** `a6230fc3890be02f7ed2551a5af64ca5144bbc44`
**Latest main commit:** `Refine News page to match editorial reference (#104)`
**Open pull request:** [#101 — Align News, public navigation and Admin dashboard](https://github.com/epelawa/EPE-LAWA/pull/101)
**Public site:** https://epelawa.vercel.app

---

## 1. Executive assessment

EPE LAWA is not a small brochure website. The repository contains a substantial Next.js monorepo with a public application, a staff application, shared UI packages, Supabase migrations, server-side authorization logic, a newsroom, member authentication and a large automated test suite.

There is meaningful engineering work worth preserving. The project has a deliberate design system, an explicit prohibition on fabricated community content, server-verified staff sessions, capability-based access control, revision-aware publishing, private/public data boundaries and responsive test coverage.

However, **the project is not yet demonstrated to be a fully complete, production-ready eight-module platform**. The largest risks are release governance, scope drift, database migration reconciliation, live feature verification, operational contact channels, deployment/domain alignment and documentation that no longer reflects the current branch.

The correct direction is **controlled completion and consolidation, not a blind rewrite**.

### Overall status

| Area | Assessment | Reason |
|---|---|---|
| Product concept and architecture | Strong foundation | Clear public/staff separation and defined product vision |
| Visual design | Good foundation; inconsistent execution | Strong homepage identity, but public shell, News and pending navbar need one coherent system |
| Public website | Partially implemented | Routes exist, but several modules and workflows remain data/provider-dependent |
| Newsroom | Substantial implementation; live verification required | Publishing and versioning exist, but the live News data contract recently had a confirmed schema mismatch |
| Admin workspace | Strong security direction; UX/release QA incomplete | Capability-gated metrics and newsroom exist; dashboard redesign is still an unmerged draft PR |
| Database | High-risk release area | 40 migration files, duplicate version prefixes and conflicting production-ledger documentation |
| Security | Good architectural intent | RLS, capability checks and server-side sessions exist; live Supabase verification remains essential |
| Integrations | Incomplete | Email intake, direct storage uploads, Paystack and Maps API are not all operationally verified |
| Testing | Good local test investment | Many tests and viewport captures exist; no GitHub Actions workflow is present |
| Documentation | Needs immediate consolidation | Several important documents are stale or contradict newer handoffs |
| Production readiness | **Not yet demonstrated end to end** | A passing build or HTTP 200 does not prove all user journeys and integrations work |

### Most important conclusion

Do not spend the next development cycle adding more visual effects or more modules. First establish one trustworthy release baseline:

1. Confirm the actual approved Phase 1 scope.
2. Reconcile the production Supabase schema and migration ledger with the repository.
3. Verify the current live News feed and the two approved article routes.
4. Complete public navigation and Admin dashboard work through a clean, reviewed PR.
5. Implement a real contact/report channel or stop presenting unavailable routes as working contact destinations.
6. Run a complete release test against an isolated Supabase environment and the exact deployment candidate.
7. Update the README, tracker, schema runbook and handoff so the next developer has one accurate source of truth.

---

## 2. Audit scope and limitations

This review used the GitHub repository tree and metadata; README and agent instructions; product requirements, master plan, design system, architecture, security, testing and roadmap documents; public homepage, News, legal, contact, navigation, cookie-notice and footer source; Admin dashboard, newsroom and server-side Supabase access code; migration filenames and schema-runbook documentation; current progress log and handoff; open PR metadata; and the screenshots supplied in the conversation.

**Limitations:**

- The live website could not be opened through the browser inspection interface during this audit.
- No live database query, production write, Vercel deployment inspection, email delivery test, payment test or real member/staff login was performed in this audit.
- No `pnpm install`, `pnpm typecheck`, `pnpm build`, `pnpm test`, Playwright run or security scanner was executed in this audit.
- Test counts mentioned below are repository/PR evidence, not a new test run performed for this report.
- The open PR's claims are not treated as proof that its changes are deployed or production-ready.

This report distinguishes source verified, documented evidence, unverified live behavior and recommended work.

---

## 3. Repository baseline

At inspection:

- Repository: `epelawa/EPE-LAWA`
- Default branch: `main`
- Main commit: `a6230fc3890be02f7ed2551a5af64ca5144bbc44`
- Latest commit message: `Refine News page to match editorial reference (#104)`
- GitHub latest push: 15 November 2026, 11:23 UTC
- Repository tree: 1,280 entries
- SQL migration files: 40
- Open pull requests: PR #101
- PR #101: draft/open; GitHub reported `mergeable=false` and `mergeable_state=dirty` at inspection time
- No `.github/workflows/` files were present in the inspected repository tree

### Architecture

```text
frontend/
  apps/
    main/       Public EPE LAWA website and same-origin /admin routes
    admin/      Canonical staff/admin application
  packages/
    ui/         Shared UI package
  tests/        Frontend, route, security and workflow tests

backend/
  supabase/
    migrations/ SQL schema and forward migrations
  tests/        Schema and policy tests

docs/           Product, architecture, design, operations and handoffs
artifacts/      Local visual evidence, screenshots and measurements
scripts/        Audit and development utilities
```

The separate public and staff applications are a good boundary. Retain that separation rather than mixing private staff pages into public navigation or public caching.

### Technology

The inspected manifests identify Next.js 16.4.4, React 19.3.1, TypeScript 5.9.3, Node.js 22.x, pnpm 10.34.9, Turborepo, Supabase Auth/Postgres/RLS, Plus Jakarta Sans and Tailwind CSS 3.

Plus Jakarta Sans is documented as a locally bundled SIL Open Font License font. Do not describe it as Codec Pro.

---

## 4. Critical findings

### P0.1 — Production database migration state is not represented by one reliable source

**Evidence**

- The repository contains 40 SQL migration files.
- `docs/16-schema-runbook.md` still says there are 13 migration files and expects only `20261102133703` to be applied.
- Two duplicate migration version prefixes exist:
  - `20261107213000_news_comment_workflow.sql`
  - `20261107213000_people_achievements.sql`
  - `20261114190000_configurable_staff_roles.sql`
  - `20261114190000_member_handle_and_verified_bootstrap.sql`
- The 11:10 WAT project handoff records a production News failure caused by `published_articles.cover_url` not existing and says `20261115093000_news_cover_urls.sql` was absent from the 22-entry production ledger.
- The open PR #101 description says Production already records the `news_cover_urls_20261115` migration.

These records conflict. A new read-only ledger check is required.

**Why it matters**

A migration existing in Git does not mean it has been applied. A migration appearing in the ledger does not prove every required column, view, function, grant and policy is correct. Duplicate version prefixes can also cause migration tooling and ledger reconciliation problems.

**Required solution**

1. Freeze production schema changes until the current migration ledger is freshly read.
2. Export a backup and verify that restoration is possible.
3. Compare the live catalog against every migration expected by the current release.
4. Resolve duplicate version prefixes through a carefully reviewed migration-history plan. Do not casually rename or edit migrations already applied to production.
5. Reconcile the exact status of `news_cover_urls_20261115`.
6. Apply only reviewed, additive migrations through the approved Supabase migration process.
7. Verify each affected table, view, RPC, grant, RLS policy and migration ledger entry after application.
8. Update `docs/16-schema-runbook.md` only after the live baseline is known.

**Acceptance criteria:** one inventory matches the actual production ledger; every migration has a unique intentional version; no migration is falsely marked applied; existing articles, users, roles, audit records and version history remain intact; anonymous and authenticated access tests pass against a real Supabase preview branch.

### P0.2 — News must be verified against the current live database contract

The current `main` News page reads from `published_articles` and selects fields including `cover_url`. The article route also reads publication metadata and the selected published body. The 11:10 WAT handoff records a real production `42703` missing-column failure and two approved article rows that were not visible through the public routes at that time.

The later PR #101 description claims the two stories and both article pages were subsequently verified after hydration. Because the handoff and PR description disagree, this needs a fresh check.

**Required solution**

- Confirm the exact production migration ledger.
- Confirm `published_articles` exposes every column selected by the current page.
- Test the feed using the anonymous/public role, not only an administrator.
- Test both approved story URLs directly.
- Verify that article body reads follow the exact published-version pointer.
- Verify that private drafts and unpublished revisions remain inaccessible.
- Verify cover URLs, alt text, source, license and credits.
- Verify canonical URL, Open Graph metadata and sitemap behavior.
- Check the deployed build SHA, not merely HTTP 200.

**Acceptance criteria:** `/news` renders the two approved stories without a load-error state; both approved article URLs show the expected title and body; private drafts remain inaccessible through direct URLs, search, metadata and public views; no test article is created in production.

### P0.3 — Phase 1 scope drift must be resolved

The repository's current PRD and agent instructions describe all eight areas as current release scope, including Forum, Map, Business Directory and Marketplace, Tourism, Radio and Who is Who. The current source also contains order and payment-related schema and workflows.

Earlier Phase 1 approval described an institutional website, a separate digital newspaper and its CMS/admin. The agreed early business-directory scope was listings and contact details; marketplace checkout, delivery/order management and payments were later-phase work. The earlier Phase 1 structure also described `epelawa.ng`, `news.epelawa.ng` and an admin/CMS destination, whereas the current repository uses a Vercel canonical URL and same-origin `/news` and `/admin`.

**Why it matters:** a repository can become technically busy while quietly delivering beyond the paid/approved scope. That creates delivery, support, acceptance and commercial risk.

**Required solution**

Create a signed-off scope crosswalk with three columns: Phase 1 launch requirements, later-phase features and current implementation status.

Unless a later written client approval superseded the earlier Phase 1 agreement, keep the business directory listings-only in the launch acceptance criteria. Keep checkout, payment, delivery management and other later-phase work out of the current release gate.

The eight-area web product vision can remain in the longer roadmap, but it must not be confused with the paid Phase 1 acceptance scope.

### P0.4 — No repository CI workflow is checked in

The recursive Git tree contains no `.github/workflows/` files. Local scripts and tests exist, but the repository does not currently show a GitHub Actions workflow enforcing gates.

**Required solution**

Add CI that uses Node 22 and pnpm 10.34.9, performs frozen-lockfile installation, workspace typecheck, both production builds, frontend/backend tests, whitespace checks and the appropriate security/static audit. Publish exact commit status to each PR. CI must not access production secrets or write to production.

Do not merge a PR because a local test report says it passed. Require successful checks on the exact PR head.

---

## 5. High-priority findings

### P1.1 — Project documentation is stale and contradictory

- `PROJECT_AUDIT_AND_REMAKE_PLAN.md` is a 7 November snapshot. It describes missing helper modules, an unfinished Admin architecture and an earlier release scope. The current tree contains many of those modules and a more mature staff session/capability design.
- `README.md` still refers to a 7 November public deployment baseline.
- `docs/14-tracker.md` says it was last checked on 13 November.
- `docs/17-owner-requirements-checklist.md` carries a 14 November snapshot.
- `docs/16-schema-runbook.md` describes 13 migrations, while the current tree has 40.
- The progress log and full-project handoff do not yet reflect the latest main commit `a6230fc...`.
- PR #101 describes newer status than some of the handoff documents.

**Required solution**

- Mark the 7 November audit as historical and superseded.
- Rewrite the README's current release and deployment section from verified evidence.
- Update the tracker and owner checklist from the latest main SHA.
- Rebuild the schema runbook from the live migration ledger.
- Retain old snapshots in the historical log, not as current instructions.
- Maintain one current handoff with timestamp, exact SHA, deployment status, migration status, blockers and next action.

**Acceptance criteria:** a new developer can read README → master plan → tracker → current handoff and get one consistent answer about scope, release state and next safe action.

### P1.2 — Legal pages are not publication-grade yet

**Source review**

- `/privacy` explains Supabase authentication, essential session cookies, public contributions, map handoff and unavailable contact channels. It does not identify the legal controller with a full legal identity/address, give a dedicated privacy contact, or publish fixed retention periods. It expressly says access/correction/deletion request intake is unavailable.
- `/terms` is concise but incomplete. It says governing law has not been settled.
- `/guidelines` combines editorial, history, business verification and forum behavior, but does not provide a complete operational editorial correction/complaint process.
- `/contact` is explicitly a status page and does not receive or store messages.

**Required solution**

Maintain distinct documents:

1. Privacy Notice.
2. Terms of Use.
3. Community Guidelines.
4. Editorial Standards and Corrections Policy.
5. Cookie/Storage Notice, only to the extent it accurately describes technologies actually used.

The Privacy Notice must be grounded in the real data inventory, controller identity, processor list, lawful bases, retention schedule, international transfer assessment, rights process and functioning contact route. Do not invent provider names, retention periods or legal identities.

The Terms should define account rules, user-submitted content, content licensing, directory disclaimers, editorial rights, suspension, liability limits and governing law after legal review.

Community Guidelines should include reporting, moderation, proportionate enforcement and appeal handling only where those workflows actually exist.

Editorial Standards should explain sourcing, right of reply, attribution, sponsored content, corrections and historical uncertainty.

**Acceptance criteria:** every public promise is supported by a functioning process or clearly labelled unavailable. A Nigerian legal professional reviews final legal wording before publication.

### P1.3 — Contact and reporting are dead ends

The footer links to “Contact the team” and “Have something to share?” The Contact page states email delivery and secure storage are not connected and no message is received. The Guidelines and Privacy pages also explain that privacy requests, corrections and reports cannot currently be submitted.

**Required solution**

Choose one honest launch state:

- Configure secure server-side contact/report intake with spam protection, validation, access restrictions, retention rules, acknowledgement and a monitored recipient; or
- Publish verified organisational contact details and label unavailable digital intake clearly.

Do not add a fake success toast, non-persistent form, mailto link presented as a submitted ticket, or newsletter signup that does not store or deliver anything.

**Acceptance criteria:** a real user can reach a monitored channel for general enquiries, privacy concerns, correction requests and urgent moderation reports. Each submission has an auditable handling path and clear privacy notice.

### P1.4 — Design system has drifted between cobalt and forest green

The global design system defines a cobalt identity:

- Midnight `#0A1023`
- Navy `#17264A`
- Royal Steel `#294B91`
- Cobalt `#477FE0`
- Ice Blue `#A7C5F5`
- Cloud `#F1F4FA`
- Silver `#A6B2C5`

The current News styles use a forest-green editorial palette. PR #101 proposes a forest-green global navigation reference. The homepage screenshots show the cobalt identity.

**Required solution**

Define one explicit hierarchy rather than allowing pages to look like unrelated templates:

- Core EPE LAWA brand: cobalt/Cloud/Midnight.
- News editorial treatment: forest green may be used as a restrained publication accent if intentionally approved.
- Shared brand mark, type scale, spacing, control sizes, focus states, header behavior and footer behavior remain consistent.
- The News header/footer should feel like an editorial section of EPE LAWA, not a separate unbranded website.
- Avoid a second global color system unless the owner explicitly approves a full rebrand.

### P1.5 — Public navigation and Admin dashboard redesign are not released

PR #101 is a draft/open PR. GitHub reported it as dirty/non-mergeable at inspection time. Its description proposes replacing the public hamburger/drawer with a green reference navbar and redesigning the Admin dashboard using only real capability-gated counts. It also proposes tighter external image-host validation.

The PR description says local typecheck/build/tests passed, but its own preview follow-up and genuine desktop/mobile screenshots remain pending. It is not part of the audited `main` commit.

**Required solution**

- Resolve the dirty branch against latest main.
- Review the navbar at 320, 375, 390, 430, 768, 1024 and 1440 CSS px.
- Ensure important routes remain reachable without an overlay obscuring the page.
- Ensure the More disclosure works by keyboard and touch.
- Ensure active navigation is visible and announced.
- Ensure the mobile layout wraps cleanly or uses deliberate mobile navigation.
- Review the Admin dashboard with real capability-gated data only.
- Ensure query errors display Unavailable, not zero.
- Ensure no sample chart, fake activity, fake newsletter count or private user data is shown.
- Test Admin overflow at 390px; the progress log records an earlier 641px document width in a synthetic Newsroom capture.

**Acceptance criteria:** PR rebased, mergeable, exact-head checks pass, fresh desktop/mobile screenshots attached and preview verified before normal merge.

---

## 6. Visual and UX audit

### Homepage — what works

- “Epe. Closer to home.” is a strong, memorable hero statement.
- The Epe fish monument provides a recognisable local visual anchor.
- “Epe · Lagos State” gives useful context.
- The page introduces community, history and business value.
- The visual language is more intentional than a generic template.
- The footer contains useful destinations and policy links.

### Homepage — what should change

1. **Header/content collision:** in the supplied scroll screenshot, the floating header visually covers part of the “Here’s the latest” heading. Add a correct sticky-header offset/scroll margin and verify anchors and scroll positions.
2. **Logo presentation:** verify the actual source asset is sharp at 1× and 2× density. The screenshot shows the mark very small inside a pale rounded container. Improve lockup legibility without enlarging it excessively.
3. **Hero image treatment:** preserve real Epe imagery, but standardise aspect ratio, object position, crop, credit and responsive loading. Never use generated art as documentary evidence.
4. **CTA hierarchy:** keep one primary action and one secondary action per major section. Avoid repeating “Explore”, “Join” and “Learn more” without a clear next step.
5. **Empty news state:** if no articles are available, do not let a large empty panel dominate the narrative. Use a compact editorial empty state with a clear newsroom link.
6. **Footer:** preserve the two-column mobile structure, but shorten long labels and make unavailable contact functionality explicit.
7. **Page rhythm:** reduce repeated large rounded cards where a simple editorial section, divider or list communicates the same information.
8. **Image credits:** maintain visible and accurate source/license attribution for documentary images.

### News listing

**What works**

- The source uses a published-only view rather than reading private article records.
- It supports search, category navigation and bounded pagination.
- Breaking status is tied to an actual flag and expiry timestamp.
- It has a distinct editorial stylesheet and metadata.
- It distinguishes loading/error/empty states rather than inventing stories.

**What should change**

1. Do not ship a page that returns HTTP 200 while rendering a backend failure state.
2. Keep the News masthead, article list and footer aligned to the chosen EPE LAWA brand hierarchy.
3. Do not display Trending or Breaking without real qualifying data.
4. Keep one stable editorial layout. The current main branch has moved away from minute-rotating layouts; do not reintroduce rotation.
5. Keep the lead image high priority and offscreen images lazy-loaded.
6. Keep the page readable on narrow Android screens and avoid oversized blank panels.
7. Make article title, date, category and image links predictable.
8. Ensure search, category and pagination preserve query parameters.
9. Keep external cover sources HTTPS-only, validated and attributed.
10. Do not offer image upload as working until a real Storage bucket and policy are configured.

### News article

The article route has canonical metadata, social metadata, author/category information, cover metadata, publication date, related stories, share actions and comment integration in source.

Required QA:

- Confirm the public body is the exact published version.
- Confirm drafts and newer private revisions cannot leak through article URLs or metadata.
- Confirm no broken image or missing attribution appears.
- Keep article text around 62–72 characters per line on desktop.
- Keep mobile text at least 16px with readable line height.
- Make source links, correction notes and updated timestamps easy to find.
- Keep comments unavailable if the live comment schema/provider is not ready.
- Verify social previews from the canonical deployed URL.

### Navigation and drawer

The supplied screenshot shows a large right-side drawer over a blurred page. The source implements focus management, Escape handling, outside click and focus restoration, which is good engineering.

The visual problem is not simply that a drawer exists. It is that the menu occupies most of the screen and the underlying page becomes an indistinct background. The menu should have a clear hierarchy, concise labels, obvious account actions and predictable close behavior.

PR #101 proposes a different navigation pattern. Do not merge it solely because the screenshot looks cleaner. It must pass touch, keyboard, focus, responsive wrapping, active-state and route-coverage tests.

### Footer

The footer is information-rich and readable, but the current screenshot makes the page extremely long on mobile. That is acceptable if useful, but group links by task, avoid duplication, use concise labels, keep policies easy to find and do not present a dead-end contact route as a working contact channel.

---

## 7. Module-by-module product audit

The repository describes eight current web areas. Source presence is not proof of live completion.

| Module | Current source direction | Main issue / required action |
|---|---|---|
| News | Published feed, article pages, categories, search and covers | Resolve live view/schema status; verify two approved stories and article routes; verify published-version privacy |
| Itan Ilu Mi / History | Private contributions, provenance, consent, review and public records | Verify submission, reviewer, correction, dispute and removal workflows; never publish family data by default |
| Forum | Threads, replies, polls, reports and moderation schema/UI | Verify taxonomy, member posting, vote privacy, rate limits, report resolution and moderation audit against live Supabase |
| Map & Navigation | Safe outbound Google Maps search/directions | Do not claim Places/geocoding integration; verify only approved destinations and explicit location permission |
| Business Directory | Published listings, owner submissions and review | Keep launch scope listings-only if that is the approved Phase 1 scope; do not expose private owner data |
| Marketplace / Payments | Product/order/payment schema exists | Keep checkout, payment and delivery operations out of launch scope until explicitly approved and sandbox-tested |
| Tourism | Destination pages and licensed image references | Verify every destination, claim, location, hours and access detail from approved sources |
| Radio | Player and Radio Lagos 107.5 FM reference | Verify stream rights, URL, browser playback and failure states; do not invent schedules or archive content |
| Who is Who | Public people/profile directory | Verify identity, role, source, consent and public fields; no official status without recorded human verification |

Do not seed fake articles, people, business listings, reviews, map pins, forum activity, metrics or testimonials to make the website look populated. Missing approved data should produce an honest empty state and a clear contribution process.

---

## 8. Backend, authentication and security

### Good foundations to preserve

The inspected code and project instructions show:

- Public and staff apps are separated.
- The Admin Supabase client is request-scoped and uses the current staff user's access token with a publishable key.
- Staff access is verified server-side.
- Staff sessions use a host-only `__Host` cookie with Secure, HttpOnly and SameSite=Lax settings.
- Capability checks are performed through Supabase/database functions.
- Article publishing uses revision-aware transitions and audit events.
- Member and staff identities are kept separate.
- Private drafts and submissions are not intended for public views.
- Production test writes are prohibited.
- Admin metrics distinguish unavailable from zero.
- Map location is requested only after an explicit user action.

These are not characteristics of a careless throwaway prototype. Preserve them.

### Required security verification

Run a negative-test matrix:

1. Anonymous visitor cannot read drafts or private submissions.
2. Member token cannot access staff routes.
3. Staff without `article.publish` cannot publish.
4. Staff with a revoked capability loses access on the next request.
5. Stale article revision returns conflict and does not overwrite newer content.
6. Every privileged state transition creates the expected audit event.
7. A user cannot change another member's profile or content.
8. Private order/contact fields are not exposed in public listing queries.
9. Payment status cannot be set by browser input.
10. Webhook signatures are checked against raw request bodies and events are idempotent before payments are enabled.
11. No service-role secret is bundled into browser JavaScript.
12. Error messages do not leak tokens, SQL, provider payloads or private record existence.

PGlite is useful for local SQL behavior, but it is not proof of live Supabase grants, RLS, extensions or transaction-pooler behavior. A real Supabase preview branch is required.

### Environment-variable documentation mismatch

The root `.env.example` lists `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The public app reads those values (with a server-side `SUPABASE_ANON_KEY` fallback).

The Admin server client instead reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, and requires a key beginning with `sb_publishable_`.

Those Admin variable names are not listed in the inspected root `.env.example`.

**Required solution:** document every variable actually consumed by both apps, label public versus server-only values, and verify Vercel Development/Preview/Production environments independently. Do not paste credentials into documentation or commit secrets.

### Security headers and browser policy

The main app sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and a report-only Content Security Policy.

Recommended improvements:

- Keep report-only CSP until scripts, images, media and embeds are inventoried.
- Add a reporting endpoint or another way to collect CSP violations before enforcing it.
- Review whether the global `Access-Control-Allow-Origin` response header is needed on every page.
- Verify external image hosts and third-party embeds.
- Keep `no-referrer` on external cover images where appropriate.
- Confirm caching headers are private/no-store for member, staff and draft responses.

---

## 9. Performance, SEO and reliability

### Global dynamic rendering

The public root layout exports `dynamic = "force-dynamic"`. This can force otherwise static public routes to be rendered dynamically.

**Recommended change:** review this at route level. Keep session-dependent and live-data routes dynamic where necessary, but allow stable pages such as About, Contact status, Terms, Privacy, Guidelines and other static content to use static rendering or suitable revalidation.

Do not remove the setting blindly. First verify which child routes depend on cookies, live Supabase data or request-specific state.

### Image delivery

- Use responsive `sizes` and intrinsic dimensions.
- Preload only the true lead/hero image.
- Lazy-load below-the-fold media.
- Preserve image credit, source and licence.
- Keep large original assets out of the initial mobile payload.
- Respect Save-Data and reduced-motion preferences.
- Avoid generic fallback art that could be mistaken for a real local photograph.

### SEO

The app has metadata, canonical URL helpers, Open Graph and Twitter metadata, sitemap and robots handlers.

Required checks:

- One canonical domain decision.
- Correct canonical host on every route.
- No private `/admin/*`, auth callback, draft or private contribution indexing.
- Article metadata only from published content.
- Sitemap contains only approved public routes and published articles.
- Correct social image dimensions and alt text.
- No duplicate canonical hosts or old `news.epelawa.ng` versus `/news` conflict.
- Structured data only where information is verified and appropriate.

### Domain and deployment

The current repository documents `https://epelawa.vercel.app` as the canonical public origin and uses same-origin `/news` and `/admin`.

Earlier Phase 1 planning referenced `epelawa.ng`, `news.epelawa.ng` and a separate CMS/admin destination. Confirm the intended production domain and host arrangement before launch.

**Required solution:** select the canonical domain, attach and verify it in Vercel, confirm DNS/TLS, redirect non-canonical hosts, set `NEXT_PUBLIC_SITE_URL`, verify metadataBase/canonical/sitemap/robots/share links, decide whether News remains `/news` or moves to `news.epelawa.ng`, and confirm staff cookie scope after the domain decision.

---

## 10. Operational integrations and honest availability

| Feature | Evidence | Required before claiming operational |
|---|---|---|
| Supabase | Auth, database and RLS code exists | Current ledger/catalog checks and real preview RLS tests |
| Email | Branded templates and auth flows exist | Authenticated sender domain, provider configuration, test-recipient delivery and failure handling |
| Contact intake | Contact status page exists | Secure persistent submission route and monitored recipient |
| Newsletter | UI explicitly unavailable/non-collecting | Provider, consent, storage, unsubscribe and delivery workflow |
| Advertise enquiries | Advertise information page exists | Secure enquiry intake and reviewed commercial process |
| Storage/direct upload | Media metadata and storage references exist | Real bucket, access policies, upload validation and deletion/retention controls |
| Paystack | Payment schema and contracts exist | Provider setup, sandbox signature/idempotency/reconciliation tests and approved scope |
| Maps | Safe outbound Google Maps URL construction | API key, Places/geocoding integration and verified local dataset if in-app search is required |
| Radio | Radio Lagos 107.5 FM player reference | Rights/permission, URL verification, actual browser playback and fallback monitoring |
| Push notifications | Supporting code/schema concepts exist | Service worker, authenticated subscription endpoint, VAPID keys and actual delivery pipeline |

The UI must not claim a form was submitted, a payment succeeded, a message was sent, a newsletter subscription was saved or a stream is live unless the complete underlying path has been verified.

---

## 11. Accessibility and responsive quality

The design documents target WCAG 2.2 AA and specify 320, 375, 768, 1024 and 1440 CSS-pixel coverage; at least 44×44px touch targets; visible keyboard focus; keyboard-operable menus; reduced motion; readable typography and contrast; and distinct loading, empty, error and denied states.

The next release should also verify:

- 200% zoom and reflow.
- Screen-reader names and landmarks.
- Form labels and error announcements.
- Focus order after navigation.
- Drawer/dialog focus containment and restoration.
- Contrast in both themes.
- Table overflow contained within its region.
- No content hidden behind sticky headers or bottom notices.
- No horizontal document overflow at 320px.
- Browser back/forward behavior after filters, search and drawer interactions.

Automated accessibility tests are necessary but do not constitute certification.

---

## 12. Documentation and release-control changes

Maintain one hierarchy:

1. `README.md` — product, setup and current release status.
2. `docs/00-master-plan.md` — approved scope and direction.
3. `docs/01-product-requirements.md` — acceptance criteria by module.
4. `docs/05-design-system.md` — design tokens and UI standards.
5. `docs/06-system-architecture.md` — application and data boundaries.
6. `docs/08-permissions-security.md` — auth, roles, capabilities and privacy.
7. `docs/11-testing-acceptance.md` — release gates.
8. `docs/12-development-roadmap.md` — prioritized delivery phases.
9. `docs/14-tracker.md` — current status with exact evidence.
10. `docs/16-schema-runbook.md` — verified production migration procedure.
11. `docs/16-progress-log.md` — timestamped changes.
12. One `docs/handoffs/current.md` — exact current resume point.

Mark `PROJECT_AUDIT_AND_REMAKE_PLAN.md` as a historical 7 November audit, not current release guidance. Replace stale README deployment notes. Replace the 13-migration runbook with the current 40-file inventory and a verified live ledger. Keep historical snapshots in the progress log. Label screenshot artifacts as local synthetic fixtures or actual production captures.

---

## 13. Recommended implementation plan

### Phase A — Establish the release baseline

1. Confirm approved Phase 1 scope and domain arrangement.
2. Refresh GitHub main SHA and open PR list.
3. Refresh Vercel deployment state for the exact main SHA.
4. Read the live Supabase migration ledger and catalog.
5. Back up and verify restore procedure.
6. Reconcile migration version collisions and stale schema documentation.
7. Verify the two approved News stories and article pages.
8. Update README, tracker and handoff.

**Exit condition:** one accurate release baseline with no ambiguity about schema, scope or deployment.

### Phase B — Complete the core public experience

1. Fix News live feed and article rendering.
2. Complete the approved public navigation redesign.
3. Correct sticky-header/scroll overlap.
4. Align homepage and News design language.
5. Complete About, Contact, legal and editorial information.
6. Provide a real contact/report channel or publish verified contact details.
7. Verify mobile and desktop layouts.
8. Verify SEO, canonical URLs, image credits and accessibility.

**Exit condition:** all launch pages work, content is real, navigation is coherent, and no important CTA leads to a misleading dead end.

### Phase C — Complete the staff workspace

1. Resolve and rebase PR #101.
2. Review the Admin dashboard using only real capability-gated counts.
3. Verify newsroom create, save, edit, publish, unpublish and revision conflict behavior.
4. Verify category/byline settings.
5. Verify staff role/capability management and audit.
6. Verify mobile dashboard/newsroom overflow.
7. Verify unauthorized direct requests fail closed.

**Exit condition:** verified staff can perform approved work while unauthorized accounts cannot.

### Phase D — Complete only approved Phase 1 workflows

1. Member registration, email verification, login and password recovery.
2. News reading and approved editorial process.
3. Radio player if rights and stream checks pass.
4. Listings-only business directory if that remains the agreed launch scope.
5. Basic public information and contact paths.

Keep later-phase items separate until approved. Do not silently make marketplace checkout, payments or delivery management a Phase 1 requirement.

**Exit condition:** every Phase 1 workflow passes an end-to-end test in an isolated environment.

### Phase E — Release and operations

1. Add GitHub Actions CI.
2. Run full typecheck/build/test gates on the exact commit.
3. Run Playwright across required widths.
4. Run real Supabase preview RLS and migration checks.
5. Test email using a private recipient.
6. Verify backup/restore and migration procedures.
7. Verify canonical domain and TLS.
8. Perform read-only production smoke tests.
9. Merge through the normal PR path only.
10. Verify exact production deployment SHA after merge.

**Exit condition:** exact release evidence is recorded, not inferred from a green local build or HTTP 200.

---

## 14. Prioritized backlog

| Priority | Task | Why it matters | Completion evidence |
|---|---|---|---|
| P0 | Confirm approved Phase 1 scope | Prevents unauthorized scope expansion | Owner-approved scope crosswalk |
| P0 | Reconcile 40 migrations with live ledger | Prevents broken production schema | Ledger/catalog diff and migration plan |
| P0 | Resolve duplicate migration prefixes | Prevents ambiguous migration history | Unique versions and verified ledger |
| P0 | Verify News feed and two approved articles | Core public trust and known live discrepancy | Anonymous live read and direct article checks |
| P0 | Add CI workflows | Prevents unverified PR merges | Exact-head GitHub Actions checks |
| P1 | Reconcile PR #101 | Main navigation/Admin work is unreleased | Clean PR, screenshots and exact checks |
| P1 | Update README/tracker/schema runbook | Prevents developers following stale instructions | One current source of truth |
| P1 | Implement real contact/report intake | Current contact/correction/privacy routes are dead ends | Successful test submission and monitored handling |
| P1 | Finish legal policy suite | Legal transparency and accountability | Reviewed policies and working request channels |
| P1 | Resolve cobalt/green design hierarchy | Prevents fragmented brand | Approved design decision and cross-route QA |
| P1 | Fix header overlap and mobile overflow | Visible usability defects | Playwright and screenshot evidence |
| P1 | Verify Admin access and publishing negatives | Protects private content and staff operations | Live preview RLS and direct-request tests |
| P2 | Improve route-level caching | Better performance and lower dynamic rendering | Measured before/after performance |
| P2 | Complete approved History/Forum/Tourism/Who-is-Who workflows | Expands platform only when data and operations are ready | Verified sources and workflow evidence |
| P2 | Configure Storage, email and Maps providers | Enables unavailable features | Provider-specific end-to-end tests |
| P3 | Marketplace/payments and delivery | Later-phase scope unless separately approved | Written approval plus private Paystack sandbox |
| P3 | Push notifications, offline maps, mobile apps and roadmap enhancements | Additional capability after core stability | Separate approved phase and acceptance plan |

---

## 15. Definition of done

A feature is not complete merely because a route exists, a component renders, a button is visible, a database table exists, a migration file exists, a local unit test passes, a Vercel deployment says READY or an endpoint returns HTTP 200.

A feature is complete only when:

1. The user journey is implemented.
2. Relevant database objects and permissions exist in the target environment.
3. The server validates and authorizes the action.
4. Private information remains private.
5. Loading, empty, unavailable, error and denied states are accurate.
6. The feature works on mobile and desktop.
7. Accessibility checks pass.
8. The exact PR head passes CI.
9. The feature is verified in preview or an isolated production-equivalent environment.
10. The exact production deployment is checked after merge.
11. Documentation and operational ownership are updated.

---

## 16. Final recommendation

EPE LAWA has a real product foundation and a lot of work that should not be thrown away. The strongest parts are the separation of public and staff applications, capability-based security direction, version-aware publishing, truthful empty/error states, local responsive testing and the explicit ban on fabricated community content.

The weak point is the gap between **what the repository says is in scope, what the database has actually received, what the public deployment serves, and what the organisation can operationally support**.

The next release should focus on those gaps. Do not add more decorative UI, fake content, speculative analytics or payment buttons. Do not merge the draft navigation/Admin PR until it is clean and visually verified. Do not push database migrations until the live ledger and duplicate versions have been reconciled.

**The target is not a website that merely looks finished. It is a company platform whose public claims, user journeys, backend permissions, database state, operational channels and release evidence all agree.**

---

## 17. Repository references

- [Repository](https://github.com/epelawa/EPE-LAWA)
- [README](https://github.com/epelawa/EPE-LAWA/blob/main/README.md)
- [Master plan](https://github.com/epelawa/EPE-LAWA/blob/main/docs/00-master-plan.md)
- [Product requirements](https://github.com/epelawa/EPE-LAWA/blob/main/docs/01-product-requirements.md)
- [Design system](https://github.com/epelawa/EPE-LAWA/blob/main/docs/05-design-system.md)
- [System architecture](https://github.com/epelawa/EPE-LAWA/blob/main/docs/06-system-architecture.md)
- [Permissions and security](https://github.com/epelawa/EPE-LAWA/blob/main/docs/08-permissions-security.md)
- [Testing and acceptance](https://github.com/epelawa/EPE-LAWA/blob/main/docs/11-testing-acceptance.md)
- [Roadmap](https://github.com/epelawa/EPE-LAWA/blob/main/docs/12-development-roadmap.md)
- [Schema runbook](https://github.com/epelawa/EPE-LAWA/blob/main/docs/16-schema-runbook.md)
- [Current project handoff](https://github.com/epelawa/EPE-LAWA/blob/main/docs/handoffs/2026-11-15-full-project-handoff.md)
- [PR #101](https://github.com/epelawa/EPE-LAWA/pull/101)

**Audit status:** Repository/source review completed to the limits described in Section 2. Production database, current deployment, provider integrations and full live end-to-end journeys require separate verification.
