# Homepage hero refinement follow-up — 2026-11-14

## Done

- Removed the duplicate logo pill and its unused styles/import from the homepage hero.
- Replaced the tall multi-line lockup with the concise “Epe. Closer to home.” headline and shorter supporting copy; tuned mobile typography and reduced hero padding/gaps.
- Removed the four topic taglines and their unused layout styles.
- Kept the map pin and “Epe · Lagos State” immediately after the carousel image, followed by “Rooted in the community. Open to everyone.”
- Preserved the existing carousel, real sourced image credits, licensed fonts, EPE-LAWA palette and homepage-only cookie banner. No geolocation behavior was changed or added.
- Added regression assertions for the copy, removed lockup/taglines and post-image location/note. Captured screenshots at 320, 375, 768, 1024 and 1440 CSS-pixel widths; see [dated screenshot README](screenshots/home-hero-refinement-followup/2026-11-14/README.md).
- Hero-focused tests (3/3), app typecheck and production build pass. `git diff --check` is clean.

## Remaining

- Owner review. This change is intentionally not merged.
- Verify hosted CI if/when repository permissions allow. Hosted checks may be inaccessible with HTTP 403; no hosted-check success is claimed here.

## Blocked

- A broader test selection was not clean in this sandbox: unrelated server-fetch tests errored with `ECONNRESET`/socket closure, and an existing all-public-pages structural test rejects the baseline dashboard page. `pnpm install --frozen-lockfile` reports the environment's pnpm ignored-builds guard for esbuild after packages are linked. These do not affect the focused checks listed above.

## Resume

1. Review this PR and the responsive screenshots.
2. Verify hosted checks if access permits; revise this handoff if hosted-check access or the unrelated wider test failures are resolved.

Local preview used only dummy Supabase values on dedicated port 3122. No production data or environment was accessed or written.
