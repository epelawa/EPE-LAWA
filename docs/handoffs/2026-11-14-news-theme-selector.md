# News theme-selector regression handoff

**Updated:** 2026-11-14 23:31 WAT. **Branch:** `test/news-theme-selector-regression-20261114`.
**Base:** `main` at `c25cb3e5f164aa3e661d14a7c78ebc97c6bc3560` (merge commit for News PR #78)

## Done

- Updated the light-theme regression test to match the intentional `data-news-layout` exclusion added with the News page styling. The check still covers light-only linework, the palette values, fixed background attachment, and unchanged dark-theme tokens.
- Exact focused test: `node --test frontend/tests/light-theme-lines.test.mjs` — 2 passed, 0 failed.
- `git diff --check` passed. Only `frontend/tests/light-theme-lines.test.mjs` is a source change.
- Visual baseline from the merged News UI: [`390px mobile capture`](assets/2026-11-14-news-minute/news-390.png) and [`1440px desktop capture`](assets/2026-11-14-news-minute/news-1440.png). These are the local synthetic-data screenshots already merged with PR #78; this test-only fix makes no visual change.

## Pending

- Commit and push the test-only correction, open one focused PR, and attempt the ordinary GitHub merge without bypass flags.
- After merge, sync the separate Auth branch and rerun the full workspace checks.

## Blocked

- GitHub hosted check details are not accessible through the current connector. Do not claim hosted CI passed. The exact PR head must still be offered to the normal merge gate.

## Resume

Commit the single regression-test file plus this handoff and the roadmap/progress entries, refresh the PR exact head, then use the ordinary merge path. If the normal gate rejects it, keep the branch safe and report or close it only under the owner's prior direction.
