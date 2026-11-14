# Admin user management — handoff, 2026-11-14 17:42 CET

## Done

The protected Users page provides paginated Auth-account search, verified-email and Auth-ban status, staff activation/deactivation, capability grants, recent staff-access audit history, and invitation-only onboarding. It distinguishes regular members from staff profiles and offers no staff-status action for regular members. Server-side rules keep `info.epelawa@gmail.com` as the sole primary administrator and restrict `legateakanjimusab@gmail.com` to `article.create`.

A Users entry is available from the shared staff navigation. Sign out is visible in the desktop masthead and mobile workspace menu; its server action attempts Supabase logout and clears the host-only admin session cookies before redirecting to the matching login route. The sticky masthead is opaque so page text cannot show through while reviewing long account forms.

Onboarding uses Supabase Auth invitation delivery and an explicit same-origin callback to `/auth/callback?next=/auth/new-password?returnTo=staff`; invitees set their own password and return to staff sign-in. It never generates, returns, displays, logs, or stores a password or sign-in token. Gmail SMTP is configured and read-back verified. On 2026-11-14 at 17:29 CET, after owner approval, the hosted Auth `site_url` was set to `https://epelawa.vercel.app/`; four canonical redirects were appended and all four pre-existing legacy/preview entries were retained. The Auth settings were read back and verified. SMTP was not changed by this update. No test email, invitation, or account creation occurred.

## Validation and evidence

- Admin user-management tests: **10 passed, 0 failed** (`node --test --import tsx frontend/tests/admin-user-management.test.mjs`).
- Admin and public-origin main app TypeScript checks and production builds: **passed**.
- Full synthetic PGlite schema/RLS suite: **22 passed, 0 failed, 1 documented skip**; the skipped tests are exclusion constraints unavailable in PGlite.
- Playwright used only synthetic accounts and dummy localhost Supabase settings at **375×812** and **1440×900**. Both widths had no horizontal overflow and no site footer. The sign-out test returned to `/admin/login` and confirmed the synthetic session cookies were cleared.
- Screenshots: `artifacts/admin-users/admin-users-375.png`, `admin-users-1440.png`, `admin-users-mobile-menu-375.png`, `admin-users-invite-375.png`, and `admin-users-invite-1440.png`. Capture metadata: `artifacts/admin-users/capture-metrics.json`.
- Invitation callback regression: **10 passed, 0 failed** in the focused admin suite.

## Migration approval — future application only

At 17:36 CET on 2026-11-14, the owner approved these exact PR #63 migrations for later Production application, in timestamp order: `20261114140000_staff_must_change_password.sql` and `20261114142000_admin_user_management_rpcs.sql`. This is not approval to apply them now. They remain unapplied until the required backup/restore rehearsal and release gates are cleared. No Production database write, reset, or user-record change has occurred.

## Remaining / blocked

The callback-origin mismatch is resolved. Do not send a real invitation yet: no test invitation has been approved or sent, and the hosted custom email template remains separate from the local template PR. Vercel Production deployment authorization remains pending; no new merge or deployment was made in this continuation. The only Production changes are the previously authorized Gmail SMTP configuration and the owner-approved Auth URL configuration above.

## Resume

After the backup/restore rehearsal and release gates are cleared, apply the owner-approved migrations through the normal forward-only path and verify their exact migration records. Merge only through the ordinary protected path with healthy exact-head checks. Test invitation delivery only with an explicitly approved synthetic Preview account after the callback route and hosted email-template choice are ready.
