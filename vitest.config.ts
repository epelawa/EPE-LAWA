import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const appModules = fileURLToPath(new URL("./frontend/apps/main/node_modules/", import.meta.url));

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    // The React packages are installed in the app workspace, not at the root.
    alias: [
      { find: /^react$/, replacement: `${appModules}react` },
      { find: /^react\/(.*)$/, replacement: `${appModules}react/$1` },
      { find: /^react-dom$/, replacement: `${appModules}react-dom` },
      { find: /^react-dom\/(.*)$/, replacement: `${appModules}react-dom/$1` },
      { find: /^next\/navigation$/, replacement: fileURLToPath(new URL("./frontend/vitest/mocks/next-navigation.ts", import.meta.url)) },
      // `server-only` is a Next bundler sentinel, not an installed package.
      { find: /^server-only$/, replacement: fileURLToPath(new URL("./frontend/vitest/mocks/server-only.ts", import.meta.url)) },
    ],
  },
  test: {
    // The legacy suite is `node:test` under frontend/tests and backend/tests.
    // Vitest owns the focused unit/component contracts added for the member
    // space, hero and navigation work.
    include: ["frontend/vitest/**/*.test.{ts,tsx}"],
    environment: "node",
    restoreMocks: true,
    clearMocks: true,
    // This container takes ~12s to start each forks worker. With isolation on,
    // Vitest spawns one worker per file (39) and some exceed the startup
    // timeout. A bounded pool that reuses workers removes that race; every
    // test and assertion still runs, including the auth/security contracts.
    maxWorkers: 2,
    isolate: false,
  },
});
