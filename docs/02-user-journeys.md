# EPE LAWA — User Journeys

**Status:** Active hypotheses from the client brief, not research findings. No interviews, usability sessions or analytics are claimed.

## Actors

Visitors and readers need useful, trustworthy public information; members need secure participation; community contributors need privacy and consent; business owners need accurate listings; staff need bounded capabilities and an audit trail.

## Public journeys

### J1 — Discover the platform
A visitor opens the public site, understands its purpose and navigates to any of the eight in-scope modules: Trending News, Itan Ilu Mi / My Community History, Chat Forum / Digital Village Square, Map & Navigation, or Epe Business Directory & Marketplace. Empty sections are represented honestly, not with invented content or fabricated “coming soon” claims.

### J2 — Read news
A reader finds a published story through latest/category/search, opens its canonical URL, sees byline/date and any correction, and shares it. Drafts and private previews never appear in public lists, search or metadata.

### J3 — Contribute community history
A contributor submits a history item with provenance and consent. It remains private until an authorized reviewer checks sources, rights and privacy. A reader sees only approved published records and can request correction or takedown.

### J4 — Join the Digital Village Square
A member signs up, verifies email and logs in, reads guidelines, participates in a discussion and reports harmful content. Moderation is reasoned and audited; member email and private details are not public.

### J5 — Find a place or route
A visitor searches manually for a street, landmark or published business and chooses an outbound Google Maps search/directions link. The page does not request GPS by default or expose private addresses. It does not imply a live Maps API integration.

### J7 — Discover historical sites and tourism
A visitor browses sourced, approved destinations and follows verified visit information or a clearly external map handoff. Unknown hours, access or location details are omitted, not guessed.
### J8 — Listen to EPE LAWA Radio
A listener opens the radio page and sees accurate stream status, programme information and available archive records. If stream/provider readiness is unverified or unavailable, the page says so clearly.
### J9 — Find a person in Who is Who
A visitor searches verified public profiles and sees only approved fields. Corrections/removal are available; no profile or office claim is fabricated.
### J6 — Find a business or product
A visitor searches approved listings and sees accurate public details. Owners submit listings for review; authenticated members may use supported review/order flows. Ordering/payment remains unavailable unless the provider path is configured and tested in a private sandbox. No unverified listing appears endorsed.

## Staff journeys

### J10 — Publish a story
A staff member signs into the protected staff app. A verified active account with `article.publish` can save a private draft and publish its current revision directly; no second reviewer is required. The server checks capability and expected revision, rejects stale revisions, and audits each transition. Preview is private and session-gated.

### J11 — Review and moderate community content
A capable staff member checks history provenance/consent or forum reports, takes an authorized action with a reason, and leaves an audit record. Unpublished submissions and evidence remain private.

### J12 — Review business records
A staff reviewer checks the supplied listing information and records verification evidence before publication. Payment-backed featured placement is used only when a real, date-bounded record and tested provider flow exist.

## Cross-cutting acceptance needs

Low data use and responsive layouts; keyboard, screen-reader, contrast and reduced-motion accessibility; minimal collection and private email; distinct loading/empty/error/denied states; secure member recovery; secure staff sessions and fresh capability checks; admin analytics from real queries; branded transactional templates without claiming provider delivery is operational; auditability; Playwright coverage for the full eight-module journeys. Test content remains private in isolated environments; production reads only.

## Research limitations

User needs, data affordability, willingness to transact, moderation capacity and the meaning of community boundaries require real research. They must not be invented or presented as findings.
