# Newsroom editor live-schema compatibility

Updated 2026-11-15 07:38 WAT. Base main: `64e68455d1e3c7b173d31038d7afb66f9c023aeb`.

## Done

The first approved draft was successfully created, but its Admin editor failed because the nested PostgREST query named `articles_current_version_fkey`. Read-only Production catalog evidence showed the live foreign key is instead named `articles_current_version_id_fkey`. All requested columns exist. The editor now disambiguates the relationship using the stable `current_version_id` column hint, avoiding dependence on either constraint spelling. The list already used its column relation and is covered by the regression. No migration, RLS change or schema-name workaround is needed.

The strict loopback fixture rejects the old hint. Canonical Admin create/edit checks pass at 320/390/430/768/1440 px with saved approved-cover retention and no overflow; clean screenshots and measurements are under `docs/screenshots/news-version-hint/2026-11-15/`. The 390px edit capture was visually reviewed.

Pinned Node 22.23.5/pnpm 10.34.9 forced workspace build: 2/2 tasks passed; typecheck: 5/5 passed. Final complete suite: 264 total, 263 passed, zero failed, one existing skip. Earlier runs exposed an overly narrow new source-test regex for the list's already-valid alias; corrected the assertion, not application behavior, then reran the complete suite successfully. Log: `/tmp/news-version-hint-final-gates.log`.

## Remaining / resume

Ordinary exact-head PR merge with no bypass; verify updated main and exact Production deployment. Then resume the TWO EXISTING approved private drafts; do not create duplicates: `d771e9ac-d636-463d-955f-f76f7dfdb8e7` and `d30cd867-634b-4e8f-add9-264f6622bfa7`. Save unchanged approved copy to exercise editing, publish through Admin, verify exact anonymous copy/cover/credit, unpublish and verify removal, then republish and leave both published. Third story remains on hold. This patch itself changes no production content, accounts, environment or database objects.
