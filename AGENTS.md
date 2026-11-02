# EPE LAWA — Agent Working Rules

**Read this file and `docs/00-master-plan.md` before any task.** The master plan is the authority on
scope and phase order. If this file and the master plan ever disagree, the master plan wins and this
file must be corrected.

---

## 1. What this project is

EPE LAWA is a community, news, cultural and commerce platform for Epe Division, Lagos State, Nigeria.
It ships as a **web application first** (installable PWA) with a **React Native + Expo** native shell
to follow, sharing one Supabase backend.

Approved build scope, in dependency order:

1. News publishing (§3.1)
2. Who is Who — notable people and public office holders (§3.8)
3. Live radio (§3.7)
4. Public accounts, comments and notifications
5. Community forum — the digital village square (§3.3)
6. Business directory (§3.5, discovery half)
7. Marketplace and payments (§3.5, commerce half)
8. Hardening and release

**Not in scope, do not build:** Speak Up Epe reporting, heritage archive, tourism pages, events
calendar, scholarship/job board, e-learning, multi-language, AI assistant, map navigation, native app
binaries. These are approved as *future product*, not as current work. Do not scaffold them, do not
leave dead links to them, do not imply they exist.

---

## 2. Truthfulness — non-negotiable

- **Never invent Epe facts.** No invented history, lineages, place names, office holders, statistics,
  business names, prices, testimonials, radio schedules or stream URLs.
- **No demo data, ever.** No seeded articles, users, businesses, reviews, orders or fake counters. No
  seeding scripts. Legitimate data is created through authorised operations only.
- **Empty is a design state.** Every list, feed, directory and dashboard must have a real, accessible,
  distinct empty state. Empty ≠ loading ≠ error ≠ denied. Never fill a gap with placeholder content.
- **"LIVE" means verified.** Never render a live indicator, a play button state, or a "now playing"
  label unless status was actually checked. An unavailable stream gets an honest unavailable state.
- **A "verified" badge means a human checked a source.** It must record who verified, when, and what
  source. Never a self-declared flag, never cosmetic.
- **Never claim untested work is done.** Write "not verified", not "should work".

---

## 3. Money, identity and deletion — extra care every time

These paths get scrutiny on every change, no exceptions:

- **Payments.** Never trust a client-supplied price, total, currency or status. Recompute totals on
  the server. Verify Paystack webhooks by signature. Make every payment operation idempotent on the
  provider reference. Never mark an order paid from a browser callback.
- **Authorisation.** Enforce on the server and at the database (RLS). Hiding a button is not
  authorisation. A user must never read another user's drafts, orders, messages or profile data.
- **Deletion.** Account deletion, business deletion and content takedown are flagged in the PR. Prefer
  soft delete for anything with an audit or moderation trail. Never silently delete production data.

---

## 4. Definition of done — every step, no exceptions

A step is not done until **all** of these are true *and you have run them*:

```sh
pnpm install --frozen-lockfile   # only when dependencies changed
pnpm typecheck                   # must pass, zero errors
pnpm build                       # must pass, all three apps
pnpm test                        # must pass
```

Then check by hand:

- [ ] `TypeScript strict` holds — no new `any` outside a documented escape hatch
- [ ] No secrets, keys, tokens or real personal data in code, logs, fixtures or commit messages
- [ ] Responsive at 320 / 375 / 768 / 1024 / 1440 CSS px — no horizontal overflow
- [ ] Keyboard reachable, visible `focus-visible`, no `div` where a semantic element belongs
- [ ] Empty, loading, error and denied states all render and are distinguishable
- [ ] No dead links, no fake buttons, no non-functional controls
- [ ] New environment variables added to `.env.example`

**Report the real command output.** If a check fails, say so, fix it or report it — never report a
check as passing that you did not run.

---

## 5. Git

- Work on `main` unless the developer explicitly asks for a feature branch.
- **Commit and push after each verified step.** One logical change per commit.
- Every commit must be preceded by a green `typecheck` + `build` + `test`. Do not commit a red tree.
- Commit message format: `area: what changed` — e.g. `news: add article publish transition`,
  `docs: rebaseline scope for five-module build`.
- **Never** force-push, rewrite published history, `reset --hard` without explicit instruction, or
  delete a branch you did not create.
- `.github/` is permitted. CI is expected.

---

## 6. Repository layout

```
frontend/
  apps/
    main/       # public platform: landing, who is who, radio, forum, business, marketplace
    news/       # news publication (separate host)
    admin/      # staff and moderator dashboard
  packages/     # shared browser-safe UI and contracts when justified
  tests/
backend/
  supabase/
    migrations/ # reviewed migrations — the schema source of truth
  packages/     # auth, editorial, http-security, and domain packages
  tests/
docs/           # planning, architecture, operations
```

Rules:

- Server-only code never enters a browser bundle. Shared server modules stay under `backend/`.
- Migrations are the source of truth. Never edit an applied migration — write a new one.
- No circular dependencies between packages.
- Do not add a new top-level folder without saying why in the PR.

---

## 7. Stack — do not substitute without asking

Full detail in `docs/13-tech-stack.md`. Summary:

LANGUAGE TypeScript strict · FRAMEWORK Next.js App Router · UI plain CSS + custom properties
(keeping Tailwind/shadcn as the named default until a component library justifies it) · ICONS
lucide-react · ANIMATION framer-motion, restrained · DATES `date-fns` (never moment) · VALIDATION
zod, both directions · SERVER STATE TanStack Query · CLIENT STATE Zustand · AUTH Supabase Auth ·
DB Supabase Postgres + RLS · STORAGE Cloudflare R2 · EMAIL Resend · PAYMENTS Paystack ·
HOSTING Vercel · SEARCH Postgres full-text first · EDITOR Tiptap ·
NATIVE React Native + Expo (not Capacitor, not a WebView)

If the framework already provides it, use that first. Do not add a dependency to save ten lines.

---

## 8. Design direction

**Modern Riverine Editorial.** Civic, cultural, editorial — not a SaaS template.

- Palette (locked): Riverine Teal `#0B5A60` · Palm Green `#2E7D32` · Ochre Gold `#E5A93C` · Deep
  Charcoal `#1C1E21` · Warm Ivory `#F9F8F6`. Tokens and computed contrast pairs are in
  `docs/05-design-system.md`.
- **Banned:** purple gradients, neon, glassmorphism without a stated reason, glow, floating blobs,
  sparkles, generic "AI" visual language, oversized meaningless typography, three-card marketing rows
  with invented metrics, emoji in headings or product UI.
- Radius: 2–3 values maximum. Hover lift: 2–4 px. Icons proportional to their text.
- Copy: plain, specific, human. No "Unlock growth", "Take your business to the next level",
  "Launch faster". No em-dash overuse.
- Authentic Epe imagery only, licensed and credited. Never generic African stock presented as Epe.
- Before substantial UI work, record what you actually looked at (Mobbin, Pinterest, editorial and
  accessibility sources) in `docs/15-ui-research.md`. Do not copy protected screens, assets or brands.

---

## 9. Documentation

- Update the relevant doc in the same commit as the change it describes. Documentation that lags the
  code is a bug.
- Record material scope changes in `docs/00-master-plan.md` and get developer approval.
- Never document imagined functionality.
- Keep `docs/14-tracker.md` current — `[x]` requires named evidence, `[ ]` means not finished.
