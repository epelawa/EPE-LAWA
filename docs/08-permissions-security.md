# EPE LAWA — Permissions and Security

**Status:** Security requirements; checked-in schema/migration behavior is not proof of live-provider RLS. Historical database inventory may contain objects outside current release scope.

## Identity axes

| | Member | Staff |
| --- | --- | --- |
| Purpose | Public participation and personal account | News publishing, moderation and administration |
| Session | Secure, server-verified public session | Secure, verified staff-only session |
| Authorization | Own account and explicitly allowed member actions | Fresh explicit capability check on every protected action |
| Boundary | Never grants staff access | Never substitutes for a member identity |

Do not trust JWT claims alone for authorization. Verify identity server-side and re-check account/capability state. Session responses are private/no-store. Mutating web requests require origin/CSRF protections where cookie-based.

## Capability rules

Permissions are action-boundary checks, not UI visibility rules. Typical capabilities include `article.create`, `article.review`, `article.publish`, `moderation.review`, business review/management and `audit.read`. Scope and exact grants are established by the authorization model; do not grant broad access implicitly.

An active staff member with verified email and `article.publish` may publish directly; a second reviewer is not mandatory. Publishing and other transitions must compare the expected current revision. A stale revision is denied/conflicts rather than overwriting. Every transition, including denial where appropriate, is audited with actor, action, resource, time and result. Published versions remain immutable; correction is a new version.

## Data handling

- Public reads expose only approved published fields.
- Member records and private contact details are visible only to the account owner and authorized staff as needed.
- History contributions, provenance, consent and unpublished evidence remain private until review/approval.
- Forum posting/reporting requires an authenticated member; moderation requires a capability and reason, with an audit trail.
- Business verification is backed by a recorded human check. Delivery/contact details remain private.
- Admin analytics use real aggregate queries; query failure is not zero.
- Production checks are read-only. Synthetic test content is private and isolated.

## Map and payments

The current map functionality constructs safe external Google Maps search/directions URLs only. No Maps API key or verified Places/geocoding integration is configured; no default GPS request and no private address exposure. Offline maps are optional future work. Paystack/provider operation is unconfirmed; payment actions remain unavailable until an isolated sandbox flow, signatures, idempotency and reconciliation are tested.

## Privacy, accessibility and abuse controls

Collect minimum necessary data; do not expose member email. Provide secure verification and account recovery without email enumeration. Rate-limit authentication and user-generated actions. Preserve audit records for moderation and deletion/takedown. Design for WCAG 2.2 AA, keyboard access, visible focus, labelled controls, reduced motion and responsive reflow.

## Security verification plan

Test anonymous access to private records; cross-member isolation; member-to-staff and staff-to-member boundary; revoked capability on the next action; private draft denial; stale revision conflict; audit creation for transitions; moderation reason requirements; and secret absence from client bundles. PGlite simulation is a local check, not proof of live Supabase policy. Run provider checks only in isolated environments; production remains read-only.
