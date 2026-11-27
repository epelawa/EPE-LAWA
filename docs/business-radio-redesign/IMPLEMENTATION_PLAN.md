# Radio, Business Directory & Business Profile redesign — implementation plan

Written after the Phase 0 audit and before the code changes. It is based on what the repository and the
production database actually contain (read-only queries, 2026-11-26).

## What exists

| Area | Finding |
|---|---|
| Stack | pnpm monorepo, Next 16 App Router, React server components, CSS modules + `app/globals.css` tokens (`--ep-*`), Supabase (PostgREST + RLS), native `<dialog>` via `components/branded-dialog.tsx`. |
| Design tokens | `AGENTS.md` palette (Midnight #0A1023, Navy #17264A, Royal Steel #294B91, Cobalt #477FE0, Ice Blue #A7C5F5, Cloud #F1F4FA, Silver #A6B2C5, Border #293650). The brief's suggested palette is **not** forced; the brief says to keep established tokens. |
| Directory route | `/business-directory` (server component). Reads `business_discovery_search(p_query,p_area,p_category,p_offset)`: substring match on name/description/category, area filter, `order by name`, 12 + 1 per page. |
| Profile route | `/business-directory/[slug]` (server component) on the `published_businesses` view; claim through `member_business_claim` RPC (`claim-actions.ts`, auth + email-verified + rate limit + duplicate protection); contact clicks tracked through `/api/business-directory/track`. |
| Report flow | "Something incorrect? Contact support" → `/support` (enquiry form). There is no business-report table; the flow is kept and an email shortcut is added through `lib/site-identity.ts`. |
| Sponsorship | `business_ad_carousel` (staff-curated) → `SponsorSlot`. Dynamic, not hard-coded to any business. |
| Featured | `business_featured` (live window via RLS). |
| Production data | 1 published business (Founda Technologies: verified, featured, logo, phone, WhatsApp, website, address; no photos, no hours). 9 active categories. 0 radio programmes, 0 schedule rows, 0 recordings. |
| Not in the data model | services, opening hours (hours column exists but empty), ratings/reviews shown publicly, social links, online/physical flag, service area, city/state as separate fields. These are **not** invented; sections stay hidden until data exists. |

## Bugs found in the audit

1. **Featured section never renders.** The directory joins `businesses!inner(... category_label ...)`, but
   `category_label` exists only on the `published_businesses` view. PostgREST rejects the select, the error
   is swallowed, and the "Featured" section is always empty. Fix: read the live `business_featured` ids, then
   read those ids from `published_businesses`.
2. **Claim success is silent.** `submitBusinessClaim` redirects to `?claim=sent`, but the profile never reads
   it. Fix: the profile shows a success status for `claim=sent`.
3. **WhatsApp links.** `wa.me/` needs an international number. A stored local number (`0803…`) produced a dead
   link. Fix: `whatsappHref()` normalises Nigerian `0XXXXXXXXXX` numbers to `234…` and refuses anything that
   is not 10–15 digits.
4. **Website buttons.** Any stored string was rendered as a link. Fix: only `http(s)://` URLs render.

## Directory search, filters and sorting (no schema change)

The existing RPC cannot search location, filter on verification, or sort. Rather than add a migration, the page
reads the already-public, security-invoker `published_businesses` view with PostgREST filters:

- `q` matches name, description, category, area and address (`ilike`). Input is reduced to letters (including
  Yorùbá diacritics), digits, spaces, `&`, `'` and `-` before it reaches the filter string, so it cannot break
  out of the PostgREST `or()` grammar.
- `category` (real `business_categories` slugs only), `area` (substring), `verified=1`.
- `sort`: `verified` (verified first, then A–Z; the default), `newest` (`published_at desc`), `name` (A–Z).
  "Most relevant", "popular" and "featured first" are not offered: there is no relevance score, no popularity
  data, and featured is a separate table.
- Pagination: `range()` with `count: "exact"`; 12 per page; all params are preserved.
- Site-wide search (`lib/site-search.ts`) keeps using `business_discovery_search`, so that RPC stays.

The search is a GET form: no request per keystroke, works without JavaScript, and Back restores the query.
The filter sheet is a native `<dialog>` (bottom sheet on phones, anchored panel on desktop) with active-filter
chips and "Clear all".

## Shared components (new, in `components/business/`)

`BusinessLogo` (logo, or initials fallback), `VerificationBadge`, `FeaturedBadge`, `CategoryBadge`,
`BusinessCard`, `Breadcrumbs`, `DirectoryFilterSheet` (client). Data access and link helpers are centralised in
`lib/business-directory.ts`. Existing `EmptyPanel`, `PageFrame` and `BrandedDialog` are reused.

## Profile

Breadcrumb → identity (logo, name, category, verified/featured) → description → contact actions (WhatsApp first
when present, then Call, Website, Directions) → information list (only fields that exist) → hours (existing)
→ gallery (existing) → claim (existing workflow, success state fixed) → report → related businesses (same
category, real rows). `LocalBusiness` JSON-LD with only stored fields; no ratings, no hours unless stored.

## Radio

The turn-5 redesign already covers the player, station switching, single audio element, honest states, schedule
and reminders. Additions: an optional sound-wave indicator while audio is actually playing (static under
reduced motion), and the sponsored card on `/radio` gains the business description and an "Explore business"
CTA. **Request a song** and **Browse programme archive** are not restored: the owner asked for both to be
removed completely in this same turn, and the brief says actions must link to existing destinations only.

## Out of scope / unchanged

Header (turn-2 owner spec), admin, auth, Web Push, payments, schema. No new dependencies.
