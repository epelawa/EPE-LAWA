# EPE LAWA — Product Requirements

**Current release:** All eight client-approved web sections (3.1–3.8), plus cross-cutting member authentication, staff access, article publishing, admin analytics and transactional email templates.

**Authority:** The client brief’s sections 3.1–3.8 and the owner’s latest direction. This is a web-first release; native mobile apps alone are deferred. A route or schema existing in the repository does not mean its feature is in scope or complete.

**Evidence status:** These are requirements, not user-research findings. No invented local content, usage metrics, testimonials or business records may be used to fill the interface.

---

## 1. Product

EPE LAWA is a community, news, heritage, civic-discussion and commerce platform for Epe Division, Lagos State. It serves indigenes at home and abroad, residents, visitors, business owners, young people and people seeking reliable public information.

The website must work well on affordable Android phones, metered connections and intermittent networks. English is the release language. Only native mobile apps are deferred; section 5 future enhancements remain on the roadmap.

## 2. Trending News

The news section provides timely, sourced reporting about Epe Division.

| Requirement | Priority |
| --- | --- |
| Staff can create, save, preview, update and publish articles through the protected newsroom. | Must |
| Organize published articles by categories and tags; allow search over published content only. | Must |
| Provide shareable canonical article URLs and useful article metadata. | Must |
| Support comments, reporting and moderation when member authentication is enabled. | Must |
| Show a breaking-news banner only for a specifically flagged article and only until its recorded expiry. | Must |
| Send web notifications only after member opt-in and verified delivery configuration. | Must; provider-gated |
| Cache previously read news for offline reading where the implementation can do so safely. | Must; implementation pending |
| Show a trending list only when genuine, privacy-conscious read signals exist; otherwise omit it or show an honest empty state. | Conditional |

Published copy must not change silently. Drafts and private previews must not appear in public lists, search, metadata or sitemaps. A published correction is a new, auditable version. Every article body is sanitized before display. No fake view counts, trending labels, breaking claims or article content.

A verified staff member with the `article.publish` capability may publish the current draft directly. A second reviewer is not mandatory. The database must reject stale revisions, preserve published versions and write an audit event for each transition.

## 3. Itan Ilu Mi — My Community History

This section preserves community and family history for future generations.

| Requirement | Priority |
| --- | --- |
| Organize records by community and other client-approved categories. | Must |
| Support house/family lineage records with text and rights-cleared image/video attachments, stored privately until review. | Must; secure media storage pending |
| Let readers search by family name or community using published records only. | Must |
| Provide a contribution path for elders, historians and other community members. | Must |
| Keep submissions private until a named reviewer checks provenance, consent and publication rights. | Must |
| Provide correction, dispute and removal handling that preserves an audit trail. | Must |

A contributor’s consent and the provenance of a claim must be recorded before publication. Sensitive family information is not exposed by default. Do not infer or fabricate lineage, names, dates, places or cultural facts. If there are no approved records, show an honest empty state rather than sample history.

## 4. Chat Forum — Digital Village Square

The forum supports member discussions about community life and development.

| Requirement | Priority |
| --- | --- |
| Members can register, maintain a basic profile and participate in topic-based discussions. | Must |
| Support threads, replies, and authenticated poll creation/voting without exposing individual ballots. | Must |
| Let members report posts and read community guidelines before posting. | Must |
| Provide moderators a reasoned, auditable workflow to hide or restore content, lock discussions and handle abusive accounts. | Must |
| Provide public-office verification badges from a current, recorded human verification; never display an unverified badge. | Must; show only when verified |

Posting and voting require an authenticated member. Rate limits and bans are enforced at the server and database, not only in the interface. Deleted or hidden posts use clear tombstones when needed to preserve discussion context. No anonymous posting, invented activity or fabricated member profiles.

## 5. Map & Navigation

The map helps residents, visitors and delivery workers find streets, landmarks and businesses in Epe Division.

| Requirement | Priority |
| --- | --- |
| Support searches for streets, landmarks and published businesses. | Must |
| Offer route/directions handoff through Google Maps when a destination is selected. | Must |
| Use the Google Maps API for search and route suggestions once its project key and integration are configured and verified. | Must; provider-gated |
| Request device location only after the user explicitly chooses a location-based action. | Must |
| Provide a manual search fallback and clearly label external map links. | Must |
| Offline map access. | Deferred optional phase |

Never invent a map point, route, landmark or business location. Do not publish private residential or delivery addresses as public destinations. The current release must not claim a live Google Maps API/Places integration unless it is configured and verified; a safe outbound-directions handoff is a valid fallback.

## 6. Epe Business Directory & Marketplace

This section helps people find local businesses and browse or request products and services.

