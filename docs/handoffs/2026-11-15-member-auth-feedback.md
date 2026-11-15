# Member authentication feedback and live release checkpoint

Checkpoint: 2026-11-15 01:39 WAT. Base main `b03a3fb` (Newsroom settings PR #88 normally merged).

## Done

Replaced the vague member sign-in failure with allowlisted actionable messages: invalid credentials, email confirmation required, rate limiting or temporary provider/network failure. Provider-controlled error text is never rendered. Malformed/missing email/password get linked accessible field errors. Signup gives concrete name/handle/email/password guidance; database-backed handle availability remains mandatory. Recovery stays account-neutral with the existing exact copy. Google sign-in remains visibly disabled, and the verified-profile completion path is unchanged.

Forced exact Node22.23.5/pnpm10.34.9 builds2/2 and typechecks5/5 passed; full combined suite253 total252passed0failed1existing PGlite constraint skip. Browser testing used actual local server actions against an HTTPS loopback Supabase fixture. Invalid credentials produced the exact new message, never a success or live login. At320x568 the default and error screens both measured documentHeight568/documentWidth320: no page scroll/overflow. Default captures also cover320/390/430/768/1440 at900px viewport height. The disabled Google control remains visible. No actual user/password/session was used; browser blocked external hosts.

## Verified Production changes preceding this branch

PRs #81–#88 merged normally without bypass. Member profile bootstrap/handle functions, Newsroom authoring and scoped draft-read fixes, four-table Forum report queue and explicit anon ACL repair, Radio metadata/authoring, and Newsroom category/byline RPCs are now present. Recent ledger versions: Forum queue20261115001228; explicit anon ACL20261115001916; Radio20261115003058; reference settings20261115003732. These preserve existing rows and migration history. No synthetic public content, account provisioning or destructive schema action occurred.

Saved Gmail SMTP credentials authenticated; Supabase SMTP repaired and a recovery request for the existing primary-admin identity returned200 (sanitized Auth log `/recover`,2026-11-15T00:03:34Z). No password changed; inbox delivery remains unverified. Canonical site URL corrected to https://epelawa.vercel.app/ with all8 existing redirect entries preserved.

## Remaining / resume

Ordinary PR/merge this feedback fix, verify the exact Vercel Production SHA and public/member/admin routes. Successful live member login/signup and the two approved private News drafts still need an authorized account/staff session; no new account may be provisioned without that separate scope. The third story remains on editorial hold.

The broader route-object audit still reports real missing dependencies in History, Business/Marketplace, Tourism, Forum creation/polls, People write RPCs and configurable staff roles. Do not claim the entire platform is finished or treat HTTP200 as workflow acceptance. See the separate current Production gap handoff for exact objects; historical manifest columns must not be used to synthesize unchecked migrations.
