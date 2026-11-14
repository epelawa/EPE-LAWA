# Newsroom live-schema repair — 2026-11-15

**Checkpoint at 2026-11-15 00:27 WAT:** local implementation and validation complete; this change set is not yet committed, opened as a PR, merged, or applied to Production. This is a timestamped release checkpoint; later PR/deployment/migration state belongs in the central release ledger.

## Done

- Read-only Production audit (Supabase project `igqmybuiovaxqmrteebd`, per the central release ledger) found `articles.state` absent; `article_versions.state` allows `draft`, `review`, `approved`, and `rejected`; the published view exposes approved versions via `published_version_id`. Existing editorial RPCs are invoker-security, lack a pinned search path, are callable too broadly, and some reference the absent article state. `article_revise` and `article_draft_update` are absent.
- Added `backend/supabase/migrations/20261114235700_newsroom_authoring_live_schema.sql`, a forward-only, additive RPC/ACL repair. It avoids table data changes and avoids `DROP`, `TRUNCATE`, and `DELETE`. Publishing uses Production’s approved-version plus `published_version_id` contract; unpublish clears the publication pointer while retaining history. Draft save/revision and publication transitions are capability- and revision-checked, security-definer with an empty search path, audited, and restricted to authenticated staff execution. The unused incompatible legacy `article_review` RPC is no longer executable by API roles.
- Updated Admin Newsroom status/filter logic to derive public state from the version pointer, distinguish the current draft from an earlier public version, and report query errors separately from missing rows.
- Updated the synthetic PGlite schema fixture to match the verified Production catalog where the local-only immutable-version trigger is absent; client-side version mutation remains denied by privileges.
- Local tests: focused Newsroom/schema suite **33 total: 32 passed, 0 failed, 1 documented skip**, including the null current-version guard regression. Full workspace suite **236 total: 235 passed, 0 failed, 1 documented skip**. Forced uncached typecheck **5/5 tasks** and production builds **2/2 tasks** passed on Node 22.23.5 / pnpm 10.34.9. All checks used localhost-only synthetic Supabase settings.
- Synthetic Admin screenshots are in [`the screenshot folder`](../screenshots/newsroom-live-schema/2026-11-15/README.md). They show the Published/current-draft/earlier-public status logic with synthetic data only.

## Remaining

- Commit/push this focused branch, refresh the exact PR head and hosted status, and attempt only the ordinary GitHub merge path (no bypass). If GitHub blocks it, close the PR as the owner directed while preserving the branch for follow-up.
- After a normal merge, refresh Production schema/ledger and Vercel deployment metadata. Individually preflight this exact SQL against the then-current live catalog, apply only this forward-only migration through the approved Supabase migration path, and verify the generated ledger version, function definitions, ACLs, and live routes. No production application has occurred yet.
- Create only the two owner-approved private News drafts after the schema repair is live and the authorized Admin action path is available. Do not seed synthetic/public content.
- A 390px Admin Newsroom screenshot reports page-level horizontal overflow (full-page capture width 641px). This responsive issue is not addressed by this schema repair and needs a separate focused follow-up.

## Blocked

- No Admin sign-in session is available here for private-draft creation; the approved content remains uncreated.
- Gmail SMTP is configured in Supabase Auth, not Vercel; the private credential/configuration step is still pending.
- The deleted `legateakanjimusab@gmail.com` account has not been recreated. No account or profile row was changed by this work.
- The current branch is not yet merged; therefore no claim is made that the Newsroom migration is live.

## Resume point

1. Run `git diff --check`, stage only the migration, Admin Newsroom source/tests, and this handoff/screenshot evidence; commit and push normally.
2. Open one focused PR; verify its exact head and hosted statuses; attempt ordinary merge without bypass. If blocked, preserve branch and close the PR per owner direction.
3. After a successful merge, re-read the live Production ledger and exact editorial objects; apply this one migration only if its preconditions still match.
4. Read back the generated version and security/function definitions, then check public `/news` and protected Admin route behavior. Do not create content or accounts as part of schema verification.
