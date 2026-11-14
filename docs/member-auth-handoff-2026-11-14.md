# Member signup, verification and secure staff onboarding — 2026-11-14

## Done

- Member signup remains a guided four-step flow; email verification uses the branded OTP route and Supabase Auth session. A verified signup finishes profile bootstrap before redirecting to `/dashboard`.
- Passwords are preserved exactly as entered, never logged or returned, and limited to 10–128 characters. Password-reset and OTP operations use generic, account-enumeration-safe responses.
- The persistent auth limiter sends only HMAC-SHA256 identifiers. Email and trusted Vercel `x-real-ip` buckets are separate, SQL updates are atomic, cleanup is bounded, and the RPC is restricted to `service_role`.
- The compact auth shell keeps member pages fixed and uncluttered. The OTP header fits at 320×480 and Google remains visibly disabled with “Coming Soon”. The resend/link-issue copy no longer exposes provider or project configuration details; signup and recovery notices are shorter and remain account-enumeration-safe.
- Staff invites use a same-origin callback to `/auth/new-password?returnTo=staff`; invitees set their own password and are directed to `/admin/login`. No temporary password or token is generated, shown, logged or stored.
- The route manifest includes `/dashboard`. No Production database reset, migration, invite, account creation or user-record change occurred. Gmail SMTP was configured earlier under separate owner authorization; the canonical Auth URL update is documented below.

## Verification

- Member app build (Node 22.23.4, pnpm 10.34.9) and admin app build: **passed**, including TypeScript.
- Full member/backend test run before the latest copy-only refinement: **194 passed, 0 failed, 1 skipped** (195 total). The single skip is the documented exclusion-constraint limitation in PGlite.
- After the copy refinement, focused auth OTP and member-auth tests: **11 passed, 0 failed**.
- Screenshots use only local synthetic UI and empty forms: `docs/screenshots/auth/create-account-320x480.png`, `create-account-320x568.png`, `create-account-375x812.png`, `create-account-768x1024.png`, `create-account-1440x900.png`, `verify-otp-320x480.png`, and `verify-otp-375x812.png`.

## Auth URL configuration — updated 2026-11-14 17:29 CET

The owner approved setting the canonical `site_url` and appending the canonical redirects while retaining existing entries. The hosted Supabase Auth configuration was updated and read back successfully:

- `site_url`: `https://epelawa.vercel.app/`
- Existing legacy/preview redirects retained: `https://epe-lawa-epe-lawa.vercel.app/`, `https://epe-lawa-epe-lawa.vercel.app/**`, `https://epe-*-lawa-epe-lawa.vercel.app`, and `https://epe-*-lawa-epe-lawa.vercel.app/**`.
- Appended canonical redirects: `https://epelawa.vercel.app/`, `https://epelawa.vercel.app/auth/callback?next=%2Fauth%2Fcomplete`, `https://epelawa.vercel.app/auth/callback?next=%2Fauth%2Fnew-password`, and `https://epelawa.vercel.app/auth/callback?next=%2Fauth%2Fnew-password%3FreturnTo%3Dstaff`.

Only `site_url` and `uri_allow_list` were sent in that update. SMTP was not changed. No email, invitation, account creation, or database write occurred.

## Migration approvals — future application only

At 17:36 CET on 2026-11-14, the owner approved the exact auth rate-limiting migration in PR #64 and both admin migrations in PR #63, in timestamp order, for later Production application. The owner also approved the Radio reconciliation migration as written, including its draft-by-default visibility effect. These approvals do not authorize applying any SQL now. All migrations remain unapplied until the required backup/restore rehearsal and release gates are cleared. Production has not been reset, migrated, or provisioned with accounts.

## Pending / blocked

- No invitation or test email has been sent. End-to-end invitation verification should use a synthetic Preview account only after the relevant code is deployed and the hosted email-template choice is approved.
- Vercel Production deployment authorization remains outstanding. The requested PR merges remain subject to ordinary exact-head checks; no bypass will be used.

## Resume point

The Auth URL change and copy cleanup are complete. Once Vercel authorization and the backup/restore rehearsal are cleared, follow the ordinary protected release path, apply only the specifically approved migrations, and verify the staff callback with an approved synthetic Preview account. No Production migration or deployment is authorized before those gates.
