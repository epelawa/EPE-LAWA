# Member authentication screenshots — 2026-11-13

These are local production-build screenshots of the EPE-LAWA public app, captured with a synthetic, loopback-only Supabase endpoint. No production account, database, email provider, real member data or sign-in credentials were used. The OTP screen shows an empty form only; the browser run did not submit a code or send a message.

The Chromium matrix covered `/login`, `/auth` and `/auth/verify` at 320, 375, 768, 1024 and 1440 CSS pixels (15 route/viewport checks). Every run reported `documentWidth` equal to the viewport and `verticalFit: true` at the 800px capture height. There was no horizontal overflow or browser console error. Behavior-level OTP and resend handling is separately covered by mocked-client tests; the screenshots do not prove hosted email delivery or a live Supabase session.

| Route | 320px | 375px | 768px | 1024px | 1440px |
| --- | --- | --- | --- | --- | --- |
| Sign in | [320](auth-login-320px.png) | [375](auth-login-375px.png) | [768](auth-login-768px.png) | [1024](auth-login-1024px.png) | [1440](auth-login-1440px.png) |
| Staged signup | [320](auth-signup-320px.png) | [375](auth-signup-375px.png) | [768](auth-signup-768px.png) | [1024](auth-signup-1024px.png) | [1440](auth-signup-1440px.png) |
| Email verification | [320](auth-verify-320px.png) | [375](auth-verify-375px.png) | [768](auth-verify-768px.png) | [1024](auth-verify-1024px.png) | [1440](auth-verify-1440px.png) |

All captures are local-only UI evidence, not hosted-preview or Production evidence.
