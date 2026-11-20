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
    // Recycle each worker's module registry between files so jsdom globals and
    // React scheduling state cannot leak across contracts. The original
    // `isolate: false` made the suite order-dependent: scroll-to-top and
    // session-recovery failed intermittently depending on which files shared
    // a worker. A bounded pool keeps at most two warm workers, so enabling
    // isolation does not reintroduce the per-file worker-startup timeout.
    maxWorkers: 2,
    isolate: true,
  },
});
