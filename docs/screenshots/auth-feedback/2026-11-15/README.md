# Member Auth synthetic mobile evidence

Production-mode local main app, pinned Node22.23.5, HTTPS loopback proxy and synthetic Supabase Auth endpoint. All non-loopback browser traffic blocked. No Production data/account or real credential was used. `/login` is member sign-in; `/auth` is signup.

Default login captures:320/390/430/768/1440 CSSpx,900px high. `measurements.json` shows width/height containment. Extra `login-320x568-synthetic.png` and `compact-measurements.json` verify the smaller one-screen viewport. `login-error-320x568-synthetic.png` and `error-compact-measurements.json` come from a real local server-action POST receiving the synthetic Supabase invalid_credentials code; the new actionable message is visible and document dimensions remain320x568. Default and error screenshots were visually inspected; disabled Google remains visible. This is a negative-path and layout test, not a successful live account test.
