# EPE LAWA — Sitemap and Information Architecture

**Document:** 03
**Status:** Active. **MOUNTED** means a route exists in the current source/build, not that its hosted deployment or end-to-end workflow is verified. **LIVE** requires a current production check. Planned routes are listed separately and must not be presented as ready.

---

## 1. Current deployment

| Origin | Purpose | Session |
| --- | --- | --- |
| `https://epelawa.vercel.app/` | Public platform, News, member flows, and staff workspace | Member session; separate host-only staff cookie |

The current canonical production origin is `https://epelawa.vercel.app/`. The owner approved staff routes on this same origin at `/admin/*`; the staff session remains isolated in its Secure, HttpOnly, SameSite=Lax, Path=/ `__Host` cookie with no `Domain`. The older `epelawa.ng`, `news.epelawa.ng`, and `admin.epelawa.ng` host split is superseded and must not be implemented without a new owner decision.

---

## 2. `https://epelawa.vercel.app/` — public platform

```
/                                   MOUNTED  landing with official EPE-LAWA logo and section links
/about                              MOUNTED  project information
/contact                            MOUNTED  truthful contact state
/gallery                            MOUNTED  public gallery
/guidelines                         MOUNTED  community rules
/privacy                            MOUNTED  privacy notice
/terms                              MOUNTED  terms of use

/news                               MOUNTED  public News list
/news/[slug]                        MOUNTED  public article detail
/itan-ilu-mi                        MOUNTED  community history archive
/tourism                            MOUNTED  approved tourism records
/tourism/[slug]                     MOUNTED  public destination detail
/map                                MOUNTED  manual map search and safe external directions
/business-directory                 MOUNTED  approved business directory
/business-directory/[slug]          MOUNTED  public business detail
/business-directory/submit           MOUNTED  member submission flow
/business-directory/orders           MOUNTED  member order view
/forum                              MOUNTED  forum index
/forum/category/[slug]              MOUNTED  category thread list
/forum/thread/[slug]                MOUNTED  thread and replies
/forum/new                          MOUNTED  authenticated new-thread flow
/who-is-who                         MOUNTED  public people directory
/who-is-who/[slug]                  MOUNTED  public person detail
/radio                              MOUNTED  truthful stream/schedule/archive states

/login                              MOUNTED  member sign in
/auth                               MOUNTED  member signup
/forgot-password                    MOUNTED  request a password reset
/auth/new-password                  MOUNTED  set a new password
/auth/callback                      MOUNTED  Auth callback route handler
/auth/complete                      MOUNTED  branded verification completion
/auth/verify                        MOUNTED  branded email-code verification and resend; noindex
/auth/link-expired                  MOUNTED  expired-link recovery
/auth/link-problem                  MOUNTED  generic callback problem
/dashboard                          MOUNTED  private member dashboard and profile settings; noindex
/status/[code]                      MOUNTED  designed status/error route; not navigation

/llms.txt                           MOUNTED  machine-readable site summary
/robots.txt                         MOUNTED  crawler rules
/sitemap.xml                        MOUNTED  public sitemap
```

`/dashboard` is the canonical member account center. It requires a verified member session, is excluded from indexing, and exposes only the signed-in member’s profile settings and links to existing member spaces. Profile edits are limited to the member’s own display name and handle under the database’s own-row RLS policy.

---

## 3. `/news` — public publication

News is public on the canonical platform origin at `/news` and `/news/[slug]`. Do not link separate category, author, tag, search or video routes unless they are mounted. Articles remain free to read. Commenting and liking require sign-in and an in-context prompt with a validated same-origin return path; drafts and private previews are never exposed to public lists, search, metadata or sitemaps. Empty and unavailable states must remain distinct.

---

## 4. `/admin/*` — staff on the same origin

