# Radio, Business Directory and Business Profile redesign: final report (turn 5)

The plan is in `IMPLEMENTATION_PLAN.md`; screenshots are in this folder and in `docs/radio-page/`. Radio details are in `docs/radio-page/RADIO_PAGE_*.md`, and layout work is in `docs/responsive/`.

## Completed

### Shared components (`components/business/`)
- `BusinessLogo` (stored logo, falling back to initials).
- `VerifiedBadge`, `FeaturedBadge`, `CategoryBadge`.
- `BusinessCard`, `Breadcrumbs`, `BusinessCardSkeleton`.
- Contact action group (`[slug]/contact-links.tsx`).
- Directory controls (`DirectoryFilterSheet`, `DirectorySortSelect`).
- Empty and error states reuse the existing `design-system` primitives.

All data helpers live in one pure, typed module, `lib/business-directory.ts`: query parsing, `directoryHref`, the search-term sanitiser, and `whatsappHref`/`telHref`/`safeWebsite`/`directionsHref`.

### Radio (`/radio`)
- Order: intro → player → station selector → sponsored business → programme guide → notifications → explore.
- Dark navy player with idle, loading, playing, error and retry states. Volume and mute. The sound-wave shows only while playing and is static under reduced motion.
- Radio Lagos 107.5 and Guts FM 104.9. Switching replaces the stream on a single audio element.
- The sponsored card ("Sponsored", logo, name, category, description, "Explore business") is driven by the admin Ads desk on both the single-sponsor and carousel paths. Founda is never hardcoded. With no sponsor it falls back to "Advertise here", and a missing logo falls back to the EPE LAWA mark.
- No programme or live claim appears without data (production has 0 programmes and 0 schedule rows).

### Directory (`/business-directory`)
- Hero "Discover Local Businesses" / "Find trusted services, businesses and organisations around Epe.".
- Search ("Search businesses, services or locations") uses a GET form. It matches with `ilike` over name, description, category, area and address. The query is sanitised and preserved, and there is a clear action. Results are paged with `range()` and an exact count, so the full table is never fetched.
- Category chips come from `business_categories`; they scroll on mobile and wrap on desktop.
- Filters cover only fields that hold data: category, area, and verified only. They open as a bottom sheet on mobile and a dialog on desktop. Active-filter chips, "Clear all", and state preserved across pages and sorts.
- Sort uses real fields only: Verified first (default), Recently added (`published_at`), Name A–Z.
- The featured section comes from `business_featured` (RLS limits it to the live window).
- Responsive 3/2/1 grid.
- Loading skeleton (`loading.tsx`), "No businesses found" / "Try a different search term or remove some filters.", and a separate error state.
- Pagination keeps every parameter exactly once.
- Filtered and search variants are `noindex, follow`, and the base page keeps its canonical.

### Profile (`/business-directory/[slug]`)
- Breadcrumb, then identity (logo or initials, badges, wrapping name, area), then description.
- WhatsApp as the primary action, then Call, Website and Directions. Each appears only when the field exists. WhatsApp numbers are normalised to `wa.me` digits. Websites are http(s)-validated, and external links use `rel="noopener noreferrer"`.
- The information panel shows stored fields only: address, landmark, phone, WhatsApp, email, website, and hours only when stored.
- The claim workflow is preserved: "Own this business? Claim it", sign-in gating, the `claim_already_open` and `claim_already_owner` errors, and `?claim=sent` confirmation, which was previously ignored and is now fixed.
- "Report incorrect information" goes to `/support`. There is no report table, so no schema was added.
- Related businesses: same category, up to 3.
- A single-column layout is used when there is no description, hours or gallery (no empty column).
- SEO: per-business title and description, canonical, OG image from the stored logo, and `LocalBusiness` JSON-LD built from stored fields only (no rating, no geo, no invented hours).

### Bugs fixed along the way
- The featured join requested a non-existent `category_label`.
- `?claim=sent` was ignored.
- WhatsApp numbers were not normalised.
- Websites were not validated.
- A `server-only` module leaked into a client component, which broke the webpack build.
- The radio `on-air.ts` compared `HH:MM` with `HH:MM:SS`.

## Partially implemented
- **Unknown slug status code:** the not-found page renders with `noindex`, but HTTP returns 200, not 404. This is pre-existing: the root `app/loading.tsx` streams every route, so Next.js commits the 200 before `notFound()` runs. Fixing it means removing or relocating the root loading boundary, which affects every route, so it was left for a separate change.
- **Yorùbá:** 89 new strings were added to `lib/yo/part-8.ts` as draft translations. They need an owner or native-speaker review.
- **Accessibility:** automated checks only (roles, names, `aria-pressed`, live regions, 44 px primary targets, a 24 px checkbox floor, reduced motion). No manual screen-reader pass was done, so no WCAG conformance claim is made.

## Not implemented (and why)
- **Mobile sticky actions bar on the profile:** the contact actions sit directly under the business name in the first viewport. A sticky bar would stack with the bottom nav, the radio mini-player and Support on phones.
- **Reviews, ratings, opening-hours widgets and photo gallery:** there is no data. Hours and gallery render only when stored, and production has `hours = null` and 0 photos.
- **Services list and map coordinates:** there are no columns for them. Directions use the stored address in a Google Maps search link.
- **Request a song and Browse programme archive:** removed by owner instruction.
- **Live "EPE LAWA on air" state:** there is no programme data. The Thursday 13:30 WAT push is a fallback reminder, not a programme.

## Data notes for the owner
- Production has one published business (Founda Technologies) plus a duplicate draft, `founda-technologies-24a1f7`. Nothing was changed; the desk should decide whether to remove the duplicate.
- No migration was added in this turn.

## Verification (run in the sandbox; production build plus the Supabase fixture)
| Check | Result |
|---|---|
| `tsc --noEmit`, main and admin | clean |
| Production build (`next build --webpack`) | EXIT 0 |
| Vitest (`test:unit`) | 175/175 |
| `test:node` | 447 pass, 1 skipped, 3 failed on the first run. The 2 outdated contract tests were updated to the brief (radio sponsor variant, full-bleed page class) and now pass. The 3rd is an **environment** failure: `foundation.test.mjs` read the local smoke build's site URL. CI builds with the production URL. |
| `business-directory.spec.ts` (4) and `radio-page.spec.ts` (8) | 12/12 |
| `public-routes-audit.spec.ts` | pass |
| Full browser smoke suite | see `docs/responsive/RESPONSIVE_TEST_REPORT.md` |
| Responsive audit (28 routes × 22 viewports) | 616 combinations, 0 findings |
| ESLint | **Not run:** the repository has no ESLint dependency, config, script or CI step. As a substitute, `tsc --noUnusedLocals --noUnusedParameters` found one unused parameter in the touched files (`sponsor-carousel.tsx`), which is now fixed. |
| Live radio streams | **Not verified:** tests intercept the stream hosts. |
