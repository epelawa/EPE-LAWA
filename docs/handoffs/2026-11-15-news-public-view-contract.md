# News public-view contract handoff

**Updated:** 2026-11-15 08:01 WAT. **Branch:** `fix/news-public-view-contract-20261115`, based at `34c69c190044aed6e8cabbf1fb6aa0ab3cbf4311`.

## Done

- Removed unsupported `tags` from the public article metadata select, TypeScript shape and article UI. No tags feature or database change is claimed.
- Added strict regression coverage checking every public News `published_articles` select against the verified columns: `id, slug, published_at, is_breaking, breaking_until, title, summary, body, seo_title, seo_description, og_image_key, author_name, author_slug, category_slug, category_label`.
- Audited all three public News view selects: index, article metadata and related stories. Their selected fields now comply. The separate exact published-version body helper, article covers/credits and cache configuration were left intact.
- Focused Newsroom test: **8/8 passed**. Pinned forced build **2/2 tasks**, forced typecheck **5/5 tasks**, and serial full frontend/backend suite **266 total: 265 passed, 0 failed, 1 skipped**. `git diff --check` clean. Full gate log: `/tmp/news-public-view-contract-final-gates.log`.
- Strict local synthetic capture rejects unknown `published_articles` columns with HTTP 400 / PostgreSQL code `42703`; it returned no tags. Public index and article captures cover 320/390/430/768/1440 px, with no horizontal overflow. Screenshots and measurements: `docs/screenshots/news-public-view-contract/2026-11-15/` (20 PNGs plus `measurements.json`). Both approved-cover fixtures and article bodies are synthetic; browser egress is loopback-only.

## Pending / blocked

- Live public page remains pending a separate owner-controlled republish and fresh anonymous verification. The parent had unpublished draft 1 to keep the failed production page fail-closed. This work did not access or alter either existing draft (`d771e9ac-d636-463d-955f-f76f7dfdb8e7`, `d30cd867-634b-4e8f-add9-264f6622bfa7`).
- No migration, production write, account/environment change, commit, push, PR, merge or deployment was performed. The parent owns any next production action.

## Resume

After the parent-authorized publication state is restored, perform a fresh anonymous public article/index check and confirm no `42703`; keep both database drafts untouched unless separately authorized. Then review this exact branch diff and follow the owner's merge/deployment procedure. Do not infer tags support from this patch.
