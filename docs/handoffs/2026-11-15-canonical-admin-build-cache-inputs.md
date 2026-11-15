# Canonical Admin build-cache correctness

Updated 2026-11-15 07:48 WAT. Base main `2dc9d3e61d344ac705cdc3e3c1bb3f67042ccddf`.

## Done

The public app serves canonical `/admin/*` routes by importing sibling Admin sources. Turbo's default package-only hashing did not include those imported files. Production deployment `dpl_DMxh3E8br4kQzLJ4gCNPJpmYyVDc` was READY at the correct commit, but its build events explicitly showed `@epelawa/main:build: cache hit, replaying logs 646820003af4bfd2`; it therefore kept the old editor query despite the source fix. A minimal anonymous live REST request independently validated the new column-hint query (HTTP 200, empty private result).

Package-level Turbo configs now extend root settings and add only imported sibling code to build inputs. Main tracks Admin `app/**`, `lib/**`, `components/**`; Admin tracks the imported main `lib/news-covers.ts` catalog. `$TURBO_DEFAULT$` preserves normal package inputs. Root build outputs/environment stay inherited. Cache remains enabled; no dependency cycle, secret/environment change or force-deploy workaround is introduced.

Actual Turbo dry-run proof: main hash `682e90ff13a8ce3a` changed to `1c5dec731df65cb9` for a temporary Admin-source comment, but stayed `682e90ff13a8ce3a` for unrelated documentation. Probe edits were restored byte-for-byte. Machine-readable proof: `artifacts/canonical-admin-cache-hash-proof.json`. Official input guidance: https://turborepo.dev/docs/reference/configuration.

## Verification / remaining

Initial forced builds (2/2) and typechecks (5/5) passed; new cache regression passed. The first full suite ran concurrently and had four runtime HTTP fixture fetch failures; it is not a release pass. Final forced build (2/2), typecheck (5/5) and complete SERIAL suite passed with the exact synthetic environment: 265 total, 264 passed, zero failed, one existing skip. Log: `/tmp/canonical-admin-cache-final-serial-gates.log`.

UI code is unchanged; the previously reviewed five-width canonical editor evidence remains at `docs/screenshots/news-version-hint/2026-11-15/` (390px edit screenshot linked from the prior editor handoff).

Resume only after successful final gates: ordinary exact-head PR merge, byte-identical updated-main check, exact Production READY plus build-log cache MISS, then open the TWO existing approved private drafts, save/publish/unpublish/republish and verify exact anonymous body/cover/linked attribution. IDs: `d771e9ac-d636-463d-955f-f76f7dfdb8e7`, `d30cd867-634b-4e8f-add9-264f6622bfa7`. Do not create duplicates. Third story remains on hold. This patch makes no production content, account, database or environment change.
