import test from "node:test";
import assert from "node:assert/strict";
import { authLinkIssueFromLocation, authLinkIssueFromParams, authLinkIssuePath } from "../apps/main/lib/auth-link-errors.ts";

test("expired Supabase verification errors map to a clean expired-link page", () => {
  const search = "?error_description=Email%20link%20is%20invalid%20or%20has%20expired&error_code=otp_expired&error=access_denied";
  const hash = "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb=";
  assert.equal(authLinkIssueFromLocation(search, hash), "expired");
  assert.equal(authLinkIssuePath(authLinkIssueFromLocation(search, hash)), "/auth/link-expired");
});

test("hash-only Supabase callback errors are handled without exposing the hash", () => {
  assert.equal(authLinkIssueFromLocation("", "#error_code=otp_expired&error_description=expired"), "expired");
});

test("unknown callback errors use a fixed generic problem page", () => {
  assert.equal(authLinkIssueFromParams(new URLSearchParams("error=access_denied")), "problem");
  assert.equal(authLinkIssuePath("problem"), "/auth/link-problem");
});

test("successful auth fragments and ordinary URLs are not treated as errors", () => {
  assert.equal(authLinkIssueFromLocation("", "#access_token=secret&token_type=bearer&type=signup"), null);
  assert.equal(authLinkIssueFromLocation("?category=local-news", ""), null);
});
