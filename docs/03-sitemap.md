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
/contact                            MOUNTED  truthful contact state; no live intake form
/gallery                            MOUNTED  public gallery and honest empty state
/guidelines                         MOUNTED  community rules
/privacy                            MOUNTED  privacy notice
/terms                              MOUNTED  terms of use
/advertise                          MOUNTED  advertising information; no live intake form
/photo-credits                      MOUNTED  public photo/source/license credits

/news                               MOUNTED  public News list and GET search/filter controls
/news/[slug]                        MOUNTED  published article detail and gated comments/reports
/itan-ilu-mi                        MOUNTED  community history archive and private member contribution form
/tourism                            MOUNTED  approved tourism records and private member suggestion form
/tourism/[slug]                     MOUNTED  public destination detail
/map                                MOUNTED  manual map search and safe external directions
/business-directory                 MOUNTED  approved business directory and filters
/business-directory/[slug]          MOUNTED  public business detail and gated review/order request
/business-directory/submit           MOUNTED  verified-member listing submission
/business-directory/orders           MOUNTED  seller-side order requests; buyer-history contract unresolved
/forum                              MOUNTED  forum index
/forum/category/[slug]              MOUNTED  category thread list
/forum/thread/[slug]                MOUNTED  thread, replies, poll and report interactions
/forum/new                          MOUNTED  authenticated new-thread and optional poll form
/who-is-who                         MOUNTED  public people directory and filters
/who-is-who/[slug]                  MOUNTED  public person detail
/radio                              MOUNTED  user-started stream and programme/schedule/archive states

/login                              MOUNTED  member sign in
/auth                               MOUNTED  member signup
/forgot-password                    MOUNTED  request a password reset
/auth/new-password                  MOUNTED  set a new password
/auth/callback                      MOUNTED  Auth callback route handler
/auth/verify                        MOUNTED  branded email-code verification and resend; noindex
/auth/link-expired                  MOUNTED  expired-link recovery
/auth/link-problem                  MOUNTED  generic callback problem
/dashboard                          MOUNTED  private member dashboard (Home, Discover, Notifications, Saved, Profile); noindex
/api/news/view                      MOUNTED  POST-only, de-duplicated daily article view counter
/status/[code]                      MOUNTED  designed status/error route; not navigation

