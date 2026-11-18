-- Emergency fail-closed candidate; do not apply to production before schema
-- reconciliation, backup, isolated rehearsal and explicit deployment approval.
-- The old anonymous signup function lets callers replace an existing address's
-- unsubscribe token. Preserve unsubscribe while disabling this signup path.
revoke all on function public.newsletter_subscribe_request(text, text, text, timestamptz) from public, anon, authenticated;