| Requirement | Priority |
| --- | --- |
| Publish business profiles only after review; support approved categories, area, contact and other owner-approved public fields. | Must |
| Allow owners to submit and update their own listings without publishing them directly. | Must |
| Support product listings with real descriptions, prices and availability. | Must |
| Support order requests and delivery/pickup details only through a protected, auditable flow. | Must |
| Support ratings and reviews from authenticated members, with reporting/moderation. | Must |
| Support paid or featured placement only through a real, date-bounded record with a clear sponsor label. | Must; payment/provider-gated |
| Process real payments only after a provider is configured and its signature, idempotency, amount and reconciliation path are tested in a private sandbox. | Release gate |

Business verification requires a recorded human check. Never invent businesses, reviews, products, prices, stock or endorsements. Delivery addresses remain private and visible only to the people who need them. Server-side code recomputes totals; the browser cannot set a paid state.

## 7. Historical Sites & Tourism
Provide a browsable guide to approved historical sites and tourism destinations in Epe, with sourced descriptions, visitor context and location/visit details only when verified. Do not invent sites, history, opening hours, prices, access or coordinates. Public records require editorial review and rights-cleared media. Tourist directions use the Map & Navigation safe handoff unless an integration is verified.

## 8. EPE LAWA Radio
Provide the radio listening experience, programme/schedule information and any archive content supported by approved records. Show honest stream availability and failure states; do not claim a live stream until the official stream URL, permission, compatibility and playback are verified. No fabricated schedule, episode or listenership. Staff management is capability-gated and audited.

## 9. Who is Who in Epe
Provide a searchable directory of public-interest people and community leaders using approved, sourced profiles and carefully limited public fields. Verify identity/role through recorded human review before badges or official-role claims. Obtain publication consent where applicable; provide correction/removal handling. Never invent people, titles, contact details or endorsements.

## 10. Cross-cutting identity and administration

- Member registration, email verification, sign-in, sign-out and password recovery use secure server-verified sessions. Account status and private data are not exposed to anonymous visitors.
- Staff identity is separate from member identity. Every staff route and action checks a verified session and an explicit capability on the server and in database policy.
- Admin analytics display only real query results; an unavailable query is not shown as zero.
- The newsroom supports private drafts, revision-aware publishing and an audit trail. Direct publishing by verified, authorized staff does not require a second reviewer.
- Branded verification and recovery email templates must use an authenticated sender domain before delivery is described as operational.
- No production test articles, orders or payments. Any requested public test article requires prior approval of its exact payload; ordinary publishing tests use private isolated data.

## 11. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Accessibility | Aim for WCAG 2.2 AA: semantic headings, keyboard access, visible focus, labelled controls, announced errors and reduced-motion support. |
| Responsive layout | Verify at 320, 375, 768, 1024 and 1440 CSS px without horizontal overflow; touch targets are at least 44×44 px. |
| Performance | Keep the landing page and first contentful view light for metered mobile connections; size and lazy-load below-the-fold images. |
| Privacy and security | Use least-privilege access, RLS, short-lived private sessions and minimal personal-data collection. |
| Resilience | Distinguish loading, empty, error and denied states; preserve safe fallbacks when external services are unavailable. |
| Content integrity | Use approved, sourced records only. Keep private contributions and evidence private until authorized publication. |
| SEO | Use canonical URLs and structured data for published content only; exclude drafts and private submissions. |

## 12. Acceptance gates

1. All eight module routes are discoverable from the public shell and work at the required viewport sizes.
2. Historical Sites & Tourism, EPE LAWA Radio and Who is Who in Epe show only approved, sourced information and truthful empty/unavailable states.
3. Anonymous users cannot reach drafts, private history submissions, member-only actions or staff routes.
4. Member authentication and password recovery behave correctly without revealing whether an email is registered.
5. Verified staff can save a private article draft and publish it directly; stale revisions are rejected and each transition is audited.
6. Forum permissions, reports, moderation and bans are tested with private isolated records.
7. History submissions remain private until their source, consent and publication state are approved.
8. Map search and directions have a safe manual fallback, do not request GPS by default and do not invent locations.
9. Business and product lists use only real approved records; order and payment paths remain disabled or clearly unavailable until their provider gates pass.
10. Local typecheck, production builds, unit/schema tests and Playwright pass before release. Production checks remain read-only.

---

## 13. Deferred work

Native mobile applications alone are deferred from the current web build. Preserve section 5 future enhancements in the full roadmap: event ticketing, emergency contacts, scholarship/job board, e-learning, English/Yoruba support and an AI-powered local assistant. These remain future enhancements rather than removing them from the roadmap. Offline maps remain a provider/phase-dependent detail, not a reason to narrow module scope.
