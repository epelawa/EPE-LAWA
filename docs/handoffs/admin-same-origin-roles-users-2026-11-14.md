# Same-origin Admin roles and staff users

**Updated:** 2026-11-14 21:08 CET

## Done

- Added public-origin `/admin/roles` and `/admin/users` route bridges to the existing staff pages.
- Kept the routes behind the existing server-side `AdminAccessGuard`. The shared Admin layout shows role/user-management links only when the server-authorized `staff_roles_authorized` RPC succeeds; errors fail closed.
- Updated the public route manifest and added static plus local integration coverage.
- Captured a synthetic 320px screenshot showing an anonymous visit to `/admin/roles` landing on the staff sign-in page: `artifacts/admin-public/admin-roles-anonymous-redirect-320.png`.
- Validation on current `main` plus these changes: public/Admin production builds passed, both TypeScript checks passed, focused Admin/foundation tests 10/10 passed, full serial frontend suite 193/193 passed. Screenshot had no browser errors or horizontal overflow.

## Pending

- Merge this change through the ordinary PR path and verify its Vercel deployment.
- Test the actual role and staff-user workflows with an authorized test account only after the required database migrations are reviewed, applied through the approved release process, and verified.

## Blocked / not claimed as complete

- Production schema changes remain unapplied. The verified schema lacks member `profiles` and several authorization/feature RPCs, including `staff_roles_authorized`; this prevents claiming that member signup/profile repair or configurable roles are live.
- `20261114190000_configurable_staff_roles.sql` is a separate migration and is not covered by the earlier four-file approval. The approved `20261114142000_admin_user_management_rpcs.sql` remains unapplied and is still gated by backup/restore and compatibility checks.
- No production migration, reset, account provisioning, generic auto-DDL, or automatic row creation was performed. A schema-audit tool and versioned, reviewable migrations are safer than a script that guesses arbitrary columns or rows.

## Resume point

After ordinary merge/deployment verification, continue the separate member-auth and minute-rotating News branches. Before any database application, complete and verify a recoverable backup/restore, compare each exact migration with Production, and obtain approval for the new profile/bootstrap and configurable-role SQL. Then validate username checks, profile creation, role assignment and staff-user actions using a non-production target before any separately authorized Production step.
