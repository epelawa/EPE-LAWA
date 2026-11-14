> **ARCHIVED 2026-11-02.** Superseded by `docs/00-master-plan.md` and `docs/12-development-roadmap.md`. Retained as a historical record of what was built and verified at the time; contents may be outdated. Current project status and requirements are in the master plan and development roadmap.

# Phase 1 — Initial Staff Onboarding Runbook

**Status:** Planning and read-only production inspection only; no accounts or grants have been created. Admin remains closed.

**Purpose:** Bring the two owner-designated initial administrators into the staff system safely. The owner supplied their addresses directly; they are not hard-coded into the application, migrations or this repository. An email string alone is not proof of identity or permanent authorisation.

## Current evidence

On 2 November 2026, a read-only query in the owner-confirmed production Supabase project found **zero Auth accounts** matching either designated address. Neither can receive the existing `admin.access` grant until a real Auth identity exists. No users, passwords, grants or provider settings were created or modified. The current database capability grants entry only; editorial, account management and other administrator powers have not yet been designed or granted.

## Steps before anyone can sign in

1. **Complete the security foundation.** Implement reviewed email/password login, per-action authorisation, CSRF/origin checks, rate limits, audit and revocation. Verify the admin hostname and safe invite/recovery callbacks; configure and test the authorised email sender and password-recovery flow. The current password helper is unwired. Do not expose it as a login endpoint yet.
2. **Verify both people and their email control through the owner's approved process.** A mailbox address by itself does not prove who operates it. Agree account ownership, initial capabilities, provisioning approval, backup/recovery and revocation responsibilities. Do not put passwords, access tokens or secret provider keys in chat, code, tickets or documents.
3. **Create real identities through Supabase's supported Auth onboarding**, not direct SQL inserts into `auth.users`. An authorised operator may use the Supabase dashboard's Authentication → Users onboarding/invitation flow once the approved sender, site URL and recovery/callback flow are configured and tested. Recipients should choose their own passwords through the approved secure flow. Do not send an invitation to an unverified or unfinished callback and do not claim an email was delivered until checked.
4. **Verify each exact account before granting entry.** Match one confirmed Auth identity to the owner-approved person, check for duplicates and account status, and verify the account actually uses the approved email/password method. Do not silently grant based on a matching unconfirmed email or hard-code an email allowlist.
5. **Review and apply the minimum grant.** An authorised operator must review the exact production target, existing records, database privileges, backup/rollback and intended capabilities. Provision an active staff profile and explicit `admin.access` grant for each verified immutable Auth user ID through a reviewed, auditable process. This grant is entry only; it does not imply permission to publish, manage staff or change settings. No account or grant is currently provisioned by this runbook.
6. **Verify and document the outcome.** Verify that each intended account can authenticate, read only its own grant and has only approved capabilities; confirm unauthorised/inactive/revoked identities are denied. Use a safe testing plan; do not change or revoke production identities merely to simulate failure without explicit review. Record evidence without secrets or unnecessary personal data. Test recovery, logout, session expiry and actual browser behaviour.
7. **Open admin only after the Phase 1 security gate.** Complete audit, operational recovery, real-provider and browser/security testing, then obtain the required review and release approval. Until then, the admin app deliberately returns 503; there is no working staff login URL.

## If something is wrong

Stop if the target project, email/identity match, duplicate accounts, redirect origin, sender or grant scope is unclear. Do not create a temporary public allowlist, set a shared password, copy production credentials into a preview, insert directly into Auth tables, or treat an admin role as permission to bypass editorial approval. Follow reviewed incident and revocation procedures once established.
