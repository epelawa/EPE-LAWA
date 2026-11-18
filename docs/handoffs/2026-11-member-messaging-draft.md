# Member directory and messaging — draft, not release-ready

The owner chose permanent account deletion and member-only broadcasts. This branch implements a primary-admin-only directory, individual and broadcast in-app notification forms, and candidate database functions. The SQL and UI have only synthetic PGlite and typecheck coverage. No migration has been applied, no production member was deleted, and no messages were sent.

Before release:
- Replace or thoroughly validate direct SQL deletion of `auth.users` against Supabase Auth and Storage lifecycle requirements; map production FK restrictions, retained public content, and storage objects. Deletion can currently fail on existing FK restrictions, and the candidate does not delete storage objects. Do not represent it as full personal-data erasure.
- Add explicit duplicate-submission/idempotency protections and safe delivery/error feedback for broadcasts; test concurrent sends and recipient limits. The current 10,000-recipient transaction is a safety cap, not a scalable queue.
- Confirm whether verified-only member delivery satisfies the requirement for all members; current candidate excludes unverified members and any member with a staff profile.
- Reconcile migration ledger, inspect production schema and rehearse the migration and rollback; test real admin authorization, recipient isolation, bell display, deletion and audit with synthetic accounts in a safe environment. Supabase database branching was previously unavailable on the current plan.
- Test accessible confirmation, pending, success and failure states on mobile and desktop. Current forms do not disable double submission, and unhandled action errors need user-friendly recovery.

Do not merge or deploy this candidate until these blockers are resolved. PGlite tests use simplified tables and do not certify production Auth deletion behaviour.
