import { afterEach, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { POST as dispatch } from "../apps/main/app/api/push/dispatch/route";
import { POST as scheduled } from "../apps/main/app/api/push/scheduled/route";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
afterEach(() => vi.unstubAllEnvs());

it("does not claim sends or touch subscriptions when the device encryption key is unavailable", async () => {
  vi.stubEnv("NEXT_PUBLIC_WEB_PUSH_ENABLED", "true");
  vi.stubEnv("WEB_PUSH_VAPID_PUBLIC_KEY", "fixture-public");
  vi.stubEnv("WEB_PUSH_VAPID_PRIVATE_KEY", "fixture-private");
  vi.stubEnv("WEB_PUSH_VAPID_SUBJECT", "mailto:fixture@example.invalid");
  vi.stubEnv("PUSH_DISPATCH_SECRET", "fixture-dispatch");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.example.invalid");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fixture-role");
  vi.stubEnv("PUSH_DATA_KEY", undefined);
  vi.stubEnv("FORM_RATE_SECRET", undefined);

  const response = await scheduled();
  const immediate = await dispatch(new Request("http://localhost", {
    method: "POST", headers: { authorization: "Bearer fixture-dispatch" },
  }));
  for (const result of [response, immediate]) {
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({ state: "not_configured" });
  }
  expect(createClient).not.toHaveBeenCalled();
});
