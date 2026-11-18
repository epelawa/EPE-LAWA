import { expect, it } from "vitest";
import { safeAuthNext } from "../apps/main/lib/safe-auth-next";

it("rejects redirects that URL parsing could turn into external origins", () => {
  for (const value of ["//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "https://evil.example", "/..//evil.example", "/.//evil.example", "/%2e%2e//evil.example", "/" + "a".repeat(2048), null]) {
    expect(safeAuthNext(value)).toBe("/dashboard");
  }
  const decodedAttack = new URL("https://site.example/auth/callback?next=%2F%09%2Fevil.example").searchParams.get("next");
  expect(new URL(decodedAttack!, "https://site.example").origin).toBe("https://evil.example");
  expect(new URL(safeAuthNext(decodedAttack), "https://site.example").origin).toBe("https://site.example");
});
it("keeps valid local destinations, queries and fragments", () => {
  for (const value of ["/dashboard", "/news/story?ref=hello#comments", "/forum?x=1", "/%2f/evil.example"]) {
    expect(safeAuthNext(value)).toBe(value);
    expect(new URL(safeAuthNext(value), "https://site.example").origin).toBe("https://site.example");
  }
});
