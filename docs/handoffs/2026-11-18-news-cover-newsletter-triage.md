# News covers and newsletter triage

Branch `arena/6cac4af5-epe-lawa`, based on main `05e118fa4cd345b3eff13bb726be747168dca810`.

## Read-only live observations

The connected EPE LAWA Supabase project reported two article records, both with published versions; the published projection also returned two rows. One published row has a linked cover and one a catalog cover. This is a point-in-time result, not proof of production page rendering, delivery, or the completeness of another data source. No production mutation was performed. The live migration ledger contains 27 entries whose names/versions differ from parts of the local migration directory; full reconciliation, backup, and restoration rehearsal remain outstanding.

The live newsletter signup function was found to be anonymously executable with the same token-replacement behavior recorded in the earlier continuation plan. Its production exposure remains until a separately approved, verified database mitigation is applied. Do not call it against real subscribers for testing.

## Branch changes

- Homepage and member feed read the same published image fields and resolver used by article pages. Only catalog images are labelled illustrative. Missing and broken images use the site logo, including failures before hydration.
- Signup is temporarily disabled in the branch UI and server action. The candidate forward-only migration revokes public access to the unsafe signup RPC while preserving unsubscribe. This is **not deployed** and does not fix the live exposure on its own. Local PGlite tests exercise privilege denial and a synthetic existing unsubscribe. Reopening requires a verified mailbox-confirmation design and abuse controls, not just re-enabling this RPC.
- Local browser tests exercise linked images and logo fallback on synthetic records at 320/375/768/1024/1440; no live member session was tested.
- Typecheck, builds and local automated tests passed; the full browser/release matrix and external email delivery remain unverified. The high-severity picomatch audit remains failing with no patched version listed.

## Next

Reconcile and rehearse the emergency migration before explicitly authorizing a production change; assess and implement mailbox-verified, rate-limited signup and monitor its delivery. Resolve CI safely and complete News search/filter and broader publication, deletion, analytics and provider work per `2026-11-18-continuation-next-steps.md`. Keep the branch unmerged until relevant gates are satisfied.
