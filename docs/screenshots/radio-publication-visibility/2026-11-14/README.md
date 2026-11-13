# Radio publication-visibility QA — 2026-11-14

The public Radio page was checked at **320, 375, 768, 1024 and 1440 CSS px** using a local Next.js development server and a loopback-only Supabase REST fixture at `127.0.0.1:54321`. The fixture returns a synthetic draft sentinel if a public request is missing the required publication filters; with the candidate filters, all three public reads return empty arrays. Across the five viewports the page returned HTTP 200, showed the separate truthful empty states for programmes, schedule and archive, showed no draft sentinel, had no horizontal overflow, and produced no browser-console or page errors.

The fixture recorded 18 local REST reads—six each for `programmes`, `radio_schedule` and `episodes`. Every programme request included `publication_status=eq.published` and `is_active=eq.true`; schedule and episode reads additionally required a published, active parent programme through an inner relation. Episode reads also retained the non-null `published_at` guard. No production Supabase URL, records or credentials were used. The captures show the synthetic-fixture empty state, not real Radio listings.

## Captures

| Viewport | Screenshot |
|---:|---|
| 320 × 812 | [radio-320px.png](radio-320px.png) |
| 375 × 812 | [radio-375px.png](radio-375px.png) |
| 768 × 1024 | [radio-768px.png](radio-768px.png) |
| 1024 × 768 | [radio-1024px.png](radio-1024px.png) |
| 1440 × 900 | [radio-1440px.png](radio-1440px.png) |

## Code gates

- Focused Radio tests: **7 passed, 0 failed**.
- Workspace typecheck: **5/5 tasks passed**.
- Workspace production build: **2/2 app builds passed**.
- Repository suite: **183 passed, 0 failed, 1 documented skip (184 total)**. The skip is the existing PGlite/PostgreSQL exclusion-constraint limitation; it is not related to this change.
- `git diff --check` passed.

The project pins Node 22 and pnpm 10.34.9; this sandbox ran Node 24.22.1 and pnpm 11.25.0, so workspace engine/version warnings were emitted. Build and test gates still completed successfully. These are local candidate checks only: they do not prove the deployed Supabase schema/RLS state, any published Radio content, or live-stream availability.
