import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
}

const app = "../apps/main/app/";
const dashboard = source(`${app}dashboard/page.tsx`);
const auth = source(`${app}auth/actions.ts`);
const callback = source(`${app}auth/callback/route.ts`);
const otp = source("../apps/main/lib/auth-otp.ts");
const layout = source(`${app}layout.tsx`);
const topbar = source("../apps/main/components/member-topbar.tsx");
const manifest = JSON.parse(source("../apps/main/public/manus-routes.json"));

describe("post-sign-in destination", () => {
  it("has no completion route and sends every auth path to the dashboard", () => {
    expect(auth).not.toContain("/auth/complete");
    expect(callback).not.toContain("/auth/complete");
    expect(otp).not.toContain("/auth/complete");
    expect(dashboard).not.toContain("/auth/complete");

    expect(auth).toMatch(/signInWithPassword[\s\S]*?redirect\("\/dashboard"\)/);
    expect(callback).toContain('? value : "/dashboard"');
    expect(otp).toContain('{ redirectTo: "/dashboard" }');
    expect(manifest.routes.map((route: { path: string }) => route.path)).not.toContain("/auth/complete");
  });

  it("keeps bootstrap, verification and handle completion inside /dashboard", () => {
    expect(dashboard).toContain('rpc("bootstrap_verified_member_profile")');
    expect(dashboard).toContain("<HandleCompletionForm");
    expect(dashboard).toContain("Verify your email to continue");
    expect(dashboard).toMatch(/Profile setup needs attention/);
    expect(dashboard).not.toMatch(/from\("profiles"\)\.insert/);
  });

  it("moves the old completion links into the member dashboard", () => {
    expect(dashboard).toContain("<DashboardServices />");
    for (const href of ["/forum", "/business-directory/orders", "/"]) {
      expect(dashboard).toContain(href);
      expect(source("../apps/main/lib/member-entry.ts")).toContain(`href: "${href}"`);
    }
  });
});

describe("member chrome", () => {
  it("keeps sign out at the top and the bell where the public search icon was", () => {
    expect(topbar).toContain("<SignOutIcon");
    expect(topbar).toMatch(/<form action=\{signOut\}/);
    expect(topbar).toContain("<BellIcon");
    expect(topbar).not.toContain("SearchIcon");
    expect(topbar).toContain("memberMenuIcon");
    expect(topbar).toContain("<BrandedDialog");
  });

  it("mounts the scroll reset for every route", () => {
    expect(layout).toContain('import ScrollToTop from "../components/scroll-to-top"');
    expect(layout).toContain("<ScrollToTop />");
  });
});
