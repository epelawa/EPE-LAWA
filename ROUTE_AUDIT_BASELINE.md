# Route audit baseline (`main` @ `4bea03d`)

Method and route list: `ROUTE_AUDIT_PLAN.md`. Raw data: `docs/route-audit/`.

Two baselines were captured, each with 46 paths × 10 viewports = 460 captures.

| Data set | What it represents | Files |
|---|---|---|
| **Populated** (primary) | The smoke stub serving fixture news, categories and member data (mode `stories`); tables without fixtures return errors. | `docs/route-audit/before-data/metrics-before.json`, `before-data/screens/` (17 key routes × 10 viewports) |
| **Read-failure** | Every server-side Supabase read failing (a local proxy misconfiguration during the first run). It is kept because it shows how every route degrades when the database is unreachable. | `docs/route-audit/before-readfail/metrics-baseline.json` |

## Populated baseline: results

| Metric | Result |
|---|---|
| Captures with horizontal page overflow | **0** / 460 |
| "Lorem ipsum" anywhere | **0** |
| Duplicate provider naming ("Radio Naija Radio") | **0** |
| "On air now" shown with no scheduled programme | **10** (`/radio`, every viewport) |
| Top or scroll progress bars | **0** (the only hit, `/auth`, is the sign-in step indicator, a form element) |
| Interactive targets < 44 px | **65** (see below) |
| Captures where h1 ≠ 1 | **43** |
| Console errors | **20**, all on `/map` (CSP blocked the OpenStreetMap iframe) |
| Non-200 responses | `/itan-ilu-mi/correction` → **404** (the page did not exist) |

### Small targets by route (populated)

| Route | Element | Size | Captures |
|---|---|---|---|
| `/tourism` | 6 photo caption links | 300×20 | 30 |
| `/radio` | Mute button | 36×36 | 10 |
| `/` and `/news` (≥768 px) | Breaking-news ticker headline | 219×23 | 10 |
| `/radio/archive` | "Radio" breadcrumb | 38×23 | 5 |
| `/news/author/browser-fixture` | "News" breadcrumb | 38×23 | 5 |
| `/newsletter/unsubscribe` | "Back to News" | 92×23 | 5 |

### h1 problems (populated)

- h1 = 0 on `/business-directory/no-such-business`, `/forum/category/no-such-category`, `/forum/thread/no-such-thread` and `/who-is-who/no-such-person` at every viewport. When the read fails, these pages render an `EmptyPanel`, whose title is an h2, so the page has no h1.
- `/dashboard`: 0 or 2 on 3 captures. This is a transient: signed-out visitors see a heading-less loading shell, then a redirect to `/login` (which has 1 h1). It was captured mid-hand-off.

### Read-failure baseline: differences

- Small targets 55: the same list without the breaking ticker, which has no stories when reads fail.
- h1 ≠ 1 on 40 captures: the same four invalid-slug routes.
- 20 `/map` errors and the `/itan-ilu-mi/correction` 404, as above.

## Baseline observations from code review and production (read-only)

- **News:** no page overflow, but the category tab rail had no `min-width: 0` or overscroll containment, so a long category list could widen the flex parent.
- **Who is Who detail:** the actions sat inline beneath the text, with no compact button row.
- **Radio:** "On air now: station programming" with a red live dot at all times, a false live claim. Provider credit "Guts FM catalogue powered by Naija Radio ↗". No ad slot or provider logo exists.
- **Ìtàn Ilú Mi:** no Lorem. Production shows "No approved history records yet". The correction form was inline at the top of the archive. Uploads are explicitly not accepted, and the `history*` tables have no media column.
- **Forum:** reply and new-thread forms were plain server actions.
  - A failed reply (locked thread, inactive membership, rate limit, validation) redirected to **`/forum?forum_error=…`**, the forum home and not the thread. The member left the discussion and the typed reply was lost (P1).
  - There was no pending state on Send.
  - Reactions reverted silently on failure, with no explanation.
  - The signed-out "Support" link always returned to `/forum` rather than the current thread.
  - The heart was a text glyph (`&#9829;`), not an SVG icon as `AGENTS.md` requires.
- **Map:** the OSM iframe was blocked by CSP (P1).
- **Business directory:** reads published businesses only (1 in production). No invented data.
- **Search:** a standalone `/search` page; the header icon linked to it.
- **Notifications:** the bell linked to `/radio/reminders`. There was no notification centre and no onboarding, and subscribing never saved topics (see `PLATFORM_UI_AUDIT.md`).
