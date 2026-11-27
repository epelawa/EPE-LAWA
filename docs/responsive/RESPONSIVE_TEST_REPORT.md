# Responsive test report (turn 5)

Run in the sandbox against a production build (`next build --webpack`, `next start`) with the Supabase fixture.

| Check | Result |
|---|---|
| `scripts/responsive-audit.mjs`: 28 routes × 22 viewports | **616 combinations, 0 findings, 0 errors** |
| `radio-page.spec.ts` "changed routes have no horizontal overflow across the owner's viewport matrix" | pass |
| `business-directory.spec.ts` "directory and profile fit every owner viewport…" | pass |
| `public-routes-audit.spec.ts` | pass |
| Full browser-smoke suite (79 tests) | 76 pass on the run before the last fixes. Of the 3 failures, 1 (Who is Who row alignment) is now fixed and re-run green. 2 `dashboard-tabs` tests are **environment** failures: they assert the fixture origin is `http://localhost:54321`, but this sandbox serves the fixture through a local TLS proxy because production builds reject non-https Supabase URLs. They run on plain http in CI. |

Re-run:
```
BASE_URL=http://127.0.0.1:3100 CHROMIUM_PATH=<chromium> node scripts/responsive-audit.mjs /tmp/audit-after.json
```

## Not verified
- **200% browser zoom:** approximated by the 640×360 and 600×960 viewports (a 1280 px window at 200% gives a ~640 CSS px layout). Real browser zoom was not driven.
- **Real devices:** none were used; only Chromium emulation.
- **Yorùbá at every width:** the audit ran in English only.
- **Admin routes:** out of scope by instruction.
