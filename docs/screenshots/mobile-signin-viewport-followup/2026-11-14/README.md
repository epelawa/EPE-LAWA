# Mobile sign-in viewport follow-up — screenshots

Local-only Chromium captures of the member `/login` and staff `/admin/login` routes, each at 320×568, 375×812, 768×1024, 1024×900, and 1440×1000 CSS pixels. No account credentials were entered. The browser context used dummy Supabase values and blocked requests to non-loopback hosts.

At 320×568, both routes returned HTTP 200, the document measured exactly 320×568, horizontal overflow was false, and `scrollY` remained 0 after a simulated drag and wheel gesture. The Google sign-in row remained visible with `disabled` and `aria-disabled="true"` on both routes. Full metrics are in `member/metrics.json` and `admin/metrics.json`.
