# EPE LAWA — Page Specifications

**Status:** Active, low-fidelity requirements. Page descriptions are not evidence that routes or integrations are complete; verify in a real browser before acceptance.

## Shared public and staff patterns

Public shell: skip link, brand/navigation, main landmark with one `h1`, and footer with accurate About, Contact, Guidelines, Privacy and Terms links. Navigation exposes all eight approved modules: Trending News; Itan Ilu Mi / My Community History; Chat Forum / Digital Village Square; Map & Navigation; Epe Business Directory & Marketplace; Historical Sites & Tourism; EPE LAWA Radio; and Who is Who in Epe. Mobile menu is labelled, keyboard operable, closable with Escape and restores focus.

Every data page distinguishes loading, empty, error and denied states. Errors explain whether input was preserved and offer retry where safe. Denied states do not reveal protected data. Use semantic controls, visible focus, 44px touch targets and reduced-motion support.

## Public routes

### Landing `/`
Explain EPE LAWA concisely and provide working links to the eight in-scope modules. Show only approved published records; no invented counts, testimonials or content. Keep empty sections honest.

### Trending News
News landing/listing supports published articles, categories, search and pagination; article pages show canonical metadata, byline/date, credited imagery, correction notices and share links. Search, metadata and sitemap exclude drafts and private previews. A “trending” label requires real privacy-conscious read signals; a breaking banner requires an explicit flag and unexpired timestamp.

### Itan Ilu Mi / My Community History
Provide search/browse for published history records, with community/category filters where supported. Show provenance and appropriate context. Contribution and correction/dispute/takedown forms require consent and keep submissions/evidence private pending review. Never fabricate lineage, names, dates, places or cultural facts.

### Chat Forum / Digital Village Square
Forum index/category/thread pages present real topics and activity, replies, polls only where supported, report controls and guidelines. Posting/voting require a verified member session. Show clear moderation/tombstone states and no fake member activity.

### Map & Navigation
Offer manual searches for streets, landmarks and published businesses. A selected result may open a safe outbound Google Maps search/directions URL; label the handoff as external. Current implementation is outbound URL construction only, not a Maps API/Places/geocoding integration. Do not request GPS by default or expose private residential/delivery addresses. Offline maps are optional future work.

### Epe Business Directory & Marketplace
Directory search/filter and business profile show approved public fields only, with verification tied to recorded human review. Product/order flows use real approved records; totals are server-calculated. Disable or clearly mark payment-dependent actions unavailable unless provider setup and isolated sandbox checks are evidenced. Sponsor labels require real current records.

### Member identity
Signup, email verification, login, logout and password recovery use generic responses that do not disclose whether an email is registered. Member-only actions require a server-verified session.

### Historical Sites & Tourism
Provide destination discovery/detail pages with sourced, reviewed descriptions and only verified visitor/location information; truthful empty states and external directions handoff.
### EPE LAWA Radio
Radio player, accurate live/stream availability, approved programme schedule and archive where records exist; fail honestly when stream is unavailable or unverified.
### Who is Who in Epe
Searchable approved public profiles with recorded human verification for official-role claims, controlled public fields, and correction/removal path.
### About, contact and guidelines
Describe only the current eight-module service and verified contact/operational facts. Guidelines cover sourcing, corrections, privacy, member conduct and reasoned moderation without describing out-of-scope products.

## Staff routes

Staff app requires a secure, verified staff session and a fresh capability check for every protected action. Dashboard analytics show real query results; unavailable values are not represented as zero. Newsroom offers private drafts, session-gated preview, revision-aware transitions and audit history. Verified active staff with `article.publish` may publish directly without a second reviewer; stale revisions are rejected. History, forum and business moderation/review interfaces remain capability-gated and auditable.

## Page acceptance questions

For every route: what is its purpose; what is the empty/loading/error/denied state; does it work at required widths and with keyboard/screen reader; is private content excluded from public caching/indexing; and is every integration claim supported by current evidence?
