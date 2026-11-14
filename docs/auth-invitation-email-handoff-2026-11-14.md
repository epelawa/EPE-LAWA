# EPE LAWA staff invitation email — handoff, 2026-11-14

## Done

Added a responsive EPE LAWA-branded Supabase Auth invitation template at `backend/supabase/templates/invite.html` and enabled it in the local Supabase Auth config. It uses the secure `{{ .ConfirmationURL }}` link; the invitee sets their own password and continues to staff sign-in. The message does not contain generated credentials, a password, or an access token. The email copy avoids unverified expiry promises.

The local preview uses only a synthetic example-invalid URL and contains no sent email or real account data. Screenshots: `docs/screenshots/auth/invite-email-320x480.png` and `invite-email-600x720.png`.

## Validation

`frontend/tests/auth-invitation-template.test.mjs`: verifies the branded/responsive email, secure Auth link, absence of credential placeholders, and active local template configuration. No Production Auth template or SMTP setting was changed; no invitation was sent.

## Pending / blocked

Hosted Supabase projects do not consume this local `config.toml` template. The owner must approve applying the subject and HTML body through Supabase Auth email-template settings after reviewing the callback-origin change. Current Auth `site_url` and allow-list remain out of alignment with `https://epelawa.vercel.app`; no test invitation should be sent until that is resolved. Vercel Production deployment and live schema changes remain blocked pending their separate approvals.

## Resume

After owner approval, install this subject/body in the hosted Supabase Auth Invite User template, keep the generated link pointing to the explicitly authorized callback, then test delivery only with a synthetic Preview account and verify the password setup returns to `/admin/login`.
