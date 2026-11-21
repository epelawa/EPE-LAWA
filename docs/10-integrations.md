# EPE LAWA — Integrations and Deployment

**Status:** Design notes and evidence boundaries. Provider readiness must be verified before operational claims.

## Provider status

| Concern | Current evidence/status |
| --- | --- |
| Web hosting | Vercel project/older deployment evidence exists; current branch preview/deployment is unverified. |
| Database and auth | Supabase is present in the project; current environment/provider state must be verified. Local PGlite tests are not live RLS proof. |
| Transactional email | The standalone newsletter mailer and branded templates are implemented. Delivery remains unconfirmed until the `NEWSLETTER_SMTP_*` and `NEWSLETTER_FROM` runtime variables, sender-domain authentication and a private test recipient are verified. |
| Payments | Paystack setup and sandbox operation are unconfirmed. Do not enable real payment claims without isolated verification. |
| Maps | Current page builds safe outbound Google Maps search/directions URLs. No configured Google Maps API key or verified Places/geocoding integration. |
| Analytics | Admin analytics must use real query results; no unverified metric or provider readiness claims. |
| Storage/observability | Do not assume a provider or adapter is operational without current environment evidence. |

## Module-specific evidence gates
Tourism facts/locations, Who is Who identity and office claims, and Radio stream/programme records require approved sources and review. Radio playback is not operationally verified until the official stream URL, rights/permission, format compatibility and browser playback are tested. Native apps are deferred; section 5 future enhancements remain in the roadmap.
## Email

Required templates include branded verification and password recovery, plus other essential transactional notices where implemented. Use generic auth responses to avoid account enumeration. Template presence is not delivery proof: verify sender-domain authentication (SPF, DKIM, DMARC), provider configuration and a private test recipient before claiming delivery operational. Never log message bodies or credentials.

### Newsletter SMTP variables

The custom newsletter flow is separate from Supabase Auth email links. Configure these server-only variables in `.env.local` and the relevant Vercel environments; keep real values out of Git:

| Variable | Purpose |
| --- | --- |
| `NEWSLETTER_SMTP_HOST` | Approved SMTP hostname |
| `NEWSLETTER_SMTP_PORT` | SMTP port, normally `465` for implicit TLS or `587` for STARTTLS |
| `NEWSLETTER_SMTP_SECURE` | `true` for implicit TLS; `false` for STARTTLS |
| `NEWSLETTER_SMTP_USER` | SMTP account username |
| `NEWSLETTER_SMTP_PASSWORD` | SMTP account password |
| `NEWSLETTER_FROM` | Approved sender address, optionally with a display name |

The application fails closed when these variables are missing or invalid. After configuring them, send only to a private test recipient and verify the confirmation template, management code, unsubscribe URL, SPF, DKIM and DMARC before describing delivery as operational.

## Payments

Keep checkout/payment-dependent actions disabled or honestly unavailable until a provider is configured and tested in a private sandbox. Amounts must be recomputed server-side, webhooks authenticated on raw bodies, events idempotent and payment state auditable. Production remains read-only during testing.

## Maps

Use the current safe outbound search/directions URL construction as a fallback, label external navigation clearly and avoid exposing private addresses. Do not request GPS by default. Do not claim a Google Maps API, Places or geocoding integration. Offline map access is optional future work.

## Environments and release

Keep local/preview test content synthetic and isolated; never copy production data into preview. Production verification is read-only. A supplied older Vercel log documents a failed `main` build and environment filtering; helper files now present in the worktree do not prove a current build or preview. Record actual deployment/build evidence before release claims.

Any provider-dependent feature must have explicit configuration, isolated end-to-end tests, failure handling and documented evidence. If a provider cannot be verified, keep the feature fail-closed and report the blocker.
