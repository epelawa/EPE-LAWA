# Admin user management — handoff, 2026-11-14 15:05 CET

## Done

The protected Users page provides paginated Auth-account search, verified-email and Auth-ban status, staff activation/deactivation, capability grants, recent staff-access audit history, and invitation-only onboarding. It distinguishes regular members from staff profiles and offers no staff-status action for regular members. Server-side rules keep `info.epelawa@gmail.com` as the sole primary administrator and restrict `legateakanjimusab@gmail.com` to `article.create`.

A Users entry is available from the shared staff navigation. Sign out is visible in the desktop masthead and mobile workspace menu; its server action attempts Supabase logout and clears the host-only admin session cookies before redirecting to the matching login route. The sticky masthead is now opaque so page text cannot show through while reviewing long account forms.

Onboarding uses Supabase Auth invitation email delivery. It never generates, returns, displays, logs, or stores a password or sign-in token. Supabase Auth Gmail SMTP is configured and verified by a follow-up read through the Management API; the app-password value is not in this repository. No test email, invitation, or account creation occurred. All unrelated Auth settings remained unchanged.

**Callback gate:** the current Auth `site_url` is `https://epe-lawa-epe-lawa.vercel.app/`, not the expected `https://epelawa.vercel.app/`. The site URL, redirect allow-list, templates, confirmation behavior, and rate limits were deliberately left untouched. Do not send an invitation until the callback-origin mismatch has been reviewed and explicitly resolved.

The first database migration adds only the `must_change_password` flag. The next installs hardened staff-management RPCs and a service-role-only password-flag clear function. These migrations have not been applied; no Production database writes or account provisioning occurred. No service-role credential was accessed.

## Validation and evidence

- Admin user-management tests: **10 passed, 0 failed** (`node --test --import tsx frontend/tests/admin-user-management.test.mjs`).
- Admin and public-origin main app TypeScript checks: **passed**.
- Admin and main-origin webpack production builds: **passed**.
- Full synthetic PGlite schema/RLS suite: **22 passed, 0 failed, 1 documented skip**; the skipped tests are exclusion constraints unavailable in PGlite.
- Playwright used only synthetic accounts and dummy localhost Supabase settings at **375×812** and **1440×900**. Both widths had no horizontal overflow and no site footer. The sign-out test returned to `/admin/login` and confirmed the synthetic session cookies were cleared.
- Screenshots: `artifacts/admin-users/admin-users-375.png`, `admin-users-1440.png`, `admin-users-mobile-menu-375.png`, `admin-users-invite-375.png`, and `admin-users-invite-1440.png`. Capture metadata: `artifacts/admin-users/capture-metrics.json`.
- `git diff --check`: rerun before commit/PR.

## Remaining

Align and verify the Auth callback origin before invitations are used; this requires owner approval because the existing redirect configuration was preserved. Send one test email only after that correction is approved. Review the user-management permissions and migrations before production deployment.

## Blocked

Production database migrations, account provisioning, and invitations remain unperformed. Vercel authorization/deployment is still pending. No Production user records were read or modified; the only Production change was the explicitly requested Auth SMTP configuration described above.

## Resume

Rerun the focused tests, both TypeScript checks and builds, synthetic PGlite suite, screenshot capture, and `git diff --check` after any change. Open a focused PR; do not merge/deploy or apply migrations until the backup/restore rehearsal and callback-origin gate are resolved.
