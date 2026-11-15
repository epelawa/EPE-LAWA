# News layouts that visibly change each minute

Checkpoint: 15 November 2026, 08:50 WAT. Branch: `fix/news-visible-minute-rotation-20261115`. Verified base: `19c88b72ba02dc5b937d2649002752590723c787`.

## Done

Production before-fix observation showed layout names changing at two real minute boundaries while the mobile lead stayed effectively identical. Initial-server rail partitioning also removed the only second story from the list that later presentation variants expected.

The complete ordered story list now stays mounted. Five CSS compositions restyle the same content: editorial lead with desktop rail, headline-first magazine, split-column ranked lead (including mobile), centered serif reader and compact dark topical lead. A separate stable lead/category column preserves the original rail-height safety property. Unused conditional sidebar markup was removed. No article text, ordering, URLs, source queries, cover keys or publication state is changed.

The client synchronizes to the current minute after hydration, updates at UTC-minute boundaries and catches up when a hidden tab returns. Focused search input/button interaction pauses the update; later minute updates resume without losing typed text. The guard uses the actual semantic search form rather than an unhashed CSS-module class. Reduced-motion and data-saving settings do not freeze presentation-only rotation. Approved covers retain contain fitting and no longer scale on hover. H1 remains visible in every mode; News retains only its minimal EPE LAWA footer mark.

## Verified on final source

Node **22.23.5**, pnpm **10.34.9**:

- Forced serial workspace build: **2/2 successful**, zero cache hits.
- Forced serial workspace typecheck: **5/5 successful**, zero cache hits.
- Full serial frontend/backend suite: **268 total; 267 passed; 0 failed; 1 existing skip**.
- **25 actual rendered layouts**: all five at **320, 390, 430, 768 and 1440px**; 320px uses a 568px viewport height. Every case has distinct lead geometry/typography, no horizontal overflow, visible H1, the same ordered story links, fully decoded contain-fit covers and only the minimal footer.
- Separate actual component scheduler test: immediate minute synchronization, focused-search pause, preserved input text, resumed rotation, reduced-motion rotation and data-saving rotation all pass.
- `git diff --check` passes.

Visual captures directly switch only the presentation attribute in an isolated loopback fixture; **they are not claimed as real-time timer proof**. The scheduler check uses a controlled local browser clock, with a separate context per viewport. Final Production proof requires two real wall-clock boundaries with no reload and no fake clock.

Evidence: `docs/screenshots/news-visible-minute-rotation/2026-11-15/synthetic/measurements.json` and the 25 PNGs beside it. Before-fix public evidence: `live-before/observations.json` and six PNGs. Local fixture uses only synthetic story copy and existing approved repository image assets; all browser requests outside loopback are blocked.

The initial capture failed because of fixture issues (unhashed CSS selectors, an ignored viewport argument, hidden logo inclusion and a paused clock shared with the next page). Those failed attempts are not release evidence. Final accepted captures and scheduler checks are from the corrected fixture. A visual review also rejected two overly similar mobile leads; the final ranked view is genuinely split-column.

## Release gate / resume point

Ordinary exact-head PR merge only, with no bypass. After merge: exact Production READY, confirmed fresh canonical main build, then reload-free mobile/desktop observation at two actual minute boundaries. Compare pre-release read-only fingerprints to prove both existing articles and complete version histories remain unchanged. Recheck both public article hashes/credits and the open PR queue. Record the deployment SHA and final result in the central release ledger.

This focused patch makes **no database, account, article, environment-variable or provider-setting writes**. The separate member repair is already merged as PR #96; owner account recovery was completed and verified through its normal form before this News release. Do not repeat that account update. Draft 3 remains held.
