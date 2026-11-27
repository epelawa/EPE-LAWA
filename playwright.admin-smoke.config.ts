import { defineConfig } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const appPort = 3101;
const proxyPort = 3102;
const dataPort = 5443;
const controlPort = 5444;
const baseURL = process.env.ADMIN_SMOKE_BASE_URL ?? `https://localhost:${proxyPort}`;
const dataURL = `https://127.0.0.1:${dataPort}`;
const controlURL = `http://127.0.0.1:${controlPort}`;
const appDir = resolve(process.env.ADMIN_SMOKE_APP_DIR ?? process.cwd());
const appPackageDir = resolve(appDir, "frontend/apps/main");
const syntheticKey = "sb_publishable_local-admin-dashboard-only";
const certDir = mkdtempSync(join(tmpdir(), "epe-lawa-admin-smoke-"));
const keyPath = join(certDir, "key.pem");
const certPath = join(certDir, "cert.pem");
execFileSync("openssl", [
  "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
  "-keyout", keyPath, "-out", certPath, "-subj", "/CN=localhost",
  "-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost",
], { stdio: "ignore" });

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

const fixtureCommand = [
  shellQuote(process.execPath),
  shellQuote(resolve(process.cwd(), "frontend/tests/browser-smoke/admin-supabase-stub.mjs")),
  String(dataPort), String(controlPort), shellQuote(keyPath), shellQuote(certPath),
].join(" ");
const proxyCommand = [
  shellQuote(process.execPath),
  shellQuote(resolve(process.cwd(), "frontend/tests/browser-smoke/admin-app-proxy.mjs")),
  String(appPort), String(proxyPort), shellQuote(keyPath), shellQuote(certPath),
].join(" ");
const appCommand = [
  shellQuote(process.execPath),
  shellQuote(resolve(process.cwd(), "frontend/tests/browser-smoke/admin-app-server.mjs")),
  shellQuote(appPackageDir), String(appPort), shellQuote(dataURL), shellQuote(syntheticKey),
  shellQuote(certPath), shellQuote(baseURL),
].join(" ");

export default defineConfig({
  testDir: "./frontend/tests/browser-smoke",
  testMatch: "admin-dashboard.admin-smoke.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 45_000,
  expect: { timeout: 12_000 },
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: fixtureCommand,
      url: `${controlURL}/__admin-smoke__/health`,
      reuseExistingServer: false,
      timeout: 10_000,
    },
    {
      command: appCommand,
      url: `http://127.0.0.1:${appPort}/admin`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: proxyCommand,
      // The public root may be in maintenance while the staff app is healthy.
      url: new URL("/admin/login", baseURL).href,
      ignoreHTTPSErrors: true,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
