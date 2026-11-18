# Primary administrator access investigation

Production read-only inspection found the requested primary administrator account verified, active, not required to change its password, and holding every one of the 12 capabilities currently in the production catalogue, including `admin.access`, `staff.manage`, and `audit.read`.

This is not proof that every admin feature works. Before the rollout, production did not have `staff_roles_authorized` or the configurable role tables. The UI calls that function to expose role, user, and settings controls. Production also lacks the `history.review` and `tourism.review` capabilities and their respective submission tables. A capability grant alone cannot repair missing feature schema.

At the owner's request, `20261114190000_configurable_staff_roles.sql` was applied to production as remote migration `20261118081756`. Production-specific varchar-to-text mismatch in the staff directory was fixed by `20261119015000_staff_directory_email_type.sql`, applied remotely as `20261118081830`. The local/remote migration versions need reconciliation before automated deployments.

Readback found all three role tables protected by RLS, with anonymous SELECT and authenticated direct INSERT denied. Anonymous execution of the management RPCs is denied. A database-side simulated primary identity passed the role authorizer and admin capability checks, and the staff directory returned successfully after the fix. Isolated PGlite tests cover authorization and directory compatibility. Actual browser login, staff role changes, invitations and UI workflows remain untested. No backup or equivalent production rehearsal was performed (previously waived). No missing history or tourism feature schema was applied. Do not claim that all modules are functional.
