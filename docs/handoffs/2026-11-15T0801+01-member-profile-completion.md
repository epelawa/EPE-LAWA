# Verified member username completion

**Updated:** 2026-11-15 08:19 WAT  
**Branch:** `fix/verified-member-profile-completion-20261115`  
**Verified base:** `c69e0f7db24365276a06e6db23b7c35bc300b078`

## Done

The existing `/auth/complete` route now offers a small username-only form when the signed-in user is verified, has no profile, has a valid existing display name, and the saved handle is invalid/reserved or confirmed taken. Infrastructure errors do not expose this recovery form.

The server action fetches the user again, requires verified email, rechecks the current profile and deletion marker, validates the normalized handle, and checks availability through the existing database RPC. It passes only `{ data: { handle } }` to authenticated Supabase Auth, then invokes the established `bootstrap_verified_member_profile` RPC. It does not directly insert profile rows or take display-name, email, password, role or verification fields as mutation inputs. Existing or deleted profiles cannot use this path to bypass their guards. If bootstrap fails after the handle is saved, the message truthfully distinguishes the saved handle from incomplete profile setup.

The form preserves entered values after errors. The existing valid-but-taken handle has an explicit alternative-handle instruction. Mobile visual review caught an overlong hero description at 320px; it was shortened and recaptured, with a real description/card-overlap assertion added to the browser fixture.

## Final verification

Node 22.23.5 and pnpm 10.34.9:

- Forced serial build: 2/2 tasks successful.
- Forced serial typecheck: 5/5 tasks successful.
- Complete serial suite: 268 tests; 267 passed, zero failed, one skipped.
- `git diff --check`: passed.
- Actual Next route rendered with loopback-only HTTPS Auth/REST/RPC fixtures at 320, 390, 430, 768 and 1440px. The smallest capture is 320 × 568. All five passed horizontal/vertical viewport-fit, hidden-public-footer, absent-theme-control and description/card non-overlap assertions.
- Ten real browser form/route scenarios passed: reserved handle, taken handle, unavailable availability service, newly unverified session, deleted-profile race, existing-profile race, profile-service failure, unverified-route form suppression, bootstrap-provider-error form suppression, and successful handle-only update followed by verified profile creation. Rejection paths made no Auth metadata updates; the successful path made one handle-only data update and preserved the other synthetic metadata.

Screenshots and machine-readable results: `docs/screenshots/member-profile-completion/2026-11-15/`. Gate log: `/tmp/member-profile-completion-final-verified-gates.log`. Loopback harness: `/tmp/epe-member-profile-completion-capture.cjs` (mock HTTPS 54322, Next 3053, HTTPS proxy 8466; browser external requests blocked).

Two fixture mismatches were corrected without weakening the application guards: the existing footer is CSS-hidden rather than removed from the DOM, and Supabase's SDK adds null `code_challenge`/`code_challenge_method` transport fields. The final fixture asserts those are null and that the entire metadata `data` object contains only `handle`.

## Pending / resume point

Open the separate focused PR and attempt only its ordinary exact-head merge. Verify exact Production READY and a fresh canonical main build before applying the owner's already-approved available username through the ordinary member UI. Then verify dashboard access and that every other existing Auth metadata field remains unchanged. No migration, new Auth account, password reset, destructive database action or production write was performed for these local verification gates.
