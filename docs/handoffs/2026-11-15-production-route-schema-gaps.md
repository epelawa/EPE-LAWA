# Production route dependencies still remaining

Checkpoint: 2026-11-15 01:38 WAT, main `b03a3fb`. This is an object-existence comparison of current literal application database references plus dynamic Newsroom transitions, not a proof of all columns, grants, signatures or workflows.

## Core repair is present

Member profiles and verified bootstrap/handle lookup; Newsroom create/save/revise/publish/unpublish and scoped staff draft visibility; Forum report queue/moderation; Radio catalogue metadata and revision/rights-aware authoring; category/byline management RPCs now exist. Recent functions have empty search paths and explicit anonymous EXECUTE denial. Production contains no synthetic rows from this work.

## Missing relation/view objects

| Area | Missing objects |
| --- | --- |
| Business and marketplace | `active_business_sponsorships`, `business_categories`, `business_reviews`, `businesses`, `order_items`, `orders`, `products`, `published_businesses` |
| Forum polls | `forum_poll_options`, `forum_poll_results`, `forum_poll_votes`, `forum_polls` |
| Community History | `history_contributions`, `history_record_sources`, `history_records` |
| Configurable staff roles | `staff_role_assignments`, `staff_role_capabilities`, `staff_roles` |
| Tourism | `tourism_destinations`, `tourism_submissions` |

## Missing RPC names

| Area | Missing functions |
| --- | --- |
| Business and marketplace | `business_review_moderate`, `business_set_status`, `business_submit`, `business_verify`, `marketplace_order_request`, `order_advance` |
| Forum authoring/polls | `forum_create_thread`, `forum_vote` |
| Community History | `history_contribution_decide` |
| People directory writes | `people_correction_resolve`, `people_create_with_achievements`, `people_office_add`, `people_set_status`, `people_source_add`, `people_source_set_visibility`, `people_unverify`, `people_update`, `people_update_achievements`, `people_verify` |
| Configurable staff roles | `staff_role_assign`, `staff_role_delete`, `staff_role_save`, `staff_role_staff_directory`, `staff_roles_authorized` |
| Tourism | `tourism_submission_decide` |

These missing objects can still cause unavailable/error states. Existing People read tables/views are not evidence that staff write RPCs work. The new Forum queue foundation does not implement Forum creation/polls. Do not claim full platform release acceptance.

## Next safe sequence

Individually reconcile one bounded domain against the current catalog, use a Production-shaped fixture as well as the full migration chain, ordinary PR/merge, then apply only its freshly preflighted forward-only SQL. Keep current rows and ledger history. Do not replay the historical migration chain wholesale, generate invented columns from a route string, or create public fixture data. Preserve the owner’s provider and account-provisioning restrictions.

The tracked `schema-audit-manifest.json` still contains historical assumptions (for example `articles.status` and `programmes.title`), so it is not an authoritative automatic schema-creation payload. Its read-only script is useful only with a reviewed current manifest. This checkpoint instead compares actual current source references against PostgreSQL catalog existence. Dynamic/inferred references and field-level/RLS behavior need additional domain-specific validation.
