import { defineConfig } from "@playwright/test";
import base from "../playwright.smoke.config";
export default defineConfig({ ...base, testDir: ".", webServer: [], outputDir: "/tmp/epe-radio-smoke-results" });
