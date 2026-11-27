import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const [appPackageArg, portArg, dataURL, publishableKey, caPath, siteURL] = process.argv.slice(2);
if (!appPackageArg || !portArg || !dataURL || !publishableKey || !caPath || !siteURL) {
  throw new Error("Admin smoke app server requires an app path, port, synthetic URL/key, CA path, and site URL.");
}

const appPackageDir = resolve(appPackageArg);
const port = String(Number(portArg));
const envPath = join(appPackageDir, ".env.local");
if (existsSync(envPath)) {
  throw new Error("Admin smoke requires an isolated checkout without frontend/apps/main/.env.local.");
}

const env = {
  PATH: process.env.PATH ?? "",
  HOME: process.env.HOME ?? "/tmp",
  SUPABASE_URL: dataURL,
  SUPABASE_PUBLISHABLE_KEY: publishableKey,
  NEXT_PUBLIC_SUPABASE_URL: dataURL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: publishableKey,
  NODE_EXTRA_CA_CERTS: caPath,
  NEXT_TELEMETRY_DISABLED: "1",
  BROWSER_SMOKE_TEST: "true",
  NEXT_PUBLIC_SITE_URL: siteURL,
  PORT: port,
};
const nextBin = join(appPackageDir, "node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", port], {
  cwd: appPackageDir,
  env,
  stdio: "inherit",
});
process.on("SIGINT", () => {
  child.kill("SIGINT");
});
process.on("SIGTERM", () => {
  child.kill("SIGTERM");
});
child.on("error", (error) => {
  console.error("Admin smoke Next server failed to start:", error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
