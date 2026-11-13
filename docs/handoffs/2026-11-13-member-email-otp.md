# Member email verification and recovery — release handoff

**Checkpoint:** 2026-11-13 22:58 WAT
**Branch:** `feat/member-email-otp`, based on merged `main` `16ad8e70448b4b48e35759a4cf0c2317f1d6b3f5` (News PR #46).
**State:** Exact-tree local gates passed; PR not yet opened, merged or deployed. The preserved full-web worktree at `/workspace/EPE-LAWA` remains untouched by this focused branch.

## Done in this candidate

- Added a branded, noindex `/auth/verify` route for signup OTP entry and resend. The form accepts the production-configured eight-digit token while remaining compatible with six-to-eight-digit local/test codes, uses `one-time-code` autocomplete, and provides announced error/status feedback.
- Extracted dependency-injected signup verification and resend actions. Email and token validation occurs server-side; signup verification uses Supabase Auth `type: "signup"`; success has a fixed `/auth/complete` destination; malformed, failed and expired requests never redirect. Resend errors and transport exceptions return a generic failure rather than falsely claiming delivery, while success responses avoid exposing account state.
- Updated the branded confirmation email template to include both `{{ .Token }}` and `{{ .ConfirmationURL }}` in the approved cobalt palette. The user can enter the code or follow the secure link. The recovery template also uses the cobalt palette and retains the secure Supabase recovery URL.
- Updated signup/resend guidance to describe the code-and-link options and made email-delivery wording provider-neutral. The route inventory, sitemap and route manifest include `/auth/verify`.
- Preserved the owner-directed staged signup and compact one-screen sign-in, with Google sign-in disabled until configured and no primary-admin address in public UI/metadata.

## Verification evidence

- Focused OTP behavior and member-auth regressions: **10 passed, 0 failed**. Mocked-client tests cover malformed input, successful and failed verification, fixed redirects, resend errors and account-enumeration-safe responses.
- Workspace TypeScript check: **5/5 tasks passed**.
- Production build: passed. Full suite: **183 total, 182 passed, 0 failed, 1 documented PGlite/PostgreSQL-constraint skip**.
- Production-mode local Chromium: **15/15** visual route/viewport checks passed for `/login`, `/auth` and `/auth/verify` at 320/375/768/1024/1440px. All five widths fit the 800px capture height; no horizontal overflow or browser console errors. The 15 captures and limitations are listed in [`docs/screenshots/member-auth/2026-11-13/README.md`](../screenshots/member-auth/2026-11-13/README.md).
- `git diff --check` is clean. These are local checks with synthetic loopback settings, not hosted CI, a live account, or a production Auth workflow test.

## Pending and blocked

- **Pending:** Open a focused PR, refresh exact-head GitHub/Vercel state, and merge only through the normal path after a healthy gate. Re-run checks on the resulting `main` and verify the exact Production deployment.
- **Blocked:** No authenticated-sender email test has been run. A read-only Supabase Auth config inspection on 2026-11-13 found `mailer_otp_length=8`, `mailer_otp_exp=3600` seconds, `rate_limit_email_sent=2`, `rate_limit_otp=30`, `rate_limit_verify=30`, `mailer_autoconfirm=false`, `security_sb_forwarded_for_enabled=false`, and no custom SMTP host. Supabase documents a low-volume limit for its built-in email provider; sender-domain authentication and SPF/DKIM/DMARC are not evidenced. See [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits) and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
- **Security follow-up:** The current server-side Supabase client uses the public project key and does not forward a trusted per-user IP. With forwarded-for disabled, IP-based limits may aggregate at the hosting egress. The current remote limits are recorded, but do not prove adequate production abuse controls for the expected 1,000–5,000 daily users. Review safe, low-cost login/form throttling and abuse tracing before launch.
- **Provider/configuration hold:** The local template is not evidence that the hosted Supabase template has been updated. Do not claim email delivery, edit production Auth settings, or send a real email until a safely isolated recipient test and the required owner approval are in place. Production schema/Auth/provider settings and user data were not changed during this work.
- **Broader release hold:** Production Supabase schema/migration reconciliation remains unresolved. No production account, role, content, order or migration writes were made; the all-eight-module acceptance pass is incomplete. PR #47 is an open docs-only update to `docs/12`, `docs/14`, `docs/16` and `docs/17`; its GitHub check/status endpoints return 403, so leave it unmerged and synchronize the canonical roadmap/tracker/progress snapshots after its gate is resolved. The owner checklist at `docs/17-owner-requirements-checklist.md` records the remaining work.

## Resume here

1. Finish this focused OTP PR with the normal review gate; preserve the untouched `feat/full-web-implementation-release` worktree and split any other completed fix into its own PR.
2. After merge, run the exact-tree checks again and inspect the exact `main`/Production deployment. If GitHub check details remain inaccessible, do not claim hosted CI is healthy or bypass the merge gate.
3. Only after owner-approved, isolated email delivery is available, verify both the OTP code and callback link end to end; confirm the deployed email template and authenticated sender separately from this repository change.
4. Continue the eight-module gap sequence in the owner checklist. Priority unresolved items include News offline caching/staff revision history, History correction/takedown, Forum write throttling, owner product management, and Who-is-Who correction/removal; provider- or content-dependent Maps, Tourism, Radio, payment and profile work must remain honestly unavailable until verified.
