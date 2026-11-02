# EPE LAWA — Sitemap and Information Architecture

**Document:** 03 — Workstream 0.3\
**Status:** Workstream 0.3 approved by the owner on 2 November 2026; routes and navigation remain subject to later detailed design and unresolved dependencies.\
**Prepared:** 2 November 2026\
**Inputs:** [Approved product requirements](01-product-requirements.md) and [approved user journeys](02-user-journeys.md).\
**Checkpoint:** Workstream 0.4 page specifications and design system are open for review. No production code is authorised until all of Phase 0 has been reviewed and approved.

## 1. Purpose, notation and boundaries

This sitemap specifies proposed information organisation across three connected applications. It preserves the approved Phase 1 scope while mapping the long-term vision without implying that future features already exist. Domain names are proposed, not verified; ownership, DNS and deployment remain open. Routes are design proposals, not evidence of deployed sites or technical commitments.

- **P1** — planned first-release experience, subject to the Phase 0 gate and applicable content/integration prerequisites.
- **P1 conditional** — within first-release scope but shown only when its information or capability is real and available. Conditional visibility does not waive the owner's requirement that live radio work at launch.
- **P2–P5** — later phase; not available as an active first-release service.
- **Pending** — concept or route needs a distinct decision before inclusion; not an active Phase 1 destination.
- `[slug]` represents a readable content identifier, not a literal public page. Path names and grouping remain proposed.

A section may appear as an honest informational preview only when approved content exists and its wording does not imply a future service is operational. Suppress links that lead solely to unimplemented features. Empty-state and error pages must be truthful, accessible and free of fabricated stories, people or statistics.

## 2. Application relationship

```text
                   Public visitor (no login required)
                         /                \
                        v                  v
       Main website: epelawa.ng  <---->  News: news.epelawa.ng
       Identity, contact, media          Publication, article discovery
       Radio and programme archive       Published articles and authors
                        \                  /
                         \ approved content /
                          v                v
                 Shared content services (proposed)
                              ^
                              |
             Admin: admin.epelawa.ng — authorised staff only
             Editorial, media, radio, settings, staff, audit
```

The diagram describes content relationships, not a final deployment or authentication architecture. Editorial and media content may be managed centrally; only approved published material is exposed publicly. Public-site navigation does not grant admin access. Cross-subdomain sessions, rendering, APIs and private preview security are decisions for architecture/security workstreams.

## 3. Main website — Phase 1

Proposed domain: `epelawa.ng`. Its purpose is to introduce the organisation and guide users to useful, available public experiences, not to duplicate the newspaper.

```text
/                                  P1  Homepage
├── about/                         P1  Organisation, mission, purpose
├── team/                          P1 conditional  Approved team information
├── contact/                       P1  General contact form + WhatsApp
├── media/                         P1  Listen and watch entry
│   ├── radio/                     P1  Live player and available programme information
│   ├── programmes/                P1  Published programme list and information
│   ├── videos/                    P1  Curated video archive
│   ├── archive/                   P1  Browse approved media/recordings
│   └── episodes/
│       └── [slug]/                P1  Published episode detail, where available
├── news/                          P1  Proposed redirect/link to news.epelawa.ng/
├── privacy/                       P1  Approved privacy policy
└── terms/                         P1  Approved terms of use
```

### Page roles and relationships

| Destination | Purpose / incoming relationships | Content and visibility conditions |
| --- | --- | --- |
| `/` | Platform entry; links to news, radio, media, about and contact. | Show real published highlights; no fake data. Suppress unavailable future features. Radio must work at launch, with honest outage states thereafter. |
| `/about/` | Organisation, mission, vision, purpose and approved background; link to contact and team. | Owner-approved copy. |
| `/team/` | Approved team information; reached from About. | Show only when approved information exists; do not invent staff or roles. |
| `/contact/` | General contact form and WhatsApp; linked from both public sites and footer. | Working delivery and privacy notice, approved WhatsApp number, recipient, handling and abuse controls required. Not Speak Up Epe or an emergency channel. |
| `/media/` | Common entry to radio, programmes, videos and archive. | Curated and approved media only; truthful empty/error states. |
| `/media/radio/` | Direct access to play/pause and available station/programme information. | Official direct stream, format and permission must be verified and tested for launch; a social URL is not a stream. Never assert LIVE without verifiable status. |
| `/media/programmes/` | Programme list and information; link to related episodes where available. | No fabricated schedules or programmes. Exact programme detail pattern, if required, remains a page-specification decision. |
| `/media/videos/` | Curated YouTube and other permitted video records. | Lazy permitted embeds or external links; display honest unavailable states. |
| `/media/archive/` | Unified discovery of approved recorded media. | Can link to video listings and episode details without creating duplicate content pages. |
| `/media/episodes/[slug]/` | Detail for one published episode, with playback/link and available metadata. | Expose only approved published material; captions/transcripts only where available. |
| `/news/` | Optional main-domain bridge to the independent publication. | Prefer a straightforward redirect to the news homepage; exact redirect vs direct navigation is an IA decision, not proof of deployment. |
| `/privacy/`, `/terms/` | Legal information accessible from public footers and form. | Owner and appropriate legal review required before launch. |

