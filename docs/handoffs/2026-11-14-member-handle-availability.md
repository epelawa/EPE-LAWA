# Member handle availability and verified profile bootstrap

Implementation branch: `fix/member-signup-username-check-20261114`; base `main` at `2c11154a1dcc184eb895ceedb4e5545209bda7a4` (PR #80 merge commit).

## Behavior

Signup normalizes handles to lowercase, checks syntax and reserved names locally and on the server, queries the non-identifying `member_handle_availability` RPC at the Continue step, and repeats the check server-side before `auth.signUp`. The RPC contract only returns `available`, `taken`, or `unavailable`; failed calls and unexpected responses map to unavailable. The database's existing unique constraint remains authoritative during races.

Email-confirmed users pass through `/auth/complete`. It reads the existing profile, then calls only the authenticated `bootstrap_verified_member_profile()` RPC if absent. It does not issue direct profile inserts. A false/error RPC result, missing profile table, or unconfirmed email renders a non-success completion state. Profile creation is audited through existing `public.audit_event` only after an actual insert, with metadata `{source: "verified_auth_bootstrap"}` and no PII.

Recovery wording remains anti-enumerating. Progress: `Step 2 of 2 · Recovery request`; title: `Check your inbox`; body: `If an account exists for that address, password-reset instructions may be sent. Delivery depends on this project’s configured email provider.`

## Migration status — NOT APPLIED; Production preflight required

Source migration: `backend/supabase/migrations/20261114190000_member_handle_and_verified_bootstrap.sql`
SHA-256: `c2ccb5f9c1bef9dbc327e79edd13bad0391bab64aa0235109dea0780ee9f695f`

Reviewed reference: `feat/member-profile-schema-repair-20261114` at `27e60367385f85d6d0b51cbfb124cc76b09ca04e`, migration `20261114170000_verified_member_profile_bootstrap.sql`. The new migration preserves the reference's user-scoped verified bootstrap and adds the availability RPC plus insert-only audit. Timestamp differs to avoid duplicate migration IDs.

The owner has directed that required Production changes be additive and individually preflighted. This migration remains unapplied until a fresh ledger/object audit confirms `public.profiles` with its existing globally unique handle constraint, `public.handle_is_reserved(text)`, `public.audit_events`, and `public.audit_event(...)`, and the backup/restore release gate is satisfied. An earlier read-only snapshot reported seven applied versions and no `public.profiles`; recheck before acting because that snapshot may be stale. No reset, drop, truncate, migration-history rewrite, Production Auth/SMTP change, or Production data write was performed by this branch.

## Verification

After syncing the Auth worktree to `main` at PR #80 merge commit `2c11154a1dcc184eb895ceedb4e5545209bda7a4`, Node `22.23.5` / pnpm `10.34.9` gates passed: focused member-auth tests **15/15**; workspace typecheck **5/5 tasks**; production builds **2/2 tasks**; full suite **231 total, 230 passed, 0 failed, 1 documented PGlite constraint skip**. Runs used only localhost synthetic Supabase configuration. No database migration was applied.

## Visual evidence

- 320px fixed sign-in screen: `artifacts/auth-mobile/login-320.png`.
- 320px signup first step: `artifacts/auth-mobile/signup-320.png`.
- The 320px sign-in regression also asserts no scroll/drag and preserves the visibly disabled Google row. These are local synthetic captures, not a hosted or Production screenshot.
