# Cloudflare R2 + Vercel connection runbook — 2026-11-21

Status: the application code is complete and merged into the Phase 1 branch (admin media
workspace in PR #205, plus newsroom cover upload, commit `8475d0f`). Every code path honestly
reports "unconfigured" until the environment variables below exist in Vercel. The dashboard
steps in this file are **owner-only**: no Cloudflare or Vercel credential or connector exists in
the agent workspace, so a human must perform them once.

## 1. Cloudflare dashboard steps

1. Sign in to the Cloudflare dashboard and open **R2 Object Storage**. First-time use requires
   clicking "Purchase R2" (free tier: 10 GB stored, no egress fee). No payment method can be
   added by the agent.
2. Create two buckets under the account:
   - `epe-lawa-media-public` — serves approved images to the public internet.
   - `epe-lawa-media-private` — holds backup keys and anything not yet approved.
3. On the **public** bucket: Settings → Public access → either enable the `r2.dev` subdomain
   (fastest, rate-limited, not for heavy production use) or connect a custom domain
   (e.g. `media.epelawa.com` on the same Cloudflare zone — recommended). Record the resulting
   base URL, e.g. `https://media.epelawa.com` — no trailing slash.
4. Private bucket: leave public access **off**. Ragged objects are read via the GitHub Actions
   backup workflow, not the browser.
5. Create an API token: **My profile → API Tokens → Create Token → Custom token**. Permissions:
   - Account → R2 → **Edit** (this covers object Read/Write on both buckets), or the narrower
     per-bucket scope if preferred: Object Read & Write on the public bucket, Object Read & Write
     + List on the private bucket.
   - Do **not** add Zone or Account-scoped permissions beyond R2.
6. Copy the token secret once (it is shown a single time) and the **Account ID**
   (R2 → Overview, right sidebar).

## 2. Vercel steps (owner)

For the project (both Production and Preview environments):

| Variable | Value | Notes |
| --- | --- | --- |
| `R2_BUCKET_PUBLIC` | `epe-lawa-media-public` | non-secret |
| `R2_BUCKET_PRIVATE` | `epe-lawa-media-private` | non-secret |
| `R2_ACCOUNT_ID` | Cloudflare Account ID | non-secret |
| `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` | the base URL from step 1.3 | embedded in image URLs; safe public |
| `CLOUDFLARE_API_TOKEN` | the API token secret | server-only; never `NEXT_PUBLIC_` |
| `MAINTENANCE_GATE_ENABLED` | `true` | activates the maintenance-page gate on both deployments |

Then trigger **Redeploy** so the new environment is picked up.

GitHub Actions secrets (separate from Vercel, for the backup workflow):
`R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` come from R2 → "Manage API tokens" → create an S3
credential for the same account, plus `R2_ACCOUNT_ID` and `R2_BUCKET_PRIVATE`.

## 3. Verifying the connection after the owner's steps

- `/admin/media` should stop reporting "An EPE LAWA image-storage bucket is not configured…" and
  accept an upload (≤ 26 214 400 bytes; JPEG/PNG/WebP/AVIF), creating a row in `media_assets`.
- Newsroom composer ("New article" or any draft/revision page) shows the direct cover-file input
  when `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` yields a valid URL — this is `coverUploadState()`
  returning `ready` (`frontend/apps/admin/lib/media-r2.ts`). Uploaded covers must still carry alt
  text, credit, source URL and license URL because `news_cover_url_is_safe` in the live database
  enforces safe HTTPS cover provenance on `articles`.
- Backup workspace `/admin/backups` can dispatch against the private bucket.

## 4. What the agent could not do and why

No Cloudflare or Vercel connector or credential exists in the agent workspace (connector
discovery checked; `.env.example` carries placeholders only). Creating buckets, issuing tokens,
or writing Vercel environment variables therefore remains an owner-gated step, consistent with
the "what only the owner/client can do" section of `docs/EXECUTION-CHECKLIST.md` (§9 ordering:
Chunk 0.5, 3.2, 3.3, 6.2, 6.3, 8.3, Phase 9).
