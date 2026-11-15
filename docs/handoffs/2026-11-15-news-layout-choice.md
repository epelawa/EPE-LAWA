# News interface choice — 15 November 2026, 09:16 WAT

## Done

The owner requested an immediate replacement of the rejected News presentation, with no editorial changes. This focused patch permanently removes `breaking-ranked`, the last screenshot-identified rejected variant, from the runtime registry, type tuple and all layout CSS. The clock had already advanced the open browser to `compact-topical` when inspected; that automatic change is not treated as a new owner preference.

Every new visit now starts with the existing clean, reference-led `editorial-rail` presentation. It remains the initial hydrated state rather than being immediately replaced by a global clock choice. Real minute boundaries then rotate through `editorial-rail`, `magazine-sections`, `reader-focused`, and `compact-topical`. Search focus still pauses visual changes, entered text remains mounted, and visibility changes catch up to the visit's elapsed minute. No new designs or unavailable variants were invented.

The source diff changes only News presentation/selection and regression tests. It does not change article queries, article copy, covers, bylines, category records, publication/version pointers, schema, auth, provider settings or environment values. The separate unfinished Tourism migration is preserved in its own worktree and is not part of this release.

Focused News tests: 14 passed, zero failed. A deterministic regression checks 20,001 minute offsets, including negatives, to ensure the removed variant cannot return. Pinned Node 22.23.4/pnpm 10.34.9 gates passed: forced typechecks 5/5, forced builds 2/2, complete serial suite 269 total / 268 passed / zero failed / one existing PGlite exclusion-constraint skip. Independent read-only review found no release blocker. A corrected localhost-only synthetic fixture build passed five widths (320, 390, 430, 768, 1440): all four remaining variants render distinctly without horizontal overflow. The controlled-clock test confirmed editorial-rail entry, the complete four-layout cycle, permanent exclusion of breaking-ranked, search-focus pause/text preservation, and rotation resumption. PR visual evidence: `docs/screenshots/news-layout-choice/2026-11-15/synthetic/390-editorial-rail.png` and `1440-editorial-rail.png` (local synthetic article text, not Production screenshots).

## Preservation baseline

Read-only Production fingerprints at 09:16 WAT: articles 2 rows / `93189ed399ec13527146f1a7bff4f98b`; article versions 3 rows / `d6767dbf88c7d85707e78cf16de1b31b`; categories 7 rows / `bd3c508017a5e8b5cfa1c1ad27a6ffa2`. Recheck after release. The held Hamzat/TOOPC story remains unapproved and untouched.

## Pending

- Focused PR, exact-head checks and ordinary merge, followed by exact-SHA READY Production deployment.
- Read-only real Production mobile/desktop verification: chosen entry layout, real next-minute rotation, no removed variant, stable article links and no overflow.
- Post-release article/version/category fingerprint comparison and fresh user-visible screenshot.
- Separate focused follow-up for Admin-linked covers, required image attribution, public eager loading for above-the-fold images, and the owner's requested full-bleed `cover` fit. Production has no configured Supabase Storage buckets; therefore do not claim uploads work. Existing approved covers are catalog-local files and current articles reference `epe_road_benbeezy` and `epe_welcome_demobebz`. Current lead/detail images are already eager; secondary News list thumbnails currently load lazily. Preserve both published keys and credits.

## Blocked / limitations

No Production write or migration is required for this layout-only PR. Hosted GitHub check-detail access has historically returned 403; do not mislabel local gates as hosted CI. Use only a normal merge without bypass. Synthetic screenshots are not Production acceptance evidence. The first local screenshot attempt used a runtime fixture URL against a build that had inlined a different `.invalid` URL and therefore rendered the truthful data-error state; no product source defect was inferred. Rebuilding the unchanged candidate with a matching loopback-only fixture configuration corrected visual validation. Separate image uploads are blocked until a safe storage provider/bucket and access policies exist; a versioned validated-URL feature is being assessed separately, without overloading legacy image-key fields.

## Resume

Worktree: `/workspace/EPE-LAWA-news-layout-choice`; branch: `fix/news-remove-breaking-ranked-20261115`; base: `ea7c5929855ab703f98799ad1cfdde2b84b62a34`. Gate logs: `/tmp/epe-news-choice-typecheck.log`, `/tmp/epe-news-choice-build.log`, `/tmp/epe-news-choice-tests.log`, `/tmp/epe-news-choice-fixture-build.log`, `/tmp/epe-news-choice-capture.log`. Visual harness: `/tmp/epe-news-choice-capture.cjs`; screenshots: `docs/screenshots/news-layout-choice/2026-11-15/synthetic/`.
