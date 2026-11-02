# EPE LAWA — Sitemap and Information Architecture

**Document:** 03
**Status:** Active. Routes marked **LIVE** exist; **BUILT** means implemented in the current phase;
everything else is planned and must not be linked.

---

## 1. Three hosts

| Host | Purpose | Session |
| --- | --- | --- |
| `epelawa.ng` | The platform: landing, Who is Who, radio, forum, businesses, marketplace, member area | Member cookie |
| `news.epelawa.ng` | The publication: articles, categories, authors, search | Member identity via the main host, no separate login |
| `admin.epelawa.ng` | Staff and moderator operations | Staff cookie only |

Cross-host links use absolute canonical URLs. The three do not share a cookie.

---

## 2. `epelawa.ng` — public platform

```
/                                   LIVE   landing: purpose, five sections, honest state
/about                                     what EPE LAWA is, who runs it, contact
/contact                                   form + WhatsApp
/privacy                                   privacy notice
/terms                                     terms of use
/guidelines                                community guidelines (forum rules)

/news                               LINK   → news.epelawa.ng (canonical redirect, not a copy)

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

## 3. `news.epelawa.ng` — publication

```
/                                   masthead, lead story, latest, categories
/latest                             reverse-chronological, paginated
/category/[slug]                    category feed
/author/[slug]                      author profile + their published work
/tag/[slug]                         tag feed
/search                             published-only search
/article/[slug]                     article, canonical, corrections, related
/about                              about the newsroom, editorial standards, corrections policy
/contact                            → main host contact
/videos                             curated video records
```

**No login on this host.** "Sign in to comment" links to `epelawa.ng/login?next=<canonical article>`.
The comment thread on an article is rendered on the news host but authenticated against the member
session on the main host via a server-to-server check — or, more simply, comments live on the news
host with the member cookie scoped to `.epelawa.ng` minus the admin host. **Decision required before
Phase 5.** The second option is simpler and is the working assumption.

---

## 4. `admin.epelawa.ng` — staff

```
/login                              staff sign in
/                                   dashboard: real counts, real queues
/newsroom                           all articles
/newsroom/new                       create draft
/newsroom/[id]                      edit + preview + version history
/newsroom/review                    review queue (editor)
/newsroom/publish                   approved queue (publisher)
/newsroom/categories                categories
/newsroom/tags                      tags
/newsroom/authors                   author records

/media                              media library
/media/upload                       authorised upload

/people                             Who is Who records
/people/new                         create
/people/[id]                        edit, sources, verification

/radio                              stream config, status, programmes
/radio/schedule                     schedule editor
/radio/episodes                     episode management

/moderation                         open reports (comments + forum)
/moderation/actions                 moderation history
/forum                              forum categories
/businesses                         business submissions + verification
/shop/orders                        order queue
/shop/products                      product moderation

/staff                              staff accounts and capability grants
/audit                              audit log
```

---

## 5. Navigation

**Main header (public):** News · Who is Who · Radio · Forum · Businesses · Shop — then Sign in / account.

Rules for the header:

- A destination appears only when the route is built. No greyed-out links, no "coming soon".
- On mobile, the menu is a disclosure with a labelled trigger, `aria-expanded`, and escape to close.
- The current section is marked with `aria-current="page"`, not just colour.

**News header:** sections (Politics, Sports, Culture, Education, Business, Community) · Latest · Search · Videos.

**Admin sidebar:** Dashboard · Newsroom · Media · People · Radio · Moderation · Businesses · Orders · Staff · Audit. Sections collapse when the capability is absent — but the route still refuses, because the sidebar is not the boundary.

**Footer (public):** About · Contact · Guidelines · Privacy · Terms · WhatsApp · social links that actually exist.

---

## 6. URL and linking rules

1. **Canonical once.** An article lives at `news.epelawa.ng/article/[slug]` and nowhere else. The main site shows a headline and links out; it never renders a second copy.
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
| `/article/[slug]` | yes | `NewsArticle` with `datePublished`, `dateModified`, `author`, `publisher` |
| `/category`, `/author`, `/tag` | yes | `CollectionPage` |
| `/who-is-who/[slug]` | yes | `Person` |
| `/business/[slug]` | yes | `LocalBusiness` |
| `/shop/[business]/[product]` | yes | `Product` with `offers` |
| `/forum/*` | yes, `nofollow` on outbound | `DiscussionForumPosting` |
| `/members/*` | no | — |
| `/cart`, `/checkout`, `/orders`, `/settings` | no | — |
| admin host | no, `noindex` + `Disallow: /` | — |

---

## 8. Coverage check before any release

- Every route in this document either resolves or does not appear in navigation.
- No route is reachable only by guessing a slug.
- Every list route has an empty state that a real empty database would show.
- Every auth-gated route redirects to `/login?next=` and returns to the exact page after sign in.
- Every 404 is a designed 404, not a stack trace.
