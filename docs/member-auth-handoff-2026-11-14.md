# Member signup, verification and secure staff onboarding — 2026-11-14

## Done

- Member signup remains a guided four-step flow; email verification uses the branded OTP route and Supabase Auth session. A verified signup finishes profile bootstrap before redirecting to `/dashboard`.
- Passwords are preserved exactly as entered, never logged or returned, and limited to 10–128 characters. Password-reset and OTP operations use generic, account-enumeration-safe responses.
- Added a forward-only, persistent auth rate-limit migration. The server sends only HMAC-SHA256 identifiers; email and trusted Vercel `x-real-ip` buckets are separate, the SQL update is atomic, stale-row cleanup is bounded, and the RPC is executable only by `service_role` when that Supabase role exists.
- The compact auth shell keeps the member pages fixed and uncluttered. The OTP header copy was shortened so the complete instructions remain visible at 320×480. Google remains visibly disabled with “Coming Soon”.
- Staff invites in the admin worktree pass an explicit same-origin callback to `/auth/new-password?returnTo=staff`; invitees set their own password and are directed to `/admin/login`. No temporary password or token is generated, shown, logged or stored.
- The route manifest includes `/dashboard`. No Production database reset, migration, invite, account creation or user-record change occurred in this work. Gmail SMTP was the only earlier authorized Production Auth change before the URL configuration update below.

## Verification

- Member app production build (Node 22.23.4, pnpm 10.34.9): passed, including TypeScript.
- Admin app production build (same pinned toolchain): passed, including TypeScript.
- Full member/backend test run: **194 passed, 0 failed, 1 skipped** (195 total). The single skip is the documented exclusion-constraint limitation in PGlite.
- Admin user-management focused suite after adding the invitation callback: **10 passed, 0 failed**.
- Screenshots use only local synthetic UI and empty forms: `docs/screenshots/auth/create-account-320x480.png`, `create-account-320x568.png`, `create-account-375x812.png`, `create-account-768x1024.png`, `create-account-1440x900.png`, `verify-otp-320x480.png`, and `verify-otp-375x812.png`.

## Auth URL configuration — updated 2026-11-14 17:29 CET

The owner approved setting the canonical `site_url` and appending the canonical redirects while retaining existing entries. The hosted Supabase Auth configuration was updated and read back successfully:

- `site_url`: `https://epelawa.vercel.app/`
- Existing legacy/preview redirects retained: `https://epe-lawa-epe-lawa.vercel.app/`, `https://epe-lawa-epe-lawa.vercel.app/**`, `https://epe-*-lawa-epe-lawa.vercel.app`, and `https://epe-*-lawa-epe-lawa.vercel.app/**`.
- Appended canonical redirects: `https://epelawa.vercel.app/`, `https://epelawa.vercel.app/auth/callback?next=%2Fauth%2Fcomplete`, `https://epelawa.vercel.app/auth/callback?next=%2Fauth%2Fnew-password`, and `https://epelawa.vercel.app/auth/callback?next=%2Fauth%2Fnew-password%3FreturnTo%3Dstaff`.

Only `site_url` and `uri_allow_list` were sent in the update. SMTP was not changed. No email, invitation, migration, account creation, or database write occurred.

## Pending / blocked

- The auth rate-limit and admin user-management SQL migrations remain local additive changes; none has been applied to Production. Obtain approval for the exact migration payloads before any live schema change. Do not reset or wipe Production.
- No invitation or test email has been sent. End-to-end invitation verification should use a synthetic Preview account only after the relevant code is deployed and the hosted email-template choice is approved.
- Vercel Production deployment authorization remains outstanding. Keep the changes in focused PRs and do not deploy or provision accounts until the gate is cleared.

## Resume point

The Auth URL change is complete. Once Vercel authorization is cleared and the callback code is deployed, run a synthetic Preview verification flow through password setup and confirm it returns to `/admin/login`. Separately present and obtain approval for the exact additive migration SQL before any Production schema update.
