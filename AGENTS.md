# EPE LAWA — Agent Working Rules

## Scope and truthfulness

- Read `README.md` and the relevant documents in `docs/` before each task. Follow the approved phase scope; do not implement future-phase features without approval.
- Never invent Epe facts, stories, users, stream URLs, statistics or content. No demo/seeded application data or seeding scripts. Available features with no real records need meaningful, accessible empty states; distinguish empty, unavailable, error and loading.
- Live radio is mandatory at launch but must not be labelled live without verified status. Do not expose private records, tokens or privileged keys.

## UI design research and direction

- For substantial UI work, research multiple permitted sources, including Mobbin and Pinterest where accessible and relevant editorial/broadcast/accessibility sources. Document actual access, observations and limitations in `docs/15-ui-research.md` or the relevant design record. Do not bypass paywalls, access restrictions or terms, and do not copy protected screenshots, code, branding or assets without rights.
- Create original, organic, human-considered EPE LAWA work rather than generic AI/SaaS templates. Respect the Modern Riverine Editorial direction and the approved palette in `docs/05-design-system.md`: teal `#0B5A60`, green `#2E7D32`, gold `#E5A93C`, charcoal `#1C1E21`, ivory `#F9F8F6`. Validate text and component contrast, responsive behaviour and accessibility. Use authentic licensed Epe assets only.

## Migrations and operations

- Keep reviewed Supabase migrations in `backend/supabase/migrations/` as the source of truth; never create seed scripts. Apply approved migrations incrementally to the explicitly identified development/test project, verify migration history and RLS with real tests, and document the outcome. Do not leave local and remote migration histories silently divergent.
- Review target, backup/recovery and data impact before any live-environment migration; apply to production only after the applicable phase/release review and approval. Do not apply destructive or security-sensitive changes without explicit review, and never bypass a provider security block or plan restriction. No credentials in files, logs or chat.
- A mock or in-memory database test is not a real Supabase verification. Admin must stay closed until authentication, authorization, audit and production-relevant tests are ready.

## Git and phase governance

- At the end of each completed phase, run the relevant checks, update documentation and **open a pull request** for review; do not merge or claim approval without the owner's instruction. Summarise tests, blockers and known limitations in the PR.
- Respect the Arena session branch: work, commit and push only on the currently assigned branch. Do not create, switch, rename or push a different branch. If that branch has already been merged/closed, ask for a new Arena session/branch for subsequent phase work rather than reusing it.
- The repository has three top-level folders `frontend/`, `backend/` and `docs/` plus necessary root files. Do not add another root directory (including `.github/`) without the owner's explicit exception.
