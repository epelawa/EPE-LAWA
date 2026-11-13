# Homepage theme-menu QA — 2026-11-13

These screenshots are from a local production build on the theme branch, not from a hosted preview. The local main app used synthetic Supabase credentials and a refused loopback endpoint (`127.0.0.1:9`) so no production data or external provider was contacted.

- `theme-menu-mobile-375.png` — 375 × 812; hamburger drawer, module links, Appearance switch and member actions.
- `theme-menu-desktop-1440.png` — 1440 × 900; same drawer-based Appearance control remains reachable on desktop.
- `system-theme-toast-mobile-375.png` — 375 × 812; first-visit notice with the homepage-only storage/preferences notice below it.

## Verification

On Node 22.23.4 and pnpm 10.34.9, `pnpm typecheck` passed; `pnpm build` passed for both production apps (2/2); and `pnpm test` completed with 170 tests: 169 passed, 0 failed, and 1 documented PGlite skip (PostgreSQL `btree_gist` exclusion constraints are not exercised by that test database).

Local Playwright checks passed at 320, 375, 768, 1024 and 1440 CSS px for no horizontal overflow, hamburger and Appearance reachability, exactly one switch, Escape close, focus restoration and inert closed drawer. Preference checks passed for first-visit OS light/dark selection, persistent manual override, stable override after OS changes/reload, one-time system explanation, dismissal/manual-choice behavior, authentication-screen suppression, and reduced-motion transitions. The system-theme notice and homepage storage notice were checked not to overlap.

These checks do not prove hosted email delivery, production database behavior, hosted CI, or a hosted visual review. The PR and Production state must be checked separately after the normal merge workflow.
