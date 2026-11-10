# PR #24 — Auth reference captures

These captures show the member sign-in, sign-up and password-recovery screens from the local production build. They are not screenshots of the hosted preview or production.

The capture harness exercised each route at 320×568, 375×812 and 1440×900. All nine checks passed: the auth shell and heading were present, the form card stayed within the viewport, there was no horizontal or vertical page overflow, and the homepage-only storage notice was absent from all auth routes. The Google option is visibly disabled and labelled “Coming Soon” because the provider is not configured.

The local server used synthetic Supabase values pointing only to loopback and no production account or content. The capture did not submit any forms or send email.

| Route | 320×568 | 375×812 | 1440×900 |
| --- | --- | --- | --- |
| Sign in (`/login`) | `local-320x568-login.png` | `local-375x812-login.png` | `local-1440x900-login.png` |
| Sign up (`/auth`) | `local-320x568-signup.png` | `local-375x812-signup.png` | `local-1440x900-signup.png` |
| Recovery (`/forgot-password`) | `local-320x568-forgot-password.png` | `local-375x812-forgot-password.png` | `local-1440x900-forgot-password.png` |