**Not-found handling:** Unmatched or unavailable paths must return an appropriate not-found experience and status; `/not-found/` is not assumed to be an ordinary indexable destination. Archived or unpublished content handling must be specified in page and editorial policy work.

## 4. News publication — Phase 1

Proposed domain: `news.epelawa.ng`. A distinct editorial reading and discovery experience, not merely a corporate-site section.

```text
/                                  P1  Publication homepage
├── latest/                        P1  Latest published articles
├── trending/                      P1 conditional  Real-data ranking only
├── search/                        P1  Search published content
├── category/
│   └── [slug]/                    P1  Published articles by category
├── article/
│   └── [slug]/                    P1  Published article
├── author/
│   └── [slug]/                    P1  Author profile and published articles
├── tag/
│   └── [slug]/                    P1  Published articles by tag
├── videos/                        P1  Link/entry to approved media archive
├── about/                         P1  Publication / editorial information
└── contact/                       P1  Link to main site's general contact
```

### Discovery and page relationships

- The news homepage links to a real featured story, latest stories, categories, search and approved video coverage. Show a breaking banner only for an actual designated breaking story.
- Category, author and tag pages list only published content; article pages link back to relevant categories, author, tags and related published articles. Pagination and search zero-result states must be understandable.
- Article pages expose appropriate author, date, image credit, sharing, corrections and related coverage; private review notes, drafts, previous internal versions and unpublished metadata remain inaccessible.
- `/trending/` must not be linked or presented as an active ranking until trustworthy engagement data and a privacy-conscious method are approved and available; never manufacture a ranking or count.
- `/videos/` is a news-side discovery entry linking to the main media archive or genuinely curated relevant video coverage. Avoid publishing duplicate canonical versions of one item merely to fill a route. Exact presentation is a page-specification decision.
- News `/contact/` links to the single general form and WhatsApp experience on the main site; the news About page may link to main About. Privacy and terms links point to the main site's approved policies unless later legal review decides otherwise. This does not introduce a story-submission system.
- The long-term brief proposes `/opinion/` and `/submit-story/`; neither is an approved distinct Phase 1 workflow. Opinion categorisation and public story intake remain **pending**, not active destinations. A general contact form does not imply confidential or formal story intake.

### Initial editorial categories

Category labels are supplied by the brief and editable by authorised administrators; category slugs are proposed and require later content validation. An **Events** news category is not an event calendar.

| Label | Proposed category slug |
| --- | --- |
| Politics & Governance | `politics-governance` |
| Community Development | `community-development` |
| Security | `security` |
| Education | `education` |
| Business & Economy | `business-economy` |
| Culture & Tradition | `culture-tradition` |
| Environment | `environment` |
| Infrastructure | `infrastructure` |
| Events | `events` |
| General News | `general-news` |

## 5. Admin dashboard — Phase 1

Proposed domain: `admin.epelawa.ng`. All destinations below other than the login experience require authenticated and authorised staff. Navigation alone is not a security control; route handlers, data access and private previews must enforce permissions independently. The owner and developer are responsible, but the role split and detailed permission matrix remain unresolved.

```text
/                                  P1  Proposed entry: login or dashboard by session
├── login/                         P1  Staff sign-in and recovery entry
├── dashboard/                     P1  Real operational overview
├── newsroom/                      P1  Newsroom entry
│   ├── articles/                  P1  Article list and management
│   │   └── [id]/                  P1  Article edit, status, history and private preview entry
│   ├── create/                    P1  New draft
│   ├── drafts/                    P1  Draft queue
│   ├── review/                    P1  Review queue
│   ├── categories/                P1  Category management
│   ├── tags/                      P1  Tag management
│   └── authors/                   P1  Author management
├── media/                         P1  Media management entry
│   ├── library/                   P1  Permitted asset management
│   ├── videos/                    P1  Curated video records
│   ├── programmes/                P1  Programme records
│   └── episodes/                  P1  Episode records
├── radio/                         P1  Authorised radio settings
├── staff/                         P1  Staff access administration
├── permissions/                   P1  Assigned permissions administration
├── settings/                      P1  Website settings
└── audit-logs/                    P1  Restricted operational audit
```

