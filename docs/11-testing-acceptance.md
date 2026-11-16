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

## Owner-provided motion references: implementation and acceptance evidence

This is a static source/test inventory at commit `d8de649de710fd6accec5bffe3f1f65fdae3b67f`, not a report that these tests were run in this task. Test paths shown without `frontend/` are relative to `frontend/tests/`. The existing tests below cover only the stated adjacent behavior; none proves the exact reference animation. Broad accessibility or reduced-motion support must not be transferred to an interaction that is absent.

**Acceptance expectation, not a shipped feature:** Keep function and outcome available without decorative motion; honor `prefers-reduced-motion` by removing or reducing nonessential movement. Gesture-driven interactions require an accessible non-gesture alternative (keyboard-operable and touch-appropriate); passive numbers and success outcomes must remain available as truthful text. Persist only the underlying action/state that actually persists. These are criteria for any future implementation, not claims about current behavior.

### Springy button press

**Surface and current behavior:** Public/shared controls (`frontend/apps/main/app/globals.css`, `frontend/packages/ui/src/ui.css`) and the Radio Lagos play control (`frontend/apps/main/components/radio-player.tsx` / `radio-player.module.css`) exist. Their authored behavior includes hover changes and focus styling, but no press-phase sink or release spring. **Tests:** `frontend/tests/design-polish.test.mjs`, `foundation.test.mjs`, `ui-rebuild.test.mjs`, `browser-smoke/public-shell.spec.ts` and `radio-player.test.mjs` cover loader/reveal motion, carousel pause, control/focus/navigation or player behavior—not button press/release motion.

**Keyboard/touch and reduced motion:** Native semantic controls provide keyboard activation and visible focus; touch uses the controls’ native activation and documented target sizing. No separate touch press animation is implemented. General reduced-motion handling exists for reveal, transitions and carousel behavior, but there is no spring animation or pattern-specific reduced-motion test. **State/persistence:** No press animation state exists to persist; the player’s playback/mute state and carousel pause are separate transient interactions. **Gap:** No tested button surface sinks while pressed and springs back on release; the authored `:active`/press and release states and their reduced-motion test are absent.

### Pull-to-refresh

**Surface and current behavior:** Public and staff document roots suppress native boundary pull-to-refresh via `overscroll-behavior-y: none` in `frontend/apps/main/app/globals.css` and `frontend/apps/admin/app/globals.css`; ordinary scrolling remains enabled. The error-state `RetryButton` in `frontend/apps/main/app/retry-button.tsx` manually reloads only when activated. **Tests:** `frontend/tests/connectivity.test.mjs` explicitly checks that custom pull code/cues are absent and the boundary rules exist. `frontend/tests/browser-smoke/home-refresh.spec.ts`, `public-shell.spec.ts` and `mobile-bottom-nav.test.mjs` cover navigation/touch/keyboard behavior, not pull distance or refresh-on-release.

**Keyboard/touch and reduced motion:** Ordinary scrolling, keyboard/touch navigation and the explicit error-state “Try again” button are alternatives for their own purposes; none triggers a pull refresh. Public/admin reduced-motion rules are tested for other shell behavior, not a pull animation. **State/persistence:** There is no gesture progress, threshold, refresh state or gesture persistence. **Gap:** No custom resisted content movement, progress cue, threshold/release logic or refresh action exists or is tested; do not describe native refresh suppression or the manual retry as the reference interaction.

### Rolling number updates

**Surface and current behavior:** The mounted staff `/admin` dashboard has four request-scoped Live queue metrics (`frontend/apps/admin/app/(protected)/page.tsx`, re-exported at `frontend/apps/main/app/admin/(protected)/page.tsx`). Values render as static formatted text; `tabular-nums` is styling, not digit animation. **Tests:** `frontend/tests/admin-dashboard.test.mjs` checks real zero, restricted/unavailable values, count-only reads, responsive layout, focus and reduced-motion workflow-card styling. `frontend/tests/browser-smoke/admin-dashboard.admin-smoke.ts` checks metric fixtures at desktop/mobile widths, unavailable states, keyboard focus and overflow. Neither tests changing digits or animation.

**Keyboard/touch and reduced motion:** Metrics are passive text, so there is no keyboard/touch control that changes them; surrounding dashboard links remain native controls. The dashboard’s reduced-motion rule is for workflow-card hover motion only. **State/persistence:** Counts are read from the server/database on each dashboard request; the UI has no client metric persistence, and a reload requests fresh values. **Gap:** No per-digit rolling, timing/easing, interruption behavior or associated reduced-motion variant is implemented or tested.

### Drag-to-reorder

**Surface and current behavior:** `/admin/newsroom/settings` (`frontend/apps/admin/app/(protected)/newsroom/settings/page.tsx`) shows category cards with a numeric `Display order` field and Save action; it is not a drag surface. **Tests:** `frontend/tests/admin-newsroom-settings.test.mjs` checks route/access and category/byline save-RPC wiring. `admin-newsroom-mobile-overflow.test.mjs` covers the article table’s bounded scroller. Neither tests drag, lift or adjacent-item movement.

**Keyboard/touch and reduced motion:** The numeric field is keyboard-operable, but is not a keyboard equivalent of lifting/moving a card; no touch reorder alternative exists. Generic reduced-motion rules cover other UI, not a reorder interaction. **State/persistence:** The existing explicit order-save path calls `newsroom_category_save` and reads categories by `sort_order`; this describes numeric editing only, and live-schema persistence was not verified here. No dragged-card state exists. **Gap:** No drag handle/gesture, lift state, adjacent-card sliding, drop behavior, equivalent keyboard/touch reorder control or motion-specific test exists.

