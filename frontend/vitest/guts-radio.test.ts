import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
import { parseGutsStation } from "../apps/main/lib/guts-radio";
const record = { name: "Guts FM", frequency: "104.9 FM", streamUrl: "https://radio.example.com:8443/live" };
describe("Guts catalogue selection", () => {
  it("accepts one matching HTTPS station including its broadcaster port", () => {
    expect(parseGutsStation({ data: [record] })).toEqual({ name: "Guts FM", frequency: "104.9 FM", streamUrl: record.streamUrl });
    expect(parseGutsStation({ data: [{ ...record, name: "Guts 104.9 FM" }] })).not.toBeNull();
  });
  it("rejects unrelated, ambiguous, insecure and local streams", () => {
    expect(parseGutsStation({ data: [{ ...record, name: "Not Guts FM" }] })).toBeNull();
    expect(parseGutsStation({ data: [record, record] })).toBeNull();
    for (const streamUrl of ["http://radio.example.com/live", "https://127.0.0.1/live", "https://example.local/live", "https://user:pass@example.com/live"]) expect(parseGutsStation({ data: [{ ...record, streamUrl }] })).toBeNull();
  });
});
