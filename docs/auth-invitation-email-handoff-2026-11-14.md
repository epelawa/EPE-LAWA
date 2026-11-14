# EPE LAWA staff invitation email — handoff, 2026-11-14

## Done

Added a responsive EPE LAWA-branded Supabase Auth invitation template at `backend/supabase/templates/invite.html` and enabled it in the local Supabase Auth config. It uses the secure `{{ .ConfirmationURL }}` link; the invitee sets their own password and continues to staff sign-in. The message does not contain generated credentials, a password, or an access token. The email copy avoids unverified expiry promises.

The local preview uses only a synthetic example-invalid URL and contains no sent email or real account data. Screenshots: `docs/screenshots/auth/invite-email-320x480.png` and `invite-email-600x720.png`.

The owner approved and the hosted Auth callback configuration was updated on 2026-11-14 at 17:29 CET: canonical `site_url` is `https://epelawa.vercel.app/`, the four canonical redirect URLs are appended, and the four pre-existing entries are preserved. The settings were read back and verified. SMTP and all database/user data remained unchanged by this URL update.

## Validation

`frontend/tests/auth-invitation-template.test.mjs`: **2 passed, 0 failed**. It verifies the branded/responsive email, secure Auth link, absence of credential placeholders, and active local template configuration. No Production email template was installed and no invitation was sent.

## Pending / blocked

Hosted Supabase projects do not consume this local `config.toml` template. Applying the subject and HTML body through hosted Supabase Auth email-template settings remains a separate approval. No test invitation or email has been sent. Vercel Production deployment and live schema changes remain blocked pending their separate approvals.

## Resume

After the hosted template is approved and the callback code is deployed through the normal release path, install the approved subject/body in the hosted Supabase Auth Invite User template. Then test delivery only with an explicitly approved synthetic Preview account and verify password setup returns to `/admin/login`.
