import { describe, expect, it } from "vitest";
import { cronAccessToken, cronRequestAuthorized } from "../apps/main/lib/cron-token";

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;
const CRON = env({ CRON_SECRET: "a-long-cron-secret-value-123" });
const headers = (init: Record<string, string>) => new Headers(init);

describe("cron access token (admin Cron page → cron-job.org)", () => {
  it("is derived, stable, and never the raw secret", () => {
    const token = cronAccessToken(CRON)!;
    expect(token).toMatch(/^epl_cron_v1_[A-Za-z0-9_-]{43}$/);
    expect(token).toBe(cronAccessToken(CRON));
    expect(token).not.toContain("a-long-cron-secret-value-123");
    expect(cronAccessToken(env({ CRON_SECRET: "a-different-cron-secret-456" }))).not.toBe(token);
  });

  it("falls back to FORM_RATE_SECRET, and is null when nothing usable is configured", () => {
    const fallback = cronAccessToken(env({ FORM_RATE_SECRET: "f".repeat(40) }));
    expect(fallback).toMatch(/^epl_cron_v1_/);
    expect(cronAccessToken(env({ CRON_SECRET: "short", FORM_RATE_SECRET: "f".repeat(40) }))).toBe(fallback);
    expect(cronAccessToken(env({}))).toBeNull();
    expect(cronAccessToken(env({ CRON_SECRET: "short", FORM_RATE_SECRET: "too-short" }))).toBeNull();
  });

  it("authorises the copied token in x-cron-secret or Authorization: Bearer", () => {
    const token = cronAccessToken(CRON)!;
    expect(cronRequestAuthorized(headers({ "x-cron-secret": token }), CRON)).toBe(true);
    expect(cronRequestAuthorized(headers({ "x-cron-secret": ` ${token} ` }), CRON)).toBe(true);
    expect(cronRequestAuthorized(headers({ authorization: `Bearer ${token}` }), CRON)).toBe(true);
  });

  it("keeps existing setups that send the raw CRON_SECRET working", () => {
    expect(cronRequestAuthorized(headers({ "x-cron-secret": "a-long-cron-secret-value-123" }), CRON)).toBe(true);
    expect(cronRequestAuthorized(headers({ "x-cron-secret": "legacy" }), env({ CRON_SECRET: "legacy" }))).toBe(true);
  });

  it("refuses missing, wrong, altered or oversized values, and everything when unconfigured", () => {
    const token = cronAccessToken(CRON)!;
    for (const h of [{}, { "x-cron-secret": "" }, { "x-cron-secret": "nope" }, { "x-cron-secret": token.slice(0, -1) + (token.endsWith("A") ? "B" : "A") },
      { authorization: token }, { authorization: `Basic ${token}` }, { "x-cron-secret": "x".repeat(600) }]) {
      expect(cronRequestAuthorized(headers(h), CRON)).toBe(false);
    }
    expect(cronRequestAuthorized(headers({ "x-cron-secret": token }), env({}))).toBe(false);
    expect(cronRequestAuthorized(headers({ "x-cron-secret": token }), env({ CRON_SECRET: "a-different-cron-secret-456" }))).toBe(false);
  });
});
