# Primary administrator access investigation

Production read-only inspection found the requested primary administrator account verified, active, not required to change its password, and holding every one of the 12 capabilities currently in the production catalogue, including `admin.access`, `staff.manage`, and `audit.read`.

This is not proof that every admin feature works. Production does not have `staff_roles_authorized` or the configurable role tables. The UI calls that function to expose role, user, and settings controls. Production also lacks the `history.review` and `tourism.review` capabilities and their respective submission tables. A capability grant alone cannot repair missing feature schema.

The existing `20261114190000_configurable_staff_roles.sql` remains source-only, not applied by this investigation. Its isolated PGlite test checks owner authorization, denial to other staff and inactive/unverified owners, direct and role-based grants, and privileged role-management and self-assignment restrictions. This is not a complete production migration rehearsal or an end-to-end UI test. Review schema dependencies, security, audit and production migration-ledger reconciliation before applying; do not claim full super-admin functionality until the relevant modules are individually verified.
