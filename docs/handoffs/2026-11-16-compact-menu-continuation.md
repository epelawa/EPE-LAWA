# Compact menu and article continuation — partial

## Completed slice

- Reduced the member dialog's spacing and text sizing, while retaining 44px minimum link targets, a scrollable body, native dialog focus handling, and reduced-motion behavior. Menu links close the dialog immediately when selected.
- Collapsed the inline comment composer behind a native disclosure and retained the existing floating comment action. The floating dialog now closes when its read-comments link is selected.
- Moved article engagement and comment-moderation capability reads into existing parallel request groups. This removes sequential waits but is not a measurement or guarantee of real-world latency. Authorization and database policies are unchanged.

## Verification

- `pnpm typecheck`, `pnpm build` passed; `pnpm test` passed (304 Node tests, one skipped; 21 Vitest tests).
- Six dashboard browser smoke tests passed against a synthetic Supabase fixture, including a new 375px compact-menu, touch-target, and navigation test. A focused component test checks the comment dialog closes. Full browser suite, article/comment end-to-end interactions, real provider behavior and performance measurements were not verified for this slice.
- The first browser attempt failed because the temporary Chromium executable lacked NSS libraries; after extracting its bundled libraries, the six tests passed.

## Outstanding request / release gates

- The requested full admin dashboard redesign, remaining member and public page redesigns (including Ìtàn Ilú Mi), news list redesign, and ten additional distinct article interface styles are **not implemented**. Existing four article/member treatments remain unchanged. No claim of complete audit or universally fast buttons is made.
- Test actual article/comment interactions, staff roles and workflows, public routes, keyboard/focus, reduced motion and responsive widths 320/375/768/1024/1440. Benchmark slow requests before claiming performance improvements. Verify isolated provider-backed workflows separately; production remains read-only. Keep the PR draft until scope and release checks are complete.