### Card expand/collapse

**Surface and current behavior:** Existing native disclosures include News search (`frontend/apps/main/app/news/page.tsx`), article options (`news/[slug]/page.tsx`), business order request, forum report controls, desktop navigation and staff People disclosures. These use `<details>/<summary>` rather than an eased expanding card. The public mobile navigation drawer is a separate animated interaction and is not evidence for card expansion. **Tests:** `frontend/tests/browser-smoke/public-shell.spec.ts` checks News search and desktop navigation keyboard/Enter/Escape; `navigation-notice-refresh.test.mjs` checks drawer structure and dismissal. No test measures card/disclosure expansion easing.

**Keyboard/touch and reduced motion:** Native summaries provide browser keyboard and pointer/touch activation; dedicated checks cover only some disclosures, not every listed surface. Global reduced-motion and drawer motion are covered separately; no card-easing variant exists or is tested. **State/persistence:** Disclosure open state is DOM-local, not stored. News search may open from URL query state; it is not a saved preference. Drawer state is transient and closes on navigation. **Gap:** No card-specific animated size/height, easing contract or reload/navigation persistence is implemented or tested; do not equate native disclosure state or drawer easing with the reference.

### Clear success feedback: check draws in

**Surface and current behavior:** Public Tourism/History contributions, member profile saves, business order/review results, and staff newsroom/review workflows show text/status feedback. Shared `Alert`/`Notice`/`StatusBadge` styles provide status semantics/color, not a drawn check. **Tests:** `frontend/tests/business-directory.test.mjs`, `history-admin.test.mjs` and `newsroom-publish-flow.test.mjs` check result copy/roles or guarded transitions; `design-polish.test.mjs` and `browser-smoke/public-shell.spec.ts` cover unrelated motion/accessibility. None checks a checkmark animation.

**Keyboard/touch and reduced motion:** Where implemented, success text (including `role="status"`) is available without an animated icon; surrounding controls remain keyboard/touch operable. Generic reduced-motion CSS is present and shell behavior has coverage, but there is no success-check animation or specific reduced-motion fallback. **State/persistence:** Some notices are driven by redirect query parameters; profile feedback is transient action state. Any underlying server write is separate from persistence of the notice; no check state exists. **Gap:** No approved success surface draws/checks in a mark, and no completion, keyboard/touch-equivalent or reduced-motion test exists for that pattern.

## Homepage and mobile-navigation checks

Within public routes, verify that only `/` omits the mobile bottom navigation; News, Discover and Account retain the accessible four-tab set. On authenticated `/dashboard`, verify Home, Discover, Saved and Profile each reach an actual section and announce the active destination.

**Carousel acceptance:** Use source-attributed local Epe photos. Keep the pause/resume control hidden at rest and reveal it on keyboard focus. Hover and focus stop rotation; focus must latch the pause after focus leaves until the visitor explicitly activates Resume—blur alone must not restart rotation. Also stop rotation for hidden tabs, reduced-motion preference and data-saver/2G connections.

**Candidate-specific implementation and test evidence:** Current `main@d8de649de710fd6accec5bffe3f1f65fdae3b67f` in `frontend/apps/main/components/hero-carousel.tsx` clears its transient `focused` state on blur, so rotation resumes when focus leaves unless the separate manual pause is active. The persistent focus latch is implemented in the PR #112 candidate at full SHA `bd4d2ec46bb485c0c1dadc68b95d0d4cb5197ce4`, not in that `main` baseline. Candidate test `frontend/tests/browser-smoke/home-refresh.spec.ts:90–121` focuses Pause, verifies the slide stays fixed, blurs and verifies it remains paused, then explicitly activates Resume and verifies rotation. That test passed in [Browser smoke run 43809158405](https://github.com/epelawa/EPE-LAWA/actions/runs/43809158405), whose recorded head SHA is the exact candidate SHA above. On current `main`, `frontend/tests/browser-smoke/home-refresh.spec.ts:195–221` covers automatic rotation, the control hidden at rest and revealed on keyboard focus, and manual pause; it does not prove a focus-latched pause after blur. Treat the latch as a hard requirement with #112-candidate evidence only, not as verified current-main behavior. The current-main source also suppresses autoplay for hidden tabs, reduced motion and constrained connections; do not treat that source wiring as browser-behavior test coverage. The newsletter stays visibly unavailable and non-submitting until an approved provider and its privacy/consent safeguards are configured.

## Security negatives

Verify cross-member data isolation; member token rejected by staff routes; staff identity not used as member; private draft/submission denial; stale revision conflict without overwrite; each privileged transition audited; unauthorized moderation/business actions refused; secrets absent from browser bundles. Provider tests use test credentials and isolated recipients only.

## Fixtures and production safety

Use synthetic test records only in isolated environments and clean them up. Do not seed demo data. Never write test articles, orders or payments to production. Any explicitly requested public test article requires prior approval of its exact payload; otherwise keep it private.

## Current known limitations

No current Playwright or full release-gate result is asserted here. Email and Paystack provider operation is unconfirmed. Maps API/Places/geocoding is not configured; current behavior uses safe outbound URLs. Report blockers rather than converting them into passed gates.