/llms.txt                           MOUNTED  machine-readable site summary
/robots.txt                         MOUNTED  crawler rules
/sitemap.xml                        MOUNTED  public sitemap
```

`/advertise` and `/photo-credits` are present in the source route tree and public navigation; their omission from earlier route lists was a documentation gap. Their indexing status must follow the actual explicit sitemap/robots configuration and any owner decision, not be inferred from being mounted. No contact, advertising, newsletter, or correction/takedown form should claim to collect or deliver data until its provider, privacy, retention, abuse-control, and end-to-end contracts are verified.

`/dashboard` is the canonical member account center. It requires a verified member session, is excluded from indexing, and exposes only the signed-in member’s profile settings, notifications and published-story views. Signing in lands on the dashboard directly; the completion screen remains only for accounts that still need a handle or profile bootstrap.

The member space has its own chrome rather than the public masthead: a midnight member top bar with the notification bell in place of the public search icon, a sign-out control at the top, and a four-dot menu that opens a branded modal menu. There is no public footer anywhere on the member space. Story covers show the real unique daily view count, the estimated read time and the visible comment count; the view counter is de-duplicated per browser key per UTC day and never exposes the key. Members can delete their own comments through a branded confirmation dialog (`comment_delete`), leaving a tombstone so replies remain readable.

Inactivity: member sessions end after **one week** without activity; staff sessions end after **ten hours**. The client guard warns briefly before signing out, and the server also refuses a stale activity stamp so a suspended tab cannot resume indefinitely.

---

## 3. `/news` — public publication

News is public on the canonical platform origin at `/news` and `/news/[slug]`. Do not link separate category, author, tag, search or video routes unless they are mounted. Articles remain free to read. Comment and report actions require their existing verified-member and server-side moderation gates; sharing/copy actions are not likes, and no like/reaction persistence route is mounted. Drafts and private previews are never exposed to public lists, search, metadata or sitemaps. Empty and unavailable states must remain distinct.

---

## 4. `/admin/*` — staff on the same origin

```
/admin/login                         MOUNTED  staff sign-in
/admin                               MOUNTED  protected dashboard
/admin/newsroom                      MOUNTED  newsroom list
/admin/newsroom/new                  MOUNTED  draft creation gate/form
/admin/newsroom/[id]                 MOUNTED  article editor
/admin/newsroom/settings             MOUNTED  category and byline settings
/admin/itan-ilu-mi/review             MOUNTED  History review
/admin/moderation/forum               MOUNTED  Forum moderation
/admin/business-review                MOUNTED  business review queue
/admin/business-review/moderation     MOUNTED  business moderation
/admin/orders                         MOUNTED  order queue; workflow readiness unverified
/admin/people                         MOUNTED  Who-is-Who administration
/admin/radio                          MOUNTED  Radio administration
/admin/tourism                        MOUNTED  Tourism review queue
/admin/roles                          MOUNTED  capability and role management
/admin/users                          MOUNTED  staff invitations and status
/admin/[...unknown]                  MOUNTED  designed unknown-route response
```

`/admin/error.tsx` and `/admin/not-found.tsx` are framework error/fallback surfaces, not additional routable URLs. A mirrored Admin app also exists in the workspace; it does not add separate public URLs to this same-origin route inventory. The main app serves staff at `/admin/*`; staff sessions remain Secure, HttpOnly, SameSite=Lax host-only `__Host` cookies with no `Domain`. Every protected page/action checks the verified session and capability server-side; return-path hints never grant access. A mounted page is not proof that its end-to-end workflow is safe to operate: production schema drift, provider readiness, and migration conflicts remain under review.

---

## 5. Navigation

**Main header (public):** Link only to mounted destinations. The current product scope includes News, History, Forum, Map, Business Directory, Tourism, Radio and Who is Who, followed by member sign-in/account actions.

Rules for the header:

- A destination appears only when the route is built. No greyed-out links, no "coming soon".
- On mobile, the existing accessible drawer uses a labelled trigger, `aria-expanded`, modal dialog semantics, keyboard focus handling, Escape and outside-close behavior.
- The member mobile bottom bar has exactly four tabs: **Home**, **Discover**, **Saved**, and **Profile**, linking to the matching `/dashboard?tab=…` views. Links use `aria-current` for the current page/section, remain keyboard/touch accessible, respect safe-area insets, and reserve page space so content is not obscured. It is hidden on focused sign-in, staff/Admin and system-status routes.
- Forum stays in the existing drawer under **Community**; do not add a fifth bottom tab. The Discover tab remains the four-tab destination and marks mounted discovery routes as the current section.
- The current section is marked with `aria-current`, not just colour.

**News header:** Do not imply separate category, search or video pages until those routes are mounted.

**Admin navigation:** `/admin` · `/admin/newsroom` · `/admin/newsroom/settings` · `/admin/itan-ilu-mi/review` · `/admin/moderation/forum` · `/admin/business-review` · `/admin/business-review/moderation` · `/admin/orders` · `/admin/tourism` · `/admin/radio` · `/admin/people` · `/admin/roles` · `/admin/users`. Navigation may be capability-filtered, but the route and action must still refuse unauthorized sessions.

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
| `/advertise`, `/photo-credits` | verify explicit sitemap/owner decision | — |
| `/login`, `/auth`, `/forgot-password`, `/auth/*` | no | — |
| `/business-directory/orders` | no | — |
| `/dashboard` | no | — |
| `/status/*` | no | — |
| `/admin/*` | no, `noindex` + `Disallow: /admin` | — |

---

## 8. Coverage check before any release

- Every page and route handler in both frontend app trees is inventoried here or explicitly identified as a framework/error surface; the mirrored Admin workspace does not create duplicate public URLs.
- Every route in this document either resolves or does not appear in navigation.
- No route is reachable only by guessing a slug.
- Every list route has an empty state that a real empty database would show.
- Member routes return through `/login?next=`; staff routes return through `/admin/login?next=` after server-side authorization.
- Every 404 is a designed 404, not a stack trace.
- News likes/reactions, History correction/takedown, buyer order history, contact/advertising/newsletter intake, payment checkout, and media uploads are not to be implied as working until their routes, provider/schema contracts, persistence, security controls and end-to-end journeys actually exist and pass.
