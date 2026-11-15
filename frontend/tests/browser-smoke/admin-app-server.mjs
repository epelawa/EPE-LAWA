import { spawn } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const [appPackageArg, portArg, dataURL, publishableKey, caPath, siteURL] = process.argv.slice(2);
if (!appPackageArg || !portArg || !dataURL || !publishableKey || !caPath || !siteURL) {
  throw new Error("Admin smoke app server requires an app path, port, synthetic URL/key, CA path, and site URL.");
}

const appPackageDir = resolve(appPackageArg);
const port = String(Number(portArg));
const envPath = join(appPackageDir, ".env.local");
try {
  writeFileSync(envPath, [
    `SUPABASE_URL=${dataURL}`,
    `SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
    `NEXT_PUBLIC_SUPABASE_URL=${dataURL}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${publishableKey}`,
    `NODE_EXTRA_CA_CERTS=${caPath}`,
    "NEXT_TELEMETRY_DISABLED=1",
    `NEXT_PUBLIC_SITE_URL=${siteURL}`,
    "",
  ].join("\n"), { flag: "wx", mode: 0o600 });
} catch (error) {
  if (error?.code === "EEXIST") {
    throw new Error("Admin smoke refuses to overwrite an existing frontend/apps/main/.env.local file.");
  }
  throw error;
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
  NEXT_PUBLIC_SITE_URL: siteURL,
  PORT: port,
};
const nextBin = join(appPackageDir, "node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", port], {
  cwd: appPackageDir,
  env,
  stdio: "inherit",
});
let cleaned = false;
function cleanup() {
  if (cleaned) return;
  cleaned = true;
  rmSync(envPath, { force: true });
}

process.on("SIGINT", () => {
  cleanup();
  child.kill("SIGINT");
});
process.on("SIGTERM", () => {
  cleanup();
  child.kill("SIGTERM");
});
child.on("error", (error) => {
  console.error("Admin smoke Next server failed to start:", error.message);
  cleanup();
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  cleanup();
  process.exitCode = code ?? (signal ? 1 : 0);
});
