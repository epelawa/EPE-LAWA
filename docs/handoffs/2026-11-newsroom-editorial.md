# Newsroom editorial continuation

The public newsroom is redesigned around the existing published projection. Search RPC `published_news_search` was applied to production as `20261118112200`; it is SECURITY INVOKER and anonymous execution was tested using a read-only count. The isolated Postgres test verifies that drafts are excluded. The frontend and remote migration should be released together; older migration histories are not reconciled by this change.

Remaining: an explicit staff-selected featured-story workflow has not been implemented. The featured lead continues to use an active breaking story from the current result page, or the newest result. Breaking stories still appear in the banner and may also appear as distinct cards; no special deduplication beyond excluding the featured lead from the card list. Logged-in members still follow the existing redirect to Discover, whose search is separate. Real browser, SEO crawler, mobile layout and production search UI verification remain outstanding.

## Discover search follow-up

Signed-in Discover now uses the same published search RPC as public News when a query is present, including summary, body, author and category matches; it retains its 20-item pagination and reports RPC failures. Redirects from `/news` preserve the page number, although public and member page sizes differ. Discover retains its existing member layout and category controls, so full visual parity is not implemented. Featured-story selection and breaking deduplication remain outstanding. Local component/database tests cover search/error behavior; real browser and production UI verification remain outstanding.
