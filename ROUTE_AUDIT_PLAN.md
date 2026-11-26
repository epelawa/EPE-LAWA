# Route audit plan: non-admin routes (`frontend/apps/main`)

Scope: every public and member route in `frontend/apps/main/app/**` except `/admin/**`, which is out of scope and was not modified. The homepage is only audited for integration (search, notifications, onboarding); its PR #273 design is untouched.

## Route inventory

There are 43 page routes, found by walking `app/**/page.tsx` and dynamic segments. This turn added `/itan-ilu-mi/correction`, so there are now 44 page routes. `/search` was a page and is now a redirect handler (`app/search/route.ts`).

Audited paths (46): every static route, one real fixture record for each dynamic route that has fixtures, and one deliberately invalid slug for every dynamic route.

| Area | Paths audited |
|---|---|
| Core | `/`, `/about`, `/advertise`, `/contact`, `/support`, `/guidelines`, `/privacy`, `/terms`, `/photo-credits`, `/gallery`, `/events` |
| Auth | `/auth`, `/auth/link-expired`, `/auth/link-problem`, `/auth/new-password`, `/auth/verify`, `/login`, `/forgot-password`, `/dashboard` |
| News | `/news`, `/news/smoke-market-story` (valid), `/news/no-such-story` (invalid), `/news/author/browser-fixture`, `/newsletter`, `/newsletter/confirm`, `/newsletter/unsubscribe` |
| Community | `/forum`, `/forum/new`, `/forum/category/no-such-category`, `/forum/thread/no-such-thread`, `/itan-ilu-mi`, `/itan-ilu-mi/correction`, `/who-is-who`, `/who-is-who/no-such-person` |
| Discover | `/map`, `/business-directory`, `/business-directory/submit`, `/business-directory/no-such-business`, `/tourism`, `/tourism/no-such-place` |
| Radio | `/radio`, `/radio/archive`, `/radio/programmes`, `/radio/reminders` |
| Search | `/search`, `/search?q=market` (legacy URLs, now redirects) |

The browser-smoke fixture has no people, business, forum-thread or tourism records. Valid records for those routes were therefore checked through code review and the production read-only data shape (1 business, 1 forum thread). They were not screenshotted. The invalid-slug pages were audited for all of them.

## Method

1. **Automated sweep** (`docs/route-audit/audit.mjs`): 46 paths × 10 viewports (320×740, 360×800, 375×812, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1440×900, 1920×1080). For each capture it records:
   - HTTP status and final URL;
   - horizontal overflow (`scrollWidth > innerWidth`) and the elements that cause it;
   - h1 count;
   - interactive targets under 44×44 px (inline text links in running prose excluded);
   - literal "Lorem ipsum";
   - duplicate provider naming ("Radio Naija Radio");
   - progress-bar elements (`role=progressbar`, `.scroll-progress`, …);
   - "On air now" claims;
   - console errors.

   It also takes a full-page screenshot.
2. **Interaction checks** (`docs/route-audit/interactions.mjs`): scripted keyboard and pointer flows for the search dialog, the Notification Centre (signed out, permission denied, member), push onboarding and the legacy `/search` redirect, at 375×812 and 1440×900.
3. **Code review** of every route against the brief: truthful states, no invented content, 44 px targets, focus, form feedback, and backend reads and writes.
4. **Read-only production checks** (Supabase SELECTs and policy and grant inspection) to confirm which tables, RPCs and RLS rules exist. Nothing was written.

## Environment

- Production build (`pnpm run build` → `next build --webpack`, then `next start`) on port 3100. The baseline is the same build of `4bea03d` (main at branch point), from a git worktree on port 3101.
- Data comes from the repo's browser-smoke Supabase stub (`frontend/tests/browser-smoke/supabase-stub.mjs`, mode `stories`) behind a local TLS proxy. Two data states were captured (see `ROUTE_AUDIT_BASELINE.md`).
- Chromium (headless) through Playwright. This is a desktop browser emulating mobile viewports, **not** real-device testing.

## Severity scale

- **P0**: broken core flow, data loss, security or privacy exposure, or a false claim to users.
- **P1**: a feature unusable for some users (a11y blocker, broken embed, missing route) or a misleading state.
- **P2**: degraded UX (small targets, missing h1, unclear feedback).
- **P3**: polish.
