import test from "node:test";
import assert from "node:assert/strict";
import { authErrorToastMessage, normalizeCampaignAttribution, recognizedCampaignSource } from "../apps/main/lib/campaign-attribution.ts";
import { safeAuthNext } from "../apps/main/lib/safe-auth-next.ts";

test("Google campaign parameters normalize to standard UTM names and keep campaign details", () => {
  const params = new URLSearchParams("next-utmfrom=Google+Ads&utm_medium=cpc&utm_campaign=epe_lawa_search");
  assert.equal(normalizeCampaignAttribution(params), true);
  assert.equal(params.get("utm_source"), "google");
  assert.equal(params.get("utm_medium"), "cpc");
  assert.equal(params.get("utm_campaign"), "epe_lawa_search");
  assert.equal(params.has("next-utmfrom"), false);
  assert.deepEqual(recognizedCampaignSource("Bing"), { key: "bing", label: "Bing" });
  assert.deepEqual(recognizedCampaignSource("DuckDuckGo"), { key: "duckduckgo", label: "DuckDuckGo" });
  assert.deepEqual(recognizedCampaignSource("Ecosia"), { key: "ecosia", label: "Ecosia" });
  assert.deepEqual(recognizedCampaignSource("Brave"), { key: "brave", label: "Brave Search" });
});

test("auth URL errors produce a fixed toast and never reflect arbitrary provider text", () => {
  const expired = new URLSearchParams("errMessage=Your+sign-in+session+has+expired.+Please+sign+in+again.&from=google");
  assert.equal(authErrorToastMessage(expired), "Your Google sign-in session for EPE LAWA has expired. Please sign in again.");
  const untrusted = new URLSearchParams("errMessage=%3Cscript%3Ealert(1)%3C%2Fscript%3E&from=attacker.example");
  const message = authErrorToastMessage(untrusted);
  assert.equal(message, "We couldn’t complete sign-in to EPE LAWA. Please try again.");
  assert.doesNotMatch(message, /script|attacker/);
  assert.equal(authErrorToastMessage(new URLSearchParams("utm_source=google")), null);
});

test("safe return paths reject external, protocol-relative, and backslash destinations", () => {
  assert.equal(safeAuthNext("https://attacker.example"), "/dashboard");
  assert.equal(safeAuthNext("//attacker.example"), "/dashboard");
  assert.equal(safeAuthNext("/\\attacker.example"), "/dashboard");
  assert.equal(safeAuthNext("/news/local-story?tab=comments#latest"), "/news/local-story?tab=comments#latest");
});
