# Homepage hero refinement screenshots — 2026-11-14

Screenshots were captured from the local app at `http://127.0.0.1:3122/` using only dummy Supabase values. The cookie banner remains at its existing viewport-bottom position.

| Viewport | Capture |
| --- | --- |
| 320 × 800 | ![320px mobile hero](hero-320x800.png) |
| 375 × 812 | ![375px mobile hero](hero-375x812.png) |
| 768 × 1024 | ![768px tablet hero](hero-768x1024.png) |
| 1024 × 900 | ![1024px desktop hero](hero-1024x900.png) |
| 1440 × 1000 | ![1440px desktop hero](hero-1440x1000.png) |

Validated on this branch: `node_modules/.bin/tsx --conditions=react-server --test --test-name-pattern='homepage hero|public Appearance' frontend/tests/design-polish.test.mjs frontend/tests/foundation.test.mjs frontend/tests/ui-rebuild.test.mjs` (3 passed); `frontend/apps/main/node_modules/.bin/tsc --noEmit -p frontend/apps/main/tsconfig.json` (passed); `(cd frontend/apps/main && ./node_modules/.bin/next build --webpack)` (passed).
