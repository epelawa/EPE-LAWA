# Tourism photo-reference gallery — handoff

**Status snapshot (2026-11-14 00:12 WAT):** [PR #49](https://github.com/epelawa/EPE-LAWA/pull/49) is open from `feat/tourism-photo-gallery` at feature head `4a0964241e41644ee76980ecb889b93b13067097`, based on remote `main` `203d7cae923a50dff7633a7ced8e77324bfcc06b`. GitHub reports `MERGEABLE`, but the PR check-rollup and commit-status endpoints return HTTP 403 `Resource not accessible by integration`; do not merge until exact-head checks can be verified healthy. Vercel preview deployment `dpl_2KciNaxD2j58RqtLLvvPiJeLv3Zv` is `READY` for this head (metadata only; no preview page inspected). No Production application data was read or written. A documentation-only status-sync commit is pending on this PR branch and will advance its head; refresh checks and preview metadata on the new exact head before any merge.

## What changed

The Tourism listing now contains a clearly labeled **photo references** section with two Epe-specific Wikimedia Commons images: “Iberekodo Beach, Epe, Lagos” by Tarikhaldun and “Through Epe Mangrove” by Dotun55 (Adedotun Ajibade). Source, author and CC BY-SA 4.0 credits are visible beside each reference and recorded in `frontend/apps/main/public/epe-photo-attributions.txt`. The images include descriptive alt text and are delivered through Next.js image optimization without cropping. The page explicitly says these are visual references, not approved tourism listings; they make no claims about access, amenities, safety, hours, prices or current conditions.

The candidate adds a focused test in `frontend/tests/tourism-photo-gallery.test.mjs`. Ten Playwright captures and their index are in [`the screenshot README`](../screenshots/tourism-photo-gallery/2026-11-13/README.md).

## Verification

On Node 22.23.4 and pnpm 10.34.9, the exact candidate tree passed typecheck (**5/5 tasks**), production builds (**2/2 tasks**) and tests (**185 total: 184 passed, 0 failed, 1 documented PGlite/PostgreSQL-constraint skip**). Production-mode Playwright checked **320, 375, 768, 1024 and 1440 CSS px** using local synthetic fixtures. It confirmed both credits remain visible, no horizontal overflow or browser-console errors, and optimized images retain natural proportions. External origins were blocked; the mock used a local-only `.invalid` Supabase fixture and contacted no production endpoint or data. `git diff --check` passed. The three temporary dependency symlinks were removed, and all ten screenshots remain.

## Completed, pending and blocked

**Completed:** two attributed visual references; visible license/source credits; descriptive alt text; uncropped optimized image delivery; focused tests; five-width screenshot evidence; roadmap/progress updates; PR #49 opened.

**Pending:** verify and add owner-approved Tourism destinations, descriptions and visit details; complete the Tourism module’s full listing and contribution/review flow; perform isolated workflow and authorization checks; obtain verifiable healthy exact-head checks for PR #49; review the preview only if access permits; then use a normal squash merge only when all gates are healthy.

**Blocked or not verified:** this gallery does not prove any destination record or live visit information. Production Supabase schema/workflows, public media hosting, member submissions and any external provider integrations were not tested here. Treat provider-dependent functionality as unavailable until configured and verified. Do not mark the Tourism module complete based on this gallery.

## Resume here

1. Remote `main` was verified at `203d7cae923a50dff7633a7ced8e77324bfcc06b`; this PR is already pushed. Recheck the remote before any future rebase. The local `main` ref in `/workspace/EPE-LAWA` is stale at `9066e56d1c64b9882f8d01d297d06eac7f2177f8` and must not be used as the base.
2. Do not merge PR #49 while GitHub's check-rollup/commit-status APIs return 403; `MERGEABLE` alone does not prove required checks passed. The Vercel preview is `READY` by metadata, but its page was not opened or inspected.
3. Keep PR #47 separate; its GitHub check-rollup is also inaccessible and it must not be merged until healthy exact-head checks are verifiable.
4. Continue remaining module work from `docs/17-owner-requirements-checklist.md`, splitting completed fixes into separate PRs and preserving the owner's cobalt design system, truthfulness and five-viewport QA requirements.

## Exact-tree verification update — 2026-11-14 00:00 WAT

The gate totals above were refreshed on the candidate tree with local-only dummy Supabase configuration (`https://epe-tourism-fixture.invalid`). `git diff --check` passed after documentation updates. No production endpoint, record or account was contacted.