- Overview counts and activity must come from real records. Staff can navigate draft → review → approval → publishing according to their actual permissions; return-for-revision, corrections and reapproval rules remain open.
- `/newsroom/articles/[id]/` is a proposed management route; `[id]` is a private identifier, not a public article slug. Preview is an authorised operation, not a publicly indexable route; its mechanism and expiry must be specified in security/architecture work.
- Media records feed the main media experiences and, where appropriate, news video discovery; editing a record does not automatically publish unapproved information.
- Staff, permissions, settings and audit access must be restricted separately. Login recovery and access-revocation flows require later detailed design.
- The long-term `/users/` concept is not a public-account manager in Phase 1; staff operations use `/staff/` and `/permissions/` here. Future public users need a separately approved model.
- Do not show community, events, governance, heritage, business or diaspora admin modules as active in Phase 1.

## 6. Navigation and cross-site linking

### Main public navigation — proposed

- **Desktop:** Home; Listen & Watch → `/media/` (with Radio, Programmes and Videos/Archive); News → news homepage; About → `/about/`; Contact → `/contact/`.
- **Mobile:** Accessible menu with the same available destinations, clear labels and a visible close control; avoid a shrunken desktop navigation. A radio shortcut may be provided if it does not obscure content or controls.
- **Homepage:** Suggested order remains navigation, hero, radio, real news highlights, media, introduction, then relevant approved informational previews and footer. Community, governance, discovery and business areas are not active service links until their phases are approved and operational. Newsletter entry is not active in Phase 1.
- **Footer:** About, contact, media, news, approved social links, privacy, terms and copyright. Only link to team if approved content exists. No public admin-navigation requirement is assumed.

### News public navigation — proposed

- Publication home; Latest; categories; Search; Videos; About; Contact. Trending appears only when real and methodologically approved.
- Category navigation must remain usable as labels change; provide keyboard-operable menus and mobile access. Article-level links connect author, category, tags and related coverage.
- Clearly identify movement between the news publication and main site; contact and policy links use the main site as described above. Do not duplicate forms or imply a separate newsroom intake service.

### Admin navigation — proposed

- Overview; Newsroom (articles, drafts, review, categories, tags, authors); Media (library, videos, programmes, episodes); Radio; Settings; Staff & Permissions; Audit Logs.
- Display relevant navigation according to permissions, but independently enforce permissions for every request. Distinguish published content, drafts and private previews in the interface. Avoid links to unimplemented future modules.

### Canonical content and safe linking

- Articles have a single public canonical page on the news domain; homepage highlights on the main site link there instead of duplicating the complete article. Only approved published content appears in public search, metadata, listings and indexes.
- Media detail is proposed on the main site; news-side video references link to the canonical published record or supported external source. Final canonical strategy belongs to technical/SEO design.
- Link from public pages only to approved destinations and official social URLs supplied by the owner; channel ownership and embed permissions still require confirmation. Private links, tokens, drafts and internal notes must not leak into URLs, public metadata, logs or cross-site navigation. Session and redirect handling require a separate security assessment.
- Public navigation, menus and form entry points must support keyboard use, visible focus and screen readers. Loading, empty, offline, unavailable and not-found states are addressed in page specifications and tests.

## 7. Long-term sitemap — future phases only

The following paths represent the owner's long-term route vision. They are **not** first-release active destinations and are not final route or implementation decisions. Phase assignment follows the approved baseline; each phase requires its own approval and operational safeguards.

### Main site — Phase 2: community and civic participation

```text
/community/
├── speak-up/                      P2  Secure, non-emergency community submissions
├── discussions/                   P2  Moderated forum
│   └── [slug]/                    P2  Discussion detail
├── events/                        P2  Community events and town halls
└── guidelines/                    P2  Community guidelines
```

Speak Up is separate from general contact. Its private reports, consent, reference numbers, access controls, retention and escalation need separate approval. A news Events category is not the event calendar. Forum and public accounts require a moderation model.

