# Member dashboard responsive screenshots — 2026-11-14

Captured from `/dashboard` on the local Next.js preview at `http://127.0.0.1:3104` using dummy Supabase values pointing only to `http://127.0.0.1:54322`. Chromium intercepted all browser requests and aborted every request outside the `127.0.0.1:3104` origin. No production services, credentials, or real member records were accessed.

The captures show the signed-out/fail-closed dashboard boundary (`Account service unavailable`) because this worktree had no safe synthetic authenticated-user fixture. Therefore the authenticated profile editor visual capture is blocked; do not infer a successful signed-in render from these images. The focused authorization/profile tests cover the guard and update scope.

| Viewport | Full-page image dimensions | File | Result |
|---:|---:|---|---|
| 320px | 320 × 1489px | `dashboard-signed-out-320px.png` | Fail-closed; no member greeting/profile |
| 375px | 375 × 1400px | `dashboard-signed-out-375px.png` | Fail-closed; no member greeting/profile |
| 768px | 768 × 1349px | `dashboard-signed-out-768px.png` | Fail-closed; no member greeting/profile |
| 1024px | 1024 × 1185px | `dashboard-signed-out-1024px.png` | Fail-closed; no member greeting/profile |
| 1440px | 1440 × 1192px | `dashboard-signed-out-1440px.png` | Fail-closed; no member greeting/profile |

All images are full-page Chromium screenshots at device scale factor 1; viewport height was 900px. They were captured after the short site preloader cleared and the main region had been brought into view. These are boundary evidence, not signed-in editor visual QA.
