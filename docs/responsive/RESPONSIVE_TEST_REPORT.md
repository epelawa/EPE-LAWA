# Responsive test report (turn 5)

Run in the sandbox against a production build (`next build --webpack`, `next start`) with the Supabase fixture.

| Check | Result |
|---|---|
| `scripts/responsive-audit.mjs`: 28 routes × 22 viewports | **616 combinations, 0 findings, 0 errors** |
| `radio-page.spec.ts` "changed routes have no horizontal overflow across the owner's viewport matrix" | pass |
| `business-directory.spec.ts` "directory and profile fit every owner viewport…" | pass |
| `public-routes-audit.spec.ts` | pass |
| Full browser-smoke suite, CI mode (`CI=1`: `next dev` + http fixture, 1 retry, same as the workflow) | **EXIT 0: 76 passed, 3 flaky** (passed on retry). The flakes were a pre-existing dev-server page-load timeout in `public-routes-audit` at 320 px, a pre-existing og:image wait in `public-shell`, and the new `/itan-ilu-mi` row check, now polled with an 8 px tolerance. `business-directory` and `radio-page` then passed 12/12 with retries disabled. |

Re-run:
```
BASE_URL=http://127.0.0.1:3100 CHROMIUM_PATH=<chromium> node scripts/responsive-audit.mjs /tmp/audit-after.json
```

## Not verified
- **200% browser zoom:** approximated by the 640×360 and 600×960 viewports (a 1280 px window at 200% gives a ~640 CSS px layout). Real browser zoom was not driven.
- **Real devices:** none were used; only Chromium emulation.
- **Yorùbá at every width:** the audit ran in English only.
- **Admin routes:** out of scope by instruction.