```
/admin/login                         MOUNTED  staff sign-in
/admin                               MOUNTED  protected dashboard
/admin/newsroom                      MOUNTED  newsroom list
/admin/newsroom/new                  MOUNTED  draft creation gate/form
/admin/newsroom/[id]                 MOUNTED  article editor
/admin/itan-ilu-mi/review             MOUNTED  History review
/admin/moderation/forum               MOUNTED  Forum moderation
/admin/business-review                MOUNTED  business review queue
/admin/business-review/moderation     MOUNTED  business moderation
/admin/orders                         MOUNTED  order queue
/admin/people                         MOUNTED  Who-is-Who administration
/admin/radio                          MOUNTED  Radio administration
/admin/tourism                        MOUNTED  Tourism review queue
/admin/[...unknown]                  MOUNTED  designed unknown-route response
```

The main app serves staff at same-origin `/admin/*`; staff sessions remain Secure, HttpOnly, SameSite=Lax host-only `__Host` cookies with no `Domain`. Every protected page/action checks the verified session and capability server-side; return-path hints never grant access. A mounted page is not proof that its end-to-end workflow is safe to operate: production schema drift and migration conflicts remain under review, and other unlisted admin destinations are not available.

---

## 5. Navigation

**Main header (public):** Link only to mounted destinations. The current product scope includes News, History, Forum, Map, Business Directory, Tourism, Radio and Who is Who, followed by member sign-in/account actions.

Rules for the header:

- A destination appears only when the route is built. No greyed-out links, no "coming soon".
- On mobile, the menu is a disclosure with a labelled trigger, `aria-expanded`, and escape to close.
- The current section is marked with `aria-current="page"`, not just colour.

**News header:** Do not imply separate categories, search or video pages until those routes are mounted.

**Admin navigation:** `/admin` · `/admin/newsroom` · `/admin/itan-ilu-mi/review` · `/admin/moderation/forum` · `/admin/business-review` · `/admin/business-review/moderation` · `/admin/orders` · `/admin/tourism` · `/admin/radio` · `/admin/people`. Navigation may be capability-filtered, but the route and action must still refuse unauthorized sessions.

**Footer (public):** About · Contact · Guidelines · Privacy · Terms · WhatsApp · social links that actually exist.

---

## 6. URL and linking rules

1. **Canonical once.** An article lives at `/news/[slug]` on the canonical `https://epelawa.vercel.app/` origin and nowhere else. The News list links internally to that route; there is no separate News host or duplicate copy.
2. **Slugs are reserved forever.** A published slug never gets reused after archive, or an old shared link silently shows different content.
3. **Slugs are lowercase, hyphenated, ASCII.** Diacritics transliterated in the slug, preserved in the title.
4. **No query-string pagination** for public content — use path segments where possible, cursor params where not.
5. **No private route in the sitemap, robots file, OG metadata, or structured data.** A draft must not be discoverable by any means other than a staff session.
6. **404, not 403,** for anything whose existence is itself private.
7. **Trailing-slash policy:** none. Pick no-slash, redirect the other with a 308.

---

## 7. SEO surface

| Route | Indexable | Structured data |
| --- | --- | --- |
| `/` | yes | `Organization` |
| `/news` | yes | Collection metadata only for published content |
| `/news/[slug]` | yes | `NewsArticle` only for a published article |
| `/who-is-who/[slug]` | conditional | `Person` only for approved public records |
| `/business-directory/[slug]` | conditional | LocalBusiness only for approved public listings |
| `/tourism/[slug]` | conditional | Only sourced, approved destination data |
| `/forum/*` | conditional | Public discussions only; no private/member details |
| `/login`, `/auth`, `/forgot-password`, `/auth/*` | no | — |
| `/business-directory/orders` | no | — |
| `/dashboard` | no | — |
| `/status/*` | no | — |
| `/admin/*` | no, `noindex` + `Disallow: /admin` | — |

---

## 8. Coverage check before any release

- Every route in this document either resolves or does not appear in navigation.
- No route is reachable only by guessing a slug.
- Every list route has an empty state that a real empty database would show.
- Member routes return through `/login?next=`; staff routes return through `/admin/login?next=` after server-side authorization.
- Every 404 is a designed 404, not a stack trace.
