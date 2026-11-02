# EPE LAWA — Staff Access Foundation

**Status:** Local implementation in progress, not deployed or production-ready.\
**Prepared:** 2 November 2026

## What exists

- `backend/packages/auth` implements a fail-closed entry check requiring a verified identity and an explicit active `admin.access` grant on each check. It does not grant editorial, settings, media or staff-management permissions.
- `backend/supabase/migrations/20261102130000_staff_access_foundation.sql` is an **unapplied** migration for an inactive-by-default staff profile and a single explicit entry capability. RLS permits an authenticated user to read only their own profile and, when active, their own entry grant. Anonymous and authenticated roles have no insert/update/delete grants on these tables. No accounts or grants are seeded.
- `frontend/apps/admin/lib/supabase-access.ts` is a server-only, currently unwired adapter: it verifies a supplied token through Supabase Auth and checks the profile/grant using the caller's RLS-scoped identity. It accepts a publishable/legacy anon key only, rejects secret/service-role keys and HTTPS-insecure provider URLs, and fails closed on errors. Its environment names are `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; no real values are provided or required for a build.
- The admin app continues to return HTTP 503 with `no-store` and `noindex`. There is no sign-in form, session/refresh flow, account bootstrap, audit trail, role-management UI or protected dashboard. Do not remove this fail-closed behaviour until those controls and real provider integration tests are complete.

## Verification and limitations

- Automated unit tests cover invalid tokens, failed verification, missing/revoked grants and upstream errors. Mocked adapter tests verify Auth is called before RLS-scoped reads and that secret keys/insecure URLs fail closed. These mocks do **not** prove Supabase Auth or production configuration works.
- A test runs the local SQL against an ephemeral in-memory Postgres-compatible PGlite instance with synthetic test-only identities and simulated Supabase roles/`auth.uid()`. It checks empty starting tables, own-row isolation, inactive/non-staff denial, write denial and revocation. No application database is seeded. This is useful local evidence, **not** a substitute for testing real Supabase Auth, grants, RLS and service-role behaviour.
- Provider access checked through connected apps: the connected Supabase account returned no projects; an organisation named `epelawa` is visible. An existing Vercel project named `epe-lawa` is visible; its project settings were not modified. No live Supabase migration, Auth configuration, Vercel deployment, DNS, Resend or R2 configuration was changed.
- The observed Vercel project defaults to Node 26, while this workspace currently declares Node `>=22 <25` and has been tested on Node 22. Confirm and align the intended deployment runtime before any deployment; do not change the existing live project without an approved plan.

## Required before enabling admin

1. The owner has requested a new Supabase project. Confirm its plan, region and environment purpose before creation; the connected organisation is `epelawa`. Do not send passwords, secret API keys or tokens in chat.
2. Review the proposed migration, final capability/role matrix, ownership restrictions, staff onboarding/revocation, audit logging and break-glass process. Entry is **not** permission to publish or administer content. Apply migrations only to the explicitly approved project/environment after review.
3. Implement and test secure staff-only login, verified server sessions/refresh, cookie/CSRF controls, safe recovery and redirect allowlists. Confirm Resend SMTP and sender-domain setup through an approved secure process.
4. Run the full positive and negative [security test plan](08-permissions-security.md) against a real isolated Supabase test project, including direct table/API access, revoked users, JWT/session expiry and service-role isolation. Implement audit and operational recovery; do not rely on mocked tests as production proof.
5. Obtain the official direct radio stream and embedding permission, approved WhatsApp contact and form recipient/privacy decisions before those integrations. Live radio is mandatory before launch.
