# SiteMotion Strict Mode Repair — 2026-11-14

## Done

- Public and Admin scroll-reveal effects now re-observe elements still marked `pending` when React cleans up and reruns effects. The previous effect skipped every element with any reveal state, so React Strict Mode’s first cleanup could disconnect the observer and leave the second setup with invisible content.
- Added a regression contract for both apps in `frontend/tests/design-polish.test.mjs`.
- Captured a normal-motion 390px screenshot from a local synthetic empty-news fixture after all reveal targets became visible and the real preloader exited: `artifacts/site-motion/news-390.png`. Only the Next development toolbar was removed from the screenshot; no application UI was hidden.

## Validation

- Focused design-polish tests: 4/4 passed.
- Public and Admin production builds: passed with local placeholder backend settings.
- Public and Admin TypeScript checks: passed.
- Full serial frontend suite: 193/193 passed.
- Browser check: all five News reveal targets changed to `visible`; no page exceptions; the synthetic empty state remained present.
- No database or Production settings were changed.

## Remaining

- Push the focused branch, inspect its exact PR head/checks, attempt the ordinary merge path, then verify the remote main and close out the PR queue.
- Production schema work remains gated by the owner-approved backup/restore and exact migration-review steps recorded separately.

## Blocked

- No code-level blocker for this change. Hosted PR checks and merge status are pending.

## Resume Point

Branch: `fix/site-motion-strict-mode-20261114` from `ff887883959481991946863bc453d70079e323a2`. After the local tests and screenshots, add the three source/test changes, this handoff, and the screenshot to a focused PR; do not include News-page styling or database changes.
