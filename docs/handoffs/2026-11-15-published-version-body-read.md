# Published article body binding

Updated 2026-11-15 07:18 WAT. Base: main `d25b243088d0f805689da65ccc2a811bbb82df2f`.

## Done

Public article reads now resolve `articles.published_version_id`, then request the body with both article ID and that exact version ID. Staff RLS may expose private revisions, so relying on an unordered article-only query was insufficient. Missing/error pointers fail closed, with no private-draft fallback. Existing safe-body rendering and RLS remain in force. No schema, account, credential or production-content changes belong to this patch.

The executable synthetic regression invokes the actual helper: a newer private revision appears first, a missing pointer returns no body, and a pointer error returns no body. The existing readiness assertion now checks the helper location and exact ID binding rather than the old inline query.

Pinned Node 22.23.5 / pnpm 10.34.9 forced workspace build and typecheck passed. Complete suite: 257 tests, 256 passed, zero failed, one pre-existing skip. Log: `/tmp/news-public-version-final-gates.log`. Five-width loopback-only public-page screenshots and measurements passed at 320, 390, 430, 768 and 1440 px, with no horizontal overflow. The fixture deliberately returns a private draft if the exact version filter is omitted. Artifacts: `docs/screenshots/published-version-read/2026-11-15/`.

## Remaining

Ordinary focused PR merge without bypass, verify exact main/deployment, then release the separate approved-cover patch. Publish only the two owner-approved stories after those gates. Third story remains on hold. No destructive database action or deleted-account recreation is authorized.
