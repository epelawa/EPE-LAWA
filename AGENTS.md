# EPE LAWA — Agent Working Rules

Read this file and `docs/00-master-plan.md` before project work. `docs/01-product-requirements.md` is the detailed local source of truth.

## 1. Current scope

The current release includes all eight client-approved web areas (sections 3.1–3.8): Trending News; Itan Ilu Mi / My Community History; Chat Forum / Digital Village Square; Map & Navigation; Epe Business Directory & Marketplace; Historical Sites & Tourism; EPE LAWA Radio; and Who is Who in Epe. Cross-cutting requirements: member signup/email verification/login/recovery, secure staff sessions and capabilities, admin analytics, news publishing, branded transactional email templates, audit, privacy, accessibility and full Playwright testing. Native mobile apps alone are deferred. Keep all six section 5 future enhancements in the full roadmap, distinct from the eight current web areas.

## 2. Truthfulness and privacy

Never invent local facts, history, people, businesses, prices, reviews, map locations, metrics or article content. Use approved public records only; distinguish loading, empty, error and denied states. A trend requires real signals; a verification badge requires recorded human review. Current map code builds safe outbound Google Maps search/directions URLs only; there is no configured Maps API key or verified Places/geocoding integration. Offline maps are optional future work. Do not claim email or Paystack providers are operational without evidence.

Test content stays private in isolated environments. Production is read-only: no test articles, orders, payments or other writes. Never expose private member, seller, delivery or verification data.

## 3. Identity, authorization and publishing

Authorization is enforced server-side and in database policies; hiding a button is not authorization. Staff and member sessions are separate. Protected staff actions require a verified staff session and a fresh capability check. An active verified staff member with `article.publish` may publish directly; no second reviewer is required. Every transition uses the expected revision, rejects stale revisions and is audited. Never trust browser-supplied prices or payment state; payment flows remain unavailable until provider setup and isolated testing are evidenced.

## 4. Verification and delivery

Use Node.js 22 and pnpm 10. Run `pnpm typecheck`, `pnpm build`, and `pnpm test` when appropriate; a green result must come from a completed command. Full Playwright coverage is required across routes, auth/staff actions and responsive widths 320/375/768/1024/1440 CSS px, plus keyboard/accessibility/reduced-motion checks. Do not claim unrun tests or unverified integrations passed. Production reads only.

No credentials, secrets or real personal information in fixtures, logs or commit messages. Add environment-variable names to `.env.example`, never values.

## 5. Git and deployment

This task authorizes documentation/copy changes only. Do not commit, push, merge or otherwise change Git state unless explicitly authorized in the active task. Record deployment/preview status as unverified unless inspected with evidence.

## 6. Project architecture

Public app: `frontend/apps/main`; staff app: `frontend/apps/admin`; shared UI: `frontend/packages`; tests: `frontend/tests`; migrations: `backend/supabase/migrations`; docs: `docs/`. Existing database objects may cover additional historical features; that inventory does not expand current product scope. Never rewrite historical migrations/schemas as a documentation shortcut.

## 7. Design direction

Use Sckooly’s public-site structure as reference, with original EPE-LAWA branding and owner-provided red `#DA251C`, coral `#FF4A3D`, navy `#17253A`, light blue `#EAF3FB`, warm ivory `#FCFAF7`, white and charcoal direction. Do not copy assets. Use restrained surfaces, SVG icons (no emoji), visible focus, accessible contrast, 44×44px touch targets and reduced motion. Clearly label any genuine sponsored placement.

## 8. Documentation

Keep active scope, tracker and progress evidence consistent. `[x]` requires named evidence. Archive/historical database inventory may mention legacy objects factually, but must not present them as current release features.
