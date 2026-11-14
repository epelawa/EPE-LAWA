# Mobile sign-in viewport follow-up — 2026-11-14

## Done
- Created `/workspace/EPE-LAWA-batch-auth` on `fix/mobile-signin-viewport-followup` from `origin/main` at exact SHA `5ce245beeb23c8ea972c7ea9700ad747321fa2e5`.
- Inspected `/workspace/EPE-LAWA-auth-mobile` read-only, file by file. Its uncommitted changes contained the follow-up viewport fix, removal of admin error auto-scroll, and disabled Google row retention. Copied only those reviewed auth implementation and test files; did not modify the prior worktree.
- Applied the narrowly scoped fix to member and admin login shells only: fixed viewport sizing (100vh with 100dvh support), hidden page overflow/overscroll, and drag prevention; retained visible disabled Google sign-in. No session/auth/security logic was changed.
- Added source-level regression assertions for fixed non-scrolling viewport, drag prevention, admin no-auto-scroll, and visible disabled Google row at mobile width.
- `node --test frontend/tests/auth-shell.test.mjs frontend/tests/member-auth.test.mjs` passed: 8/8.

## Remaining
- Run TypeScript typecheck and production build using the repository's expected Node 22.23.x / pnpm 10.x environment.
- Launch the app on dedicated localhost port 3123 with only dummy Supabase configuration. Verify member/admin routes at 320/375/768/1024/1440 and capture actual rendered screenshots; measure 320px scrollHeight/clientHeight and inspect disabled Google row visibility.
- Commit, push with the authorized GitHub connector askpass procedure, create a focused PR, refresh its exact head, and report hosted check status without treating 403 as success. No PR was created and nothing was merged.

## Blocked
- The sandbox has Node v24.22.1 and pnpm v11.25.0; no dependency binaries exist in the fresh authorized clone/worktree. The old worktrees are explicitly off-limits for executing dependencies. Thus typecheck/build and runtime screenshot verification could not be performed here.
- Browser tools are unavailable in this execution context. No screenshots are claimed or attached.
- GitHub connector authentication is available, but pushing/PR operations were deferred until the requested visual/runtime verification and build checks are complete. Hosted checks are therefore not applicable/not verified (and may be inaccessible with 403).

## Resume
Use `/workspace/EPE-LAWA-batch-auth` only. Provision the required runtime/dependencies in this isolated worktree without changing global config or using production records. Start the app on port 3123 with dummy values, verify/capture both auth routes at all requested sizes, then typecheck/build, commit and push through the specified runtime askpass script, and open a separate PR only after all required handoff evidence is in place. Leave the PR open for owner review.
