import { test } from "node:test";
import assert from "node:assert/strict";
import { handleResendSignupVerification, handleVerifyEmailOtp } from "../apps/main/lib/auth-otp.ts";

const callback = "https://epelawa.vercel.app/auth/callback?next=%2Fauth%2Fcomplete";

function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function clientFactory(auth) {
  let calls = 0;
  return {
    createClient: async () => {
      calls += 1;
      return { auth };
    },
    calls: () => calls,
  };
}

test("OTP rejects malformed email or code before contacting Supabase", async () => {
  const factory = clientFactory({
    verifyOtp: async () => ({ error: null }),
    resend: async () => ({ error: null }),
  });

  const badEmail = await handleVerifyEmailOtp(form({ email: "not-an-email", token: "123456" }), factory.createClient, callback);
  const badToken = await handleVerifyEmailOtp(form({ email: "member@example.com", token: "12ab56" }), factory.createClient, callback);

  assert.equal(badEmail.status, "error");
  assert.equal(badToken.status, "error");
  assert.equal(factory.calls(), 0);
});

test("valid signup OTP is passed to Supabase and completes profile setup before the dashboard", async () => {
  const received = [];
  const factory = clientFactory({
    verifyOtp: async (input) => { received.push(input); return { error: null }; },
    resend: async () => ({ error: null }),
  });

  const result = await handleVerifyEmailOtp(form({ email: " MEMBER@Example.com ", token: "123 45678" }), factory.createClient, callback);

  assert.deepEqual(received, [{ email: "member@example.com", token: "12345678", type: "signup" }]);
  assert.deepEqual(result, { redirectTo: "/auth/complete" });
  assert.equal(factory.calls(), 1);
});

test("OTP verification is blocked by the persistent rate-limit gate before Supabase", async () => {
  const factory = clientFactory({ verifyOtp: async () => ({ error: null }), resend: async () => ({ error: null }) });
  let gated = "";
  const result = await handleVerifyEmailOtp(form({ email: "member@example.com", token: "123456" }), factory.createClient, callback, async (email) => { gated = email; return false; });
  assert.equal(gated, "member@example.com");
  assert.equal(result.status, "error");
  assert.equal(factory.calls(), 0);
});

test("invalid or expired OTP never redirects and does not expose provider errors", async () => {
  const factory = clientFactory({
    verifyOtp: async () => ({ error: { message: "Token has expired for member@example.com" } }),
    resend: async () => ({ error: null }),
  });

  const result = await handleVerifyEmailOtp(form({ email: "member@example.com", token: "12345678" }), factory.createClient, callback);

  assert.equal(result.status, "error");
  assert.match(result.message, /could not be verified/i);
  assert.doesNotMatch(result.message, /expired|member@example\.com/i);
  assert.equal("redirectTo" in result, false);
});

test("resend success is account-enumeration-safe and uses the fixed confirmation callback", async () => {
  const received = [];
  const factory = clientFactory({
    resend: async (input) => { received.push(input); return { error: null }; },
    verifyOtp: async () => ({ error: null }),
  });

  const result = await handleResendSignupVerification(form({ email: " MEMBER@Example.com " }), factory.createClient, callback);

  assert.equal(result.status, "notice");
  assert.match(result.message, /If an account is awaiting verification/);
  assert.doesNotMatch(result.message, /member@example\.com/i);
  assert.deepEqual(received, [{ type: "signup", email: "member@example.com", options: { emailRedirectTo: callback } }]);
});

test("resend provider failures return the same generic error without claiming delivery or exposing account state", async () => {
  const providerError = { message: "Email rate limit exceeded for member@example.com" };
  const factory = clientFactory({
    resend: async () => ({ error: providerError }),
    verifyOtp: async () => ({ error: null }),
  });

  const first = await handleResendSignupVerification(form({ email: "first@example.com" }), factory.createClient, callback);
  const second = await handleResendSignupVerification(form({ email: "second@example.com" }), factory.createClient, callback);

  assert.equal(first.status, "error");
  assert.equal(second.status, "error");
  assert.equal(first.message, second.message);
  assert.match(first.message, /couldn’t request a fresh verification message/i);
  assert.doesNotMatch(first.message, /rate limit|first@example|second@example/i);
  assert.equal(factory.calls(), 2);
});

test("resend transport exceptions are reported as a generic failure", async () => {
  const factory = clientFactory({
    resend: async () => { throw new Error("private provider diagnostic"); },
    verifyOtp: async () => ({ error: null }),
  });

  const result = await handleResendSignupVerification(form({ email: "member@example.com" }), factory.createClient, callback);

  assert.equal(result.status, "error");
  assert.match(result.message, /try again later/i);
  assert.doesNotMatch(result.message, /private provider diagnostic/i);
});
