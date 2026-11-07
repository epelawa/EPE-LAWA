# EPE LAWA — API Contracts

**Status:** Design guidance only; nothing in this document proves an endpoint is implemented or deployed. All eight client brief sections 3.1–3.8 are current web scope; native mobile apps alone are deferred. Section 5 enhancements remain in the roadmap.

## Conventions

Use JSON, UTC timestamps, bounded pagination and server-side schema validation. Return generic authentication failures and avoid leaking private record existence, SQL, provider payloads or stack traces. Use `401` for no valid session, `403` only when existence is not secret, `404` for missing or private records, `409` for stale revision/conflict, `422` for valid shape but invalid content, `429` for rate limits and `503` for unavailable dependencies.

## Public reads

Public read surfaces may include published news/search/categories, approved community history, visible forum content, published businesses/products, approved tourism destinations, verified Who is Who profiles, Radio programme/archive records, and public map search suggestions when sourced. Return only approved public fields. Exclude drafts, private contributions, email, delivery addresses, review notes and internal identifiers. The Map page currently makes safe outbound Google Maps search/directions URLs; do not document a Maps API/Places/geocoding endpoint as operational.

## Member actions

Member endpoints, where implemented, require a server-verified session and capability/ownership check: signup, verification, signin/signout, password recovery, profile management, forum posts/replies/polls/reports, history contribution/correction, business submission/review and any order request. Auth responses must not disclose account existence. Keep personal data private and apply rate limits.

## Staff actions

Every staff endpoint requires a verified staff session and the named capability, freshly checked on each request. News transitions include `expectedRevision`; a verified active staff member with `article.publish` may publish directly without a second reviewer. Stale revisions return conflict and do not overwrite. Record each state transition in an audit trail. History approval, moderation and business verification are capability-gated and auditable.

## Provider-dependent flows

Do not enable payment endpoints until Paystack is configured and a private sandbox verifies signature validation, server-side amount recomputation, idempotency and state transitions. Do not claim email delivery until sender authentication and test delivery are confirmed. No production writes during tests.

## Caching

Only approved public records may use public cache headers. Member/staff responses, drafts, submissions, auth and payment state are private/no-store. Unpublish/takedown must promptly remove public visibility. Cache behavior requires tests; this document is not evidence that invalidation is implemented.
