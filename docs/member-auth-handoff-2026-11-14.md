# Member signup, verification and secure staff onboarding — 2026-11-14

## Done

- Member signup remains a guided four-step flow; email verification uses the branded OTP route and Supabase Auth session. A verified signup finishes profile bootstrap before redirecting to `/dashboard`.
- Passwords are preserved exactly as entered, never logged or returned, and limited to 10–128 characters. Password-reset and OTP operations use generic, account-enumeration-safe responses.
- Added a forward-only, persistent auth rate-limit migration. The server sends only HMAC-SHA256 identifiers; email and trusted Vercel `x-real-ip` buckets are separate, the SQL update is atomic, stale-row cleanup is bounded, and the RPC is executable only by `service_role` when that Supabase role exists.
- The compact auth shell keeps the member pages fixed and uncluttered. The OTP header copy was shortened so the complete instructions remain visible at 320×480. Google remains visibly disabled with “Coming Soon”.
- Staff invites in the admin worktree now pass an explicit same-origin callback to `/auth/new-password?returnTo=staff`; the invitee sets their own password and is directed to `/admin/login`. No temporary password or token is generated, shown, logged or stored.
- The route manifest now includes `/dashboard`. No production database reset, migration, invite, account creation or user-record change occurred in this work. Gmail SMTP was the only previously authorized Production Auth change; this work did not change SMTP or other hosted settings.

## Verification

- Member app production build (Node 22.23.4, pnpm 10.34.9): passed, including TypeScript.
- Admin app production build (same pinned toolchain): passed, including TypeScript.
- Full member/backend test run: **194 passed, 0 failed, 1 skipped** (195 total). The single skip is the documented exclusion-constraint limitation in PGlite.
- Admin user-management focused suite after adding the invitation callback: **10 passed, 0 failed**.
- Screenshots use only local synthetic UI and empty forms: `docs/screenshots/auth/create-account-320x480.png`, `create-account-320x568.png`, `create-account-375x812.png`, `create-account-768x1024.png`, `create-account-1440x900.png`, `verify-otp-320x480.png`, and `verify-otp-375x812.png`.

## Auth configuration approval gate

A read-only Supabase Management API check on 2026-11-14 found:

- Current `site_url`: `https://epe-lawa-epe-lawa.vercel.app/`.
- Current redirect allow-list: `https://epe-lawa-epe-lawa.vercel.app/`, `https://epe-lawa-epe-lawa.vercel.app/**`, `https://epe-*-lawa-epe-lawa.vercel.app`, and `https://epe-*-lawa-epe-lawa.vercel.app/**`.
- The app’s canonical origin is `https://epelawa.vercel.app`; the current allow-list does not contain it. Consequently, member confirmation/recovery and staff invitation callbacks remain blocked pending owner approval.

Proposed canonical entries, generated from the current app redirect builders:

- Site URL: `https://epelawa.vercel.app/`
- Redirect URLs: `https://epelawa.vercel.app/`, `https://epelawa.vercel.app/auth/callback?next=%2Fauth%2Fcomplete`, `https://epelawa.vercel.app/auth/callback?next=%2Fauth%2Fnew-password`, and `https://epelawa.vercel.app/auth/callback?next=%2Fauth%2Fnew-password%3FreturnTo%3Dstaff`.

The existing old-origin and preview patterns were not changed. The owner must choose whether to retain them (recommended to avoid unexpectedly breaking previews) or replace them with only the canonical entries. Supabase’s [official redirect URL guidance](https://supabase.com/docs/guides/auth/redirect-urls) recommends the exact production redirect URL rather than a broad production wildcard.

## Pending / blocked

- The auth-rate-limit migration and the admin user-management migrations are local additive SQL only; none has been applied to Production. Obtain owner approval for the exact migration payloads before any live schema change. Do not reset or wipe Production.
- Resolve the Supabase `site_url` and redirect allow-list only after the owner approves the exact payload and whether the old preview patterns stay.
- Verify invitation delivery and callback handling with a synthetic Preview account only after the owner-approved Auth configuration is in place. No real invitation email has been sent.
- Vercel Production deployment authorization remains outstanding. Keep the changes in focused PRs and do not deploy or provision accounts until their gates are cleared.

## Resume point

After explicit approval of the Supabase Auth URL settings, update only the approved `site_url`/allow-list entries; then run a synthetic Preview invitation and verify password setup returns to `/admin/login`. Separately present the additive migration SQL for review and wait for explicit approval before applying any live migration.
