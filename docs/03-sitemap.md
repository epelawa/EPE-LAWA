# EPE LAWA — Sitemap and Information Architecture

**Document:** 03
**Status:** Active. Routes marked **LIVE** exist; **BUILT** means implemented in the current phase;
everything else is planned and must not be linked.

---

## 1. Current deployment

| Origin | Purpose | Session |
| --- | --- | --- |
| `https://epelawa.vercel.app/` | Public platform, News, member flows, and staff workspace | Member session; separate host-only staff cookie |

The current canonical production origin is `https://epelawa.vercel.app/`. The owner approved staff routes on this same origin at `/admin/*`; the staff session remains isolated in its Secure, HttpOnly, SameSite=Lax, Path=/ `__Host` cookie with no `Domain`. The older `epelawa.ng`, `news.epelawa.ng`, and `admin.epelawa.ng` host split is superseded and must not be implemented without a new owner decision.

---

## 2. `https://epelawa.vercel.app/` — public platform

```
/                                   LIVE   landing: purpose, five sections, honest state
/about                                     what EPE LAWA is, who runs it, contact
/contact                                   form + WhatsApp
/privacy                                   privacy notice
/terms                                     terms of use
/guidelines                                community guidelines (forum rules)

/news                               BUILT  public News list; articles use `/news/[slug]`

/who-is-who                                directory index, search + filter by office/community
/who-is-who/[slug]                         person profile: biography, offices, sources, badge

/radio                                     player, LIVE status, schedule
/radio/schedule                            full weekly schedule
/radio/archive                             episode list
/radio/archive/[slug]                      episode detail + playback

/forum                                     category index
/forum/[category]                          thread list
/forum/t/[slug]                            thread + replies
/forum/t/[slug]/new                        new reply (auth)
/forum/new                                 new thread (auth)

/business                                  directory index, filters
/business/[slug]                           business profile, hours, contact, reviews
/business/[slug]/review                    write a review (auth)
/business/new                              submit a business (auth)
/business/mine                             owner's listings (auth)

/shop                                      product browse across businesses
/shop/[business]/[product]                 product detail
/cart                                      cart (auth)
/checkout                                  checkout (auth)
/orders                                    order history (auth)
/orders/[id]                               order detail (auth)

/members/[handle]                          public member profile: posts, comments
/login                                     sign in
/signup                                    register
/verify                                    email verification landing
/reset                                     request reset
/reset/[token]                             set new password

/settings                                  member settings (auth)
/settings/notifications                    notification preferences (auth)
/settings/account                          delete account (auth)
```

---

## 3. `/news` — public publication

```
/                                   masthead, lead story, latest, categories
/latest                             reverse-chronological, paginated
/category/[slug]                    category feed
/author/[slug]                      author profile + their published work
/tag/[slug]                         tag feed
/search                             published-only search
/news/[slug]                        article, canonical, corrections, related
/about                              about the newsroom, editorial standards, corrections policy
/contact                            → main host contact
/videos                             curated video records
```

News is public on the canonical platform origin; articles use `/news/[slug]`. "Sign in to comment"
must return through the same-origin member login with a safe `/news/[slug]` next path. There is no
separate News host or cross-host member-session requirement in the current deployment.

---

## 4. `/admin/*` — staff on the same origin

```
/admin/login                         staff sign in (BUILT)
/admin                               dashboard: real counts, real queues (BUILT)
/admin/newsroom                      all articles (BUILT)
/admin/newsroom/new                  create draft (BUILT)
/admin/newsroom/[id]                 edit + preview + version history (BUILT)
/admin/itan-ilu-mi/review             community-history review queue (BUILT)
/admin/moderation/forum               forum moderation queue (BUILT)
/admin/business-review                business submissions and verification (BUILT)
/admin/business-review/moderation     business moderation (BUILT)
/admin/orders                         order queue (BUILT)
/admin/people                         Who-is-Who records (BUILT)
/admin/radio                          stream config and programmes (BUILT)
/admin/tourism                        tourism review queue (BUILT)

/admin/newsroom/review                review queue (editor)
/admin/newsroom/publish               approved queue (publisher)
/admin/newsroom/categories            categories
/admin/newsroom/tags                  tags
/admin/newsroom/authors               author records

/admin/media                         media library
/admin/media/upload                  authorised upload

/admin/people/new                    create
/admin/people/[id]                   edit, sources, verification

/admin/radio/schedule                schedule editor
/admin/radio/episodes                episode management

/admin/moderation                    open reports (comments + forum)
/admin/moderation/actions            moderation history
/admin/forum                         forum categories
/admin/businesses                   business submissions + verification
/admin/shop/orders                  order queue
/admin/shop/products                product moderation

/admin/staff                         staff accounts and capability grants
/admin/audit                         audit log
```

Only routes marked **BUILT** are currently mounted. Other staff destinations remain planned and
must not be linked until implemented. Protected pages and server actions enforce staff sessions and
capabilities; hiding navigation items is not an authorization boundary.

---

## 5. Navigation

**Main header (public):** News · Who is Who · Radio · Forum · Businesses · Shop — then Sign in / account.

Rules for the header:

- A destination appears only when the route is built. No greyed-out links, no "coming soon".
- On mobile, the menu is a disclosure with a labelled trigger, `aria-expanded`, and escape to close.
- The current section is marked with `aria-current="page"`, not just colour.

**News header:** sections (Politics, Sports, Culture, Education, Business, Community) · Latest · Search · Videos.

**Admin navigation:** `/admin` · `/admin/newsroom` · `/admin/itan-ilu-mi/review` · `/admin/moderation/forum` · `/admin/business-review` · `/admin/business-review/moderation` · `/admin/orders` · `/admin/tourism` · `/admin/radio` · `/admin/people`. Sections collapse when the capability is absent — but the route still refuses, because navigation is not the boundary.

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
| `/news/[slug]` | yes | `NewsArticle` with `datePublished`, `dateModified`, `author`, `publisher` |
| `/category`, `/author`, `/tag` | yes | `CollectionPage` |
| `/who-is-who/[slug]` | yes | `Person` |
| `/business/[slug]` | yes | `LocalBusiness` |
| `/shop/[business]/[product]` | yes | `Product` with `offers` |
| `/forum/*` | yes, `nofollow` on outbound | `DiscussionForumPosting` |
| `/members/*` | no | — |
| `/cart`, `/checkout`, `/orders`, `/settings` | no | — |
| `/admin/*` | no, `noindex` + `Disallow: /admin` | — |

---

## 8. Coverage check before any release

- Every route in this document either resolves or does not appear in navigation.
- No route is reachable only by guessing a slug.
- Every list route has an empty state that a real empty database would show.
- Member routes return through `/login?next=`; staff routes return through `/admin/login?next=` after server-side authorization.
- Every 404 is a designed 404, not a stack trace.
