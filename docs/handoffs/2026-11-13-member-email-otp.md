# Member email verification and recovery — release handoff

**Checkpoint:** 2026-11-13 23:50 WAT

**Merged release:** PR [#48](https://github.com/epelawa/EPE-LAWA/pull/48), merged normally into `main` as `203d7cae923a50dff7633a7ced8e77324bfcc06b` at 2026-11-13 22:18:45 UTC.

**Production:** Vercel deployment `dpl_52yiTmDzdZwjPiXW357TeSwhNfAN` is `READY` for that exact production-target SHA. A read-only fetch of [the canonical `/auth/verify` route](https://epelawa.vercel.app/auth/verify) returned the branded code-entry screen. No email was sent and no code was submitted; route deployment is not proof of email delivery. The original PR branch `feat/member-email-otp` was based on News main `16ad8e7`. The preserved full-web worktree has since been rebased onto `203d7ca`, with all 39 pre-rebase items byte-verified and its safety stash retained.

## Shipped in PR #48

- Added a branded, noindex `/auth/verify` route for signup OTP entry and resend. The form accepts the production-configured eight-digit token while remaining compatible with six-to-eight-digit local/test codes, uses `one-time-code` autocomplete, and provides announced error/status feedback.
- Extracted dependency-injected signup verification and resend actions. Email and token validation occurs server-side; signup verification uses Supabase Auth `type: "signup"`; success has a fixed `/auth/complete` destination; malformed, failed and expired requests never redirect. Resend errors and transport exceptions return a generic failure rather than falsely claiming delivery, while success responses avoid exposing account state.
- Updated the repository's branded confirmation email template to include both `{{ .Token }}` and `{{ .ConfirmationURL }}` in the approved cobalt palette. The user can enter the code or follow the secure link. The recovery template also uses the cobalt palette and retains the secure Supabase recovery URL.
- Updated signup/resend guidance to describe the code-and-link options and made email-delivery wording provider-neutral. The route inventory, sitemap and route manifest include `/auth/verify`.
- Preserved the owner-directed staged signup and compact one-screen sign-in. Google sign-in remains disabled until configured; the primary-admin address is not exposed in public UI/metadata.

## Verification evidence

- Focused OTP behavior and member-auth regressions: **10 passed, 0 failed**. Mocked-client tests cover malformed input, successful and failed verification, fixed redirects, resend errors and account-enumeration-safe responses.
- Workspace TypeScript check: **5/5 tasks passed**.
- Production build: passed. Full suite: **183 total, 182 passed, 0 failed, 1 documented PGlite/PostgreSQL-constraint skip**.
- Production-mode local Chromium: **15/15** visual route/viewport checks passed for `/login`, `/auth` and `/auth/verify` at 320/375/768/1024/1440px. All five widths fit the 800px capture height; no horizontal overflow or browser console errors. The captures and limitations are listed in [`docs/screenshots/member-auth/2026-11-13/README.md`](../screenshots/member-auth/2026-11-13/README.md).
- The exact PR #48 head `8350e40b3b7c8c533d53258e58a9a9cb715f30f9` was rechecked locally before normal merge; typecheck, production build and full tests passed on that exact tree. No production Auth setting, account, role, schema or user data was changed.

## Pending and blocked

- **Email-delivery verification remains blocked:** no authenticated-sender test was run. A read-only Supabase Auth config inspection on 2026-11-13 found `mailer_otp_length=8`, `mailer_otp_exp=3600` seconds, `rate_limit_email_sent=2`, `rate_limit_otp=30`, `rate_limit_verify=30`, `mailer_autoconfirm=false`, `security_sb_forwarded_for_enabled=false`, and no custom SMTP host. Supabase documents a low-volume limit for its built-in email provider; sender-domain authentication and SPF/DKIM/DMARC are not evidenced. See [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits) and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
- **Security follow-up:** the current server-side Supabase client uses the public project key and does not forward a trusted per-user IP. With forwarded-for disabled, IP-based limits may aggregate at hosting egress. The observed limits do not prove adequate production abuse controls for 1,000–5,000 daily users. Review safe, low-cost login/form throttling and abuse tracing before launch.
- **Configuration hold:** repository templates are not evidence that hosted Supabase templates were changed. Do not claim delivery, edit production Auth settings or send a real email until an isolated test project and owner-approved recipient test are available.
- **Broader release hold:** production Supabase schema/migration reconciliation remains unresolved, and the all-eight-module acceptance pass is incomplete. PR #47 is an open docs-only sync on base `203d7ca`; after its normal push, GitHub reports merge state `UNKNOWN`, and the authenticated CLI's `gh pr checks` query fails with `Resource not accessible by integration`. Do not merge unless the exact hosted gate becomes visible and healthy. No production account, role, content, order or migration writes were made.

## Resume here

1. Finish and push the PR #47 documentation update; refresh its exact-head status through the authenticated CLI and use only the normal merge path if checks are visible and healthy. If the status query remains blocked, keep the PR open and continue unrelated local work without bypassing protection.
2. Do not send a real email or edit production Auth settings. When a genuinely isolated Supabase project and owner-approved recipient test are available, verify the deployed template, authenticated sender, OTP and callback link end to end.
3. Continue the eight-module gap sequence in [`docs/17-owner-requirements-checklist.md`](../17-owner-requirements-checklist.md). The Tourism photo-reference candidate needs its README/handoff and a separate PR; provider- or content-dependent Maps, Radio, payment and profile features must remain honestly unavailable until verified.
