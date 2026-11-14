# Mobile sign-in viewport follow-up — 2026-11-14

## Done

- Created `/workspace/EPE-LAWA-batch-auth` on branch `fix/mobile-signin-viewport-followup` from verified `origin/main` SHA `5ce245beeb23c8ea972c7ea9700ad747321fa2e5`.
- Applied a narrow fix to member and admin sign-in only: fixed viewport sizing with `100vh`/`100dvh`, hidden page overflow/overscroll, form drag prevention, and removal of admin error auto-scroll. The disabled Google row remains visible. No auth/session/security logic was changed.
- Added source regression assertions for the fixed viewport, drag prevention, admin no-auto-scroll, and disabled Google row.
- Focused tests passed **8/8** under Node 22.23.4. Main app TypeScript check passed and the Next.js production build passed using pnpm 10.34.9, local dummy Supabase values, and no production services.
- Captured member and staff login at 320×568, 375×812, 768×1024, 1024×900, and 1440×1000 in `docs/screenshots/mobile-signin-viewport-followup/2026-11-14/`. The 320×568 checks returned HTTP 200; both document dimensions exactly matched the viewport; no horizontal overflow occurred; `scrollY` stayed 0 after simulated drag and wheel input; and Google remained disabled/aria-disabled.
- Screenshots are clean local browser captures; no credentials were entered and non-loopback requests were blocked.

## Remaining

- Run `git diff --check`, commit the screenshot/metrics README and this updated handoff, push with the authorized GitHub connector, and open a separate focused PR.
- Refresh the PR’s exact head and report hosted check accessibility without treating an inaccessible check endpoint as success. Leave the PR unmerged for review.

## Blocked

- None for local code validation or screenshot evidence. Hosted checks will be unverified until a PR exists; prior connector attempts on this repository returned 403 for hosted check rollups.

## Resume

In `/workspace/EPE-LAWA-batch-auth`, verify the branch still descends from exact main `5ce245beeb23c8ea972c7ea9700ad747321fa2e5`, check that only auth code/tests/screenshots/docs are staged, push the focused branch through the authorized connector, and create one PR. Keep the PR open and do not change production configuration.
