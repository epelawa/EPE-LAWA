# EPE LAWA — System Architecture

**Status:** Architecture guidance, not proof of deployment or integration readiness. Companion documents: `08-permissions-security.md`, `09-api-contracts.md`, `10-integrations.md`, `13-tech-stack.md`.

## Application boundaries

The repository contains public (`frontend/apps/main`) and staff (`frontend/apps/admin`) applications, with a news app also present in the workspace. Public functionality in scope covers all eight client modules: Trending News; Itan Ilu Mi / My Community History; Chat Forum / Digital Village Square; Map & Navigation; Epe Business Directory & Marketplace; Historical Sites & Tourism; EPE LAWA Radio; and Who is Who in Epe. Native mobile apps alone are deferred. Section 5 future enhancements remain in the roadmap. Existing schemas/routes do not prove any module complete.

Public clients must not hold service credentials or render private records. Staff routes/actions require secure, verified staff sessions and fresh capability checks. Member-only writes require server-verified member identity. API and database policies both enforce authorization.

## Data and package boundaries

Use shared contracts for validation; keep secrets and server-only database access out of client bundles. Database access is typed and scoped to the needed columns. Validate inputs at server boundaries. A build/test simulation does not prove provider or production policy behavior.

## Publishing flow

An active verified staff member with `article.publish` may publish directly without a second reviewer. Every transition validates `expectedRevision`, rejects stale values without overwriting, and records an audit event. Drafts/previews remain private; public queries and caches expose published content only. Test publishing occurs in isolated environments; production remains read-only.

## Rendering and privacy

Public pages may be statically rendered or cached only when they contain public approved content. Sessions, drafts, submissions, member data and staff responses must be private/no-store. Never mix private data into public caches or metadata. Admin analytics show real query results and distinguish unavailable from zero.

## Additional module data boundaries
Tourism destinations, Radio stream/programme/archive records, and Who is Who profiles must be sourced, approved and exposed only through public fields. Stream readiness, destination facts and identity/role verification are evidence-gated; unavailable dependencies produce honest states.
## Current map and external services

The current map page creates safe outbound Google Maps search/directions URLs. There is no configured Maps API key or verified Places/geocoding integration. Offline map access is optional future work. Email/Paystack provider operation is unconfirmed; dependent flows fail closed until verified.

## Trust boundaries and reliability

Treat all browser input as untrusted; validate and authorize server-side. Use least-privilege database roles, audit privileged transitions, generic authentication responses, rate limits on sensitive endpoints and idempotency for any eventually enabled payment flow. External failures produce honest unavailable states; do not represent failures as empty/zero or as successful actions.
