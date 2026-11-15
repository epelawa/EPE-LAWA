# EPE LAWA — Testing and Acceptance

**Status:** Acceptance plan and evidence boundaries, not a report that current release tests passed.

## Evidence and claims

Historical test results elsewhere in this repository may predate current edits. They are not evidence for the current worktree. Do not claim typecheck, builds, tests, Playwright, accessibility, integration or release gates passed unless the exact check was run and its result recorded. PGlite is a local simulation, not proof of live Supabase RLS. Production tests are read-only.

## Test levels

| Level | Coverage | Requirement |
| --- | --- | --- |
| Type/build | All maintained apps/packages | Run for release candidate and record output |
| Unit/integration | Validators, access decisions, transitions, HTTP headers and errors | Isolated fixtures; no production data |
| Database | Constraints, policies, revisions, audit | Isolated environment; label simulations accurately |
| E2E | Full Playwright coverage for eight modules and cross-cutting auth/staff flows | Required before release |
| Accessibility | Automated checks plus manual keyboard/screen-reader review | Test responsive behavior, focus, labels, contrast, reduced motion |

## Required Playwright journeys

1. Visitor navigates to each in-scope section and sees honest empty/error states.
2. Reader sees published news only; private drafts are unavailable through direct URLs, search and metadata.
3. Verified staff member with `article.publish` publishes a private draft directly; no second reviewer required; stale revision is rejected and transitions are audited.
4. Member signup, email verification, login and password recovery use generic responses and secure sessions.
5. History contribution stays private until provenance/consent review; approved records alone are public.
6. Member posts/replies/reports in the Digital Village Square; unauthorized actions fail and moderation is reasoned/audited.
7. Map search and outbound directions are safe and clearly external; no default GPS request, private address exposure or Maps API claim.
8. Business listing review and product/order actions use private isolated data; payment stays unavailable unless provider sandbox tests pass.
9. Tourism facts and destinations are sourced; Radio stream/programme states are truthful; Who is Who profiles and official-role claims have recorded approval/verification.
9. Member/staff boundaries, capability revocation, privacy, audit and admin analytics failure/zero distinction are checked.

Test at 320/375/768/1024/1440 CSS px, keyboard-only, zoom/reflow and reduced motion. Check loading, empty, error and denied states. Full Playwright coverage is required; do not mark this gate complete based only on unit tests.

## Homepage and mobile-navigation checks

Within public routes, verify that only `/` omits the mobile bottom navigation; News, Discover and Account retain the accessible four-tab set. On authenticated `/dashboard`, verify Home, Discover, Saved and Profile each reach an actual section and announce the active destination. The homepage carousel must use source-attributed local Epe photos, show no slide controls by default, provide a keyboard-focus pause control, and stop on hover/focus, hidden tabs, reduced-motion preference or data-saver/2G connections. The newsletter stays visibly unavailable and non-submitting until an approved provider and its privacy/consent safeguards are configured.

## Security negatives

Verify cross-member data isolation; member token rejected by staff routes; staff identity not used as member; private draft/submission denial; stale revision conflict without overwrite; each privileged transition audited; unauthorized moderation/business actions refused; secrets absent from browser bundles. Provider tests use test credentials and isolated recipients only.

## Fixtures and production safety

Use synthetic test records only in isolated environments and clean them up. Do not seed demo data. Never write test articles, orders or payments to production. Any explicitly requested public test article requires prior approval of its exact payload; otherwise keep it private.

## Current known limitations

No current Playwright or full release-gate result is asserted here. Email and Paystack provider operation is unconfirmed. Maps API/Places/geocoding is not configured; current behavior uses safe outbound URLs. Report blockers rather than converting them into passed gates.
