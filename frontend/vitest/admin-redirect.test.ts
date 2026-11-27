import { expect, it } from "vitest";
import { adminRouterHref, standaloneAdminRedirectHref } from "../apps/admin/lib/admin-path";

it.each([
  ["native form", "/admin/events", { "content-type": "multipart/form-data; boundary=synthetic" }, "/admin/events"],
  ["native unprefixed form", "/events", { "content-type": "application/x-www-form-urlencoded" }, "/admin/events"],
  ["enhanced action", "/admin/events", { "next-action": "synthetic", "content-type": "multipart/form-data; boundary=synthetic" }, "/events"],
  ["render", "/admin/events", {}, "/events"],
])("keeps standalone %s redirects inside the workspace", (_mode, input, request, expected) => {
  expect(standaloneAdminRedirectHref(`${input}?result=saved`, new Headers(request))).toBe(`${expected}?result=saved`);
});

it("preserves the public app's same-origin admin URL", () => {
  expect(adminRouterHref("/admin/events?result=saved", false)).toBe("/admin/events?result=saved");
});
