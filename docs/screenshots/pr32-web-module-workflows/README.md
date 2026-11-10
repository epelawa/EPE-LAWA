# Web module workflow screenshots

**Captured:** 2026-11-10 WAT from the final local production build. These are local screenshots, not hosted-preview or production evidence. The app used a loopback-only Supabase stub. Listing routes returned empty published datasets; only the News article route used a clearly labelled synthetic local fixture to exercise the offline download. No production records or Supabase settings were read or changed. Screenshots use an ephemeral browser profile with the homepage cookie notice preference already dismissed.

All 31 captures completed with **no horizontal overflow** at 320px, 375px or 1440px. Desktop `documentElement.scrollWidth` was 1425px of 1440px, not overflow. The offline download was also clicked in headless Chromium at 375px; the saved standalone HTML contained the synthetic article text and no script or image embeds.

## Screenshots

### News

- [News listing, 375×812](./local-375x812-news.png)
- [News listing, 320×568](./local-320x568-news.png)
- [News filter, 320×568](./local-320x568-news-filter.png)
- [News listing, 1440×900](./local-1440x900-news.png)
- [News search, 375×812](./local-375x812-news-search.png)
- [Offline-copy article, 375×812](./local-375x812-news-offline-copy.png)
- [Offline-copy article, 320×568](./local-320x568-news-offline-copy.png)

### Map, Business, Forum and directory filters

- [Map, 375×812](./local-375x812-map.png)
- [Map filter, 320×568](./local-320x568-map-filter.png)
- [Map, 1440×900](./local-1440x900-map.png)
- [Business order feedback, 375×812](./local-375x812-business-order-feedback.png)
- [Business email-verification feedback, 375×812](./local-375x812-business-verification-error.png)
- [Business filter, 320×568](./local-320x568-business-filter.png)
- [Business filter, 1440×900](./local-1440x900-business-filter.png)
- [Forum action error, 375×812](./local-375x812-forum-error-feedback.png)
- [Tourism listing, 375×812](./local-375x812-tourism.png)
- [Tourism filter, 320×568](./local-320x568-tourism-filter.png)
- [Tourism filter, 1440×900](./local-1440x900-tourism-filter.png)
- [Who-is-Who listing, 375×812](./local-375x812-who-is-who.png)
- [Who-is-Who filter, 320×568](./local-320x568-who-is-who-filter.png)
- [Who-is-Who filter, 1440×900](./local-1440x900-who-is-who-filter.png)

### Contact, information and dependency states

- [Contact unavailable notice, 375×812](./local-375x812-contact-unavailable.png)
- [Contact unavailable notice, 320×568](./local-320x568-contact-unavailable.png)
- [Contact unavailable notice, 1440×900](./local-1440x900-contact-unavailable.png)
- [Privacy, 375×812](./local-375x812-privacy.png)
- [Terms, 375×812](./local-375x812-terms.png)
- [Community guidelines, 375×812](./local-375x812-guidelines.png)
- [About, 375×812](./local-375x812-about.png)
- [Gallery empty state, 375×812](./local-375x812-gallery-empty.png)
- [Radio unavailable state, 375×812](./local-375x812-radio-unavailable.png)
- [History correction unavailable state, 375×812](./local-375x812-history-correction-unavailable.png)

## Verification record

Pinned runtime: Node 22.23.4 and pnpm 10.34.9. Final local gates: full suite 158 total, 157 passed, 0 failed, 1 known PGlite skip (the two exclusion constraints are not exercised because the test database replaces `citext` with a text domain and lacks `btree_gist`); workspace typecheck 5/5 tasks; both web builds 2/2. Manual source checks found no “Coming Soon” labels in app source and no protected admin email in the served app source/static metadata.

`pnpm audit:ui` and `pnpm audit:security` could not run: `package.json` points to `scripts/audit/run.mjs`, which is absent from this branch (the only tracked file in `scripts/` is `dev.sh`). This is recorded as a tooling limitation, not a passing audit.
