# EPE LAWA — Tech Stack

**Status:** Working repository notes, not a provider-readiness certificate. Verify package versions and configuration from the current lockfile/environment before changing or asserting them.

## Current workspace shape

The repository uses TypeScript, pnpm workspaces/Turborepo, Next.js App Router, React, shared UI packages, and `node:test`-based tests; Playwright is required for full end-to-end acceptance. Public and staff apps live under `frontend/apps/main` and `frontend/apps/admin`; a news app and backend Supabase packages/schema also exist. Existing code or schema outside the eight-module scope is not a current release feature.

## Data, identity and security

Supabase/Postgres/Auth/RLS are used in the repository, but local simulations do not prove live provider behavior. Keep credentials server-side and enforce authorization at server and database boundaries. Member and staff sessions are separate. Shared contracts and validation should be browser-safe; secrets and database service credentials must never enter client bundles.

## Current product scope

The web release includes Trending News, Itan Ilu Mi / My Community History, Chat Forum / Digital Village Square, Map & Navigation, Epe Business Directory & Marketplace, Historical Sites & Tourism, EPE LAWA Radio, and Who is Who in Epe, with cross-cutting member auth, staff capabilities, analytics, news publishing, branded transactional templates, audit, privacy, accessibility and Playwright.

Map functionality currently uses safe outbound Google Maps search/directions URLs; no Google Maps API key, Places or geocoding integration is verified. Offline maps are optional future work. Email and Paystack providers are not confirmed operational. Keep provider-dependent flows unavailable until configuration and isolated tests prove them.

## Verification and environment variables

Read actual app environment usage and `.env.example` before adding variables. Never document a secret value. Do not pass unrelated secrets to builds. Test data is private in isolated environments; production reads only. A package choice or dependency in the lockfile is not proof of deployed integration.

## Deferred choices

Native mobile apps alone are deferred. Section 5 future enhancements remain represented in the full roadmap: event ticketing, emergency contacts, scholarship/job board, e-learning, English/Yoruba support and an AI-powered local assistant.
