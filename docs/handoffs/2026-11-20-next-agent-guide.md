# Next-agent guide — 2026-11-20 handoff

**Repo:** `epelawa/EPE-LAWA` · **main head at handoff:** `288c18c` (merge of PR #196)
**Single source of truth:** `docs/EXECUTION-CHECKLIST.md` (Chunk 10 is the new phase record)
**Full audit:** `docs/19-master-audit.md` (970 lines, PR #195, merged)

## 1. What is already done

| Item | Evidence |
| --- | --- |
| A11y / 320px overflow fixes | PR #194 merged, commit `5c30676` — six CSS files on main |
| CI Action SHA pinning + checklist mode switch | commits `4f2f3cb`, `be1dc61` — verified ancestors of main |
| Full master audit committed | PR #195 merged, commit `2782ff5` |
| Admin cobalt redesign + R2 backup workspace | PR #196 merged, commit `288c18c` |
| `pnpm typecheck` | exit 0 — 5/5 tasks |
| `pnpm build` | exit 0 — 2/2 tasks, fresh compile, `/backups` in route table |
| `git diff --check` | exit 0 |
| Secret scan on all new files | no credential values; variable names only |

`node_modules` symlinks were accidentally committed in `2fcf275` and removed in `9e4325b`; `.gitignore` now covers symlinks. Final tree is clean — do not re-add them.

## 2. What was NOT run (owner said "ni test")

- `pnpm test`
- `pnpm test:unit`

Chunk 8.1's integration merge gate is therefore **not green on tests**. Run both before any release sign-off and record exit codes in Chunk 10. Do not backfill a `[x]` without a real command log.

## 3. Files touched in this phase

```
.github/workflows/db-backup.yml                         (new)
.github/workflows/db-restore.yml                        (new)
backend/supabase/migrations/20261120170000_system_backup_capabilities.sql (new)
frontend/apps/admin/lib/backup-r2.ts                    (new, server-only)
frontend/apps/admin/lib/backup-dispatch.ts              (new, server-only)
frontend/apps/admin/app/(protected)/backups/actions.ts  (new)
frontend/apps/admin/app/(protected)/backups/page.tsx    (new)
frontend/apps/admin/app/(protected)/backups/backups.module.css (new)
frontend/apps/admin/components/backup-controls.tsx      (new)
frontend/apps/admin/app/(protected)/page.tsx            (redesigned)
frontend/apps/admin/app/admin-dashboard.module.css      (redesigned)
frontend/apps/admin/app/globals.css                     (masthead restyle)
frontend/apps/admin/lib/navigation.ts                   (Backups link)
.env.example                                            (server-only var names)
.gitignore                                              (symlink fix)
docs/EXECUTION-CHECKLIST.md                             (Chunk 10)
docs/19-master-audit.md                                 (full audit)
```

## 4. Security design — do not weaken

- `DATABASE_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, Cloudflare API token and GitHub dispatch token exist **only** in GitHub Actions secrets / server env. Nothing reaches the browser, devtools, RSC payload, action return or console.
- The client receives only backup **key, size and uploaded timestamp**. The key is an identifier required for type-to-confirm — it is not a credential.
- Restore requires: fresh `has_capability('backup.restore')` → exact byte-for-byte key match → automatic `db-backup.yml` dispatch → `db-restore.yml` dispatch → `audit_event`. Never collapse these steps.
- Capability migration adds reference rows only and issues **no grants**. The app fails closed until the owner grants the keys to staff roles.
- `db-restore.yml` uses environment `production-restore` — create that GitHub environment with human approvers before the workflow can run.

## 5. Ordered next steps

1. **Run the skipped gates** — `pnpm test`, `pnpm test:unit`. Fix anything red. Record exact exit codes.
2. **Browser smoke** — Playwright browsers are not installed locally. Install, then run 320 / 375 / 768 / 1024 / 1440 CSS px across public + admin routes, keyboard/focus, reduced motion, no horizontal scroll. Record evidence file names.
3. **`founda-scan`** — real run (heuristic evidence, not proof). Confirm CRITICAL count did not increase above the 20-item baseline; written triage for each.
4. **Owner-gated setup (do not do without explicit named approval):**
   - Apply the capability migration to the live DB.
   - Grant `backup.read` / `backup.create` / `backup.restore` to chosen staff roles.
   - Set GitHub Actions secrets: `DATABASE_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_PRIVATE`.
   - Set Vercel server-only env: `CLOUDFLARE_API_TOKEN` (R2 object list scope), `BACKUP_DISPATCH_TOKEN` (`actions:write`), `BACKUP_WORKFLOW_REPO`, optional `BACKUP_WORKFLOW_REF`.
   - Create the `production-restore` GitHub environment with approvers.
   - Perform a real backup + restore rehearsal in an isolated DB before any live migration.
5. **Final gate** — post-merge full verification on main, docs sync, real scan output, 4-value quality gate (USER-CENTERED / PIXEL PERFECT / PERFORMANCE FOCUSED / FUTURE READY), then final findings/fixes summary.

## 6. Known blockers / flags

- **O1:** Vercel deploy fails — "Git author Brave290 must have access to the project on Vercel". Owner-only access fix. Do not re-author commits to bypass it.
- Vercel access is owner-gated; no dashboard inspection evidence yet.
- Payments stay off; no order/payment runtime path. Mobile deferred.
- `admin_member_delete` still unapplied — audit-before-effect bug and orphan/data-deletion risk. Needs separate owner decision.
- Cloudflare account is personal (`info.epelawa@gmail.com`) — confirm org ownership before production use.
- No bulk migration replay: 48 local files lack ledger entries. Deliberate.
- CSP report-only and `/api/health` liveness-only fail-closed are intentional; do not "fix" them silently.

## 7. How to continue safely

- New work goes on a feature branch → PR → merge. Never push implementation commits to `main`.
- `[x]` on any checklist item requires named evidence: exact command + exit code, or verified `file:line`.
- No production writes, seeds, test data, DDL or deletes without a fresh, explicit per-path owner decision.
- If a decision genuinely splits specialists, bring it back to the orchestrator — do not convene a panel for a one-owner call.
