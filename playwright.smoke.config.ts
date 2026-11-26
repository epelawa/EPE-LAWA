import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

const port = 3100;
const fixturePort = 54321;
const baseURL = process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${port}`;
const fixtureURL = `http://localhost:${fixturePort}`;
const appDir = resolve(process.env.SMOKE_APP_DIR ?? process.cwd());
const appPackageDir = resolve(appDir, "frontend/apps/main");
const nextBin = resolve(appPackageDir, "node_modules/.bin/next");
const syntheticKey = "browser-smoke-placeholder-not-a-secret";

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

const appCommand = [
  `cd ${shellQuote(appPackageDir)} && env -i`,
  `PATH=${shellQuote(process.env.PATH ?? "")}`,
  `HOME=${shellQuote(process.env.HOME ?? "/tmp")}`,
  `NEXT_PUBLIC_SUPABASE_URL=${shellQuote(fixtureURL)}`,
  `SUPABASE_ANON_KEY=${shellQuote(syntheticKey)}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${shellQuote(syntheticKey)}`,
  "NEXT_TELEMETRY_DISABLED=1",
  "MAINTENANCE_GATE_ENABLED=false",
  `NEXT_PUBLIC_SITE_URL=${shellQuote(baseURL)}`,
  `PORT=${port}`,
  shellQuote(nextBin),
  "dev --webpack --hostname 127.0.0.1 --port",
  String(port),
].join(" ");

const fixtureCommand = [
  shellQuote(process.execPath),
  shellQuote(resolve(process.cwd(), "frontend/tests/browser-smoke/supabase-stub.mjs")),
  String(fixturePort),
].join(" ");

export default defineConfig({
  testDir: "./frontend/tests/browser-smoke",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] }
      : undefined,
    viewport: { width: 1280, height: 900 },
    actionTimeout: 10_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: fixtureCommand,
      url: `${fixtureURL}/__smoke__/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 10_000,
    },
    {
      command: appCommand,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