### Main site — Phase 3: governance and accountability

```text
/governance/
├── who-is-who/                    P3  Reviewed people directory
├── officials/
│   └── [slug]/                    P3  Approved profile
└── development-tracker/
    └── projects/
        └── [slug]/                P3  Evidence-supported project record
```

The directory, project statuses, source records, verification dates and update histories require editorial review and evidence; no invented records or unsupported allegations.

### Main site — Phase 4: heritage, tourism and local businesses

```text
/discover/
├── history/                       P4  Attributed heritage
├── communities/                   P4  Community profiles
├── culture/                       P4  Cultural material
├── tourism/                       P4  Tourism discovery
└── places/
    └── [slug]/                    P4  Approved place detail
/businesses/
├── categories/                    P4  Directory categories
├── category/
│   └── [slug]/                    P4  Category listing
└── [slug]/                        P4  Reviewed business listing
```

Verify historical material with credible local sources and preserve Eko Epe and Ijebu Epe distinctions. Business discovery and contact do not imply e-commerce, payments, inventory or checkout. Further community-profile, heritage-story or tourism detail paths are to be designed when the phase is approved.

### Main site — Phase 5: diaspora and expansion

```text
/diaspora/
└── stay-connected/                P5  Dedicated diaspora experience
```

Newsletter subscription, email confirmation, unsubscribe, campaigns, consent and advanced archive discovery belong to Phase 5; their exact routes and operating model are undecided. General international access to published Phase 1 news and media is already in scope and does not require a dedicated diaspora page.

### Admin — future navigation

| Phase | Proposed admin areas | Important condition |
| --- | --- | --- |
| P2 | `/community/submissions/`, `/community/discussions/`, `/community/moderation/`, `/events/`, and a future public-user management area if approved. | Confidential submissions require isolated access, audit and safeguarding; forum needs moderation. |
| P3 | `/governance/` for people, projects and sources. | Evidence, verification and review controls. |
| P4 | `/heritage/`, `/businesses/` and community/tourism management within an approved structure. | Attribution, local review, listing approval. |
| P5 | `/diaspora/` and newsletter operations in an approved structure. | Consent, confirmation, unsubscribe, delivery and retention controls. |

These are conceptual navigation groupings; detailed future child routes, permissions, schema and operations remain unapproved. A mobile application and marketplace are outside the current website scope.

## 8. Coverage, dependencies and review

| Journey | Proposed Phase 1 entry and destination | Notes |
| --- | --- | --- |
| J01 first-time visitor | Main `/` → About, News or Media | Honest available destinations only. |
| J02 resident contact | News category/article → main `/contact/` | Form and WhatsApp details, privacy and delivery still open. |
| J03 diaspora catch-up | Main or news `/` → article or media | General international access now; dedicated P5 experience later. |
| J04 news discovery | News `/`, `/latest/`, `/search/` → `/article/[slug]/` | Published content only, category/author/tag links. |
| J05 radio | Main `/` or `/media/radio/` | Verified stream and permission required at launch; outage fallback after launch. |
| J06 video | Main `/media/videos/` or News `/videos/` → approved record | Embed rights and availability unverified. |
| J07–J08 newsroom | Admin `/login/` → newsroom draft/review/article | Backend authorisation and private preview required. |
| J09 administrator | Admin `/dashboard/` → media, radio, staff, settings, audit | Exact permissions and responsibility split remain open. |
| J10–J16 future journeys | Phase 2–5 groupings in section 7 | Not available in Phase 1. |

### Decisions and blockers

1. Owner approved the Phase 1 sitemap and navigation, including a single main-site contact page and the news-side video link. Further changes require review; approval of IA is not implementation approval.
2. The owner must supply the official direct radio stream, format and embedding permission; validate the station relationship and actual playback before launch. A missing working stream is a launch blocker.
3. Supply the WhatsApp number and determine form recipient, fields, privacy and handling. Confirm domain ownership/DNS and authorised social accounts; none is assumed verified here.
4. Editorial responsibilities, role matrix, approved content and legal pages require resolution in relevant workstreams. User research is planned, not performed; its findings may require a reviewed IA change.

**Workstream 0.3 approval record:** Owner approved on 2 November 2026, with no changes requested. Proceed to Workstream 0.4 (page specifications and design system). Radio, contact, domain and editorial dependencies remain open; the full Phase 0 gate still applies before any production coding.
