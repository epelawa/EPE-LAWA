# Production migration inventory and deployment incident

Snapshot from Supabase project `igqmybuiovaxqmrteebd`, read-only list on this investigation. The remote ledger has 39 entries. Local versions and remote versions diverge, and remote names sometimes describe reconciliations rather than exact source files. A name match is **not** proof that SQL is equivalent or fully applied. Conversely, no matching name is **not** proof that every object is absent. Do not run a bulk migration push or mark these as applied without comparing definitions, policies, dependencies and data.

Since the earlier handoff, production recorded `20261119222152 form_retention` and `20261120062754 business_directory`. Business tables now exist; the previously proposed discovery candidate was not found under the checked signature. Tourism and community history tables remain absent. Review the live business schema, grants and functions before using any older candidate. No production migration was applied in this investigation.

## Local files with no corresponding remote ledger name

- `20261102200006_staff_transitions.sql`
- `20261102200008_comments.sql`
- `20261102200012_marketplace_and_payments.sql`
- `20261107194000_article_draft_update.sql`
- `20261107195000_direct_article_publish_verified_staff.sql`
- `20261107202500_community_history.sql`
- `20261107203000_history_review_workflow.sql`
- `20261107210000_forum_report_resolution.sql`
- `20261107213000_news_comment_workflow.sql`
- `20261107213000_people_achievements.sql`
- `20261107214000_itan_ilu_mi_categorization_lineage.sql`
- `20261107215000_forum_single_vote.sql`
- `20261107220500_marketplace_requests_moderation.sql`
- `20261107222000_people_staff_console.sql`
- `20261107224000_people_create_achievements.sql`
- `20261107230000_tourism_sites.sql`
- `20261107231000_radio_staff_authoring.sql`
- `20261107232000_radio_atomic_authoring.sql`
- `20261107234000_history_review_redacted_publish.sql`
- `20261119020000_member_admin_messages.sql`

## Local files with a corresponding or similarly named remote ledger entry

Names are indicative only, not a semantic comparison:

- `20261102133703_staff_access_foundation.sql` → `staff_access_foundation`
- `20261102190001_capabilities_catalogue.sql` → `capabilities_catalogue`
- `20261102190002_editorial_core.sql` → `editorial_core`
- `20261102190003_editorial_media_and_radio.sql` → `editorial_media_and_radio`
- `20261102190004_people_directory.sql` → `people_directory`
- `20261102190005_audit_events.sql` → `audit_events`
- `20261102200007_member_identity.sql` → `20261102200007_member_identity`
- `20261102200009_notifications.sql` → `notifications`
- `20261102200010_forum.sql` → `forum_moderation_schema_repair_20261115`, `forum_rpc_explicit_anon_acl_20261115`
- `20261102200011_business_directory.sql` → `business_directory`
- `20261114141000_radio_publication_state_reconcile.sql` → `20261114141000_radio_publication_state_reconcile`
- `20261114190000_configurable_staff_roles.sql` → `configurable_staff_roles`
- `20261114190000_member_handle_and_verified_bootstrap.sql` → `20261114190000_member_handle_and_verified_bootstrap`
- `20261114223500_news_comments_forward_only.sql` → `news_comments_forward_only_20261114`
- `20261114235700_newsroom_authoring_live_schema.sql` → `newsroom_authoring_live_schema_20261115`
- `20261115004000_newsroom_staff_read_rls.sql` → `newsroom_staff_read_rls_20261115`
- `20261115010000_forum_moderation_schema_repair.sql` → `forum_moderation_schema_repair_20261115`
- `20261115010200_forum_rpc_explicit_anon_acl.sql` → `forum_rpc_explicit_anon_acl_20261115`
- `20261115010500_radio_live_schema_authoring_reconcile.sql` → `radio_live_schema_authoring_reconcile_20261115`
- `20261115011000_newsroom_reference_settings.sql` → `newsroom_reference_settings_20261115`
- `20261115093000_news_cover_urls.sql` → `news_cover_urls_20261115`
- `20261116120000_article_engagement.sql` → `article_engagement`
- `20261116140000_member_saved_articles.sql` → `member_saved_articles`
- `20261118030000_newsletter_subscriptions.sql` → `newsletter_subscriptions_20261118`
- `20261118053000_pause_unsafe_newsletter_signup.sql` → `pause_unsafe_newsletter_signup`
- `20261118060000_restore_article_set_breaking.sql` → `restore_article_set_breaking`
- `20261119010000_newsletter_verified_requests.sql` → `newsletter_verified_requests`
- `20261119011000_private_enquiries.sql` → `private_enquiries`
- `20261119012000_form_rate_limits.sql` → `form_rate_limits`
- `20261119013000_form_retention.sql` → `form_retention`
- `20261119014000_private_enquiry_staff.sql` → `private_enquiry_staff`
- `20261119015000_staff_directory_email_type.sql` → `staff_directory_email_type`
- `20261119100000_member_directory_safe.sql` → `member_directory_safe`
- `20261119110000_published_news_search.sql` → `published_news_search`

## Blockers

Local timestamps `20261107213000` and `20261114190000` are each shared by two different files. The member-admin messages migration includes destructive account deletion and broadcast functionality with unresolved Auth/Storage and idempotency risks. Legacy business/marketplace migrations contain security and compatibility risks and the live business schema has changed. Other unnamed migrations also need individual schema and access review. Supabase branching was previously denied because the plan does not include it; no production-like rehearsal or verified backup is available here. Reconcile forward-only migrations individually, rehearse and verify grants/RLS and rollback before production writes.

## Vercel incident

Production deployment `dpl_49H1q47KCQQp2zzfpF5uw2H1kzfz` for main commit `585566e` failed at TypeScript: `RadioPlayer` received children although it accepts no props. The earlier `6d356c6` deployment remains promoted. The radio fix renders the server-side sponsor slot beside the player. A successful preview build does not establish production runtime health.
