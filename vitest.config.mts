import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;
const alias = { "@": root };

// Suites that need Postgres share one disposable database, so their files run
// one at a time. They are skipped when DATABASE_URL_TEST is not set.
const dbProject = (name: string, include: string[]) => ({
  resolve: { alias },
  test: {
    name,
    environment: "node" as const,
    include,
    setupFiles: [path.join(root, "tests/helpers/db-setup.ts")],
    globalSetup: [path.join(root, "tests/helpers/global-setup.ts")],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          setupFiles: [path.join(root, "tests/helpers/unit-setup.ts")],
        },
      },
      dbProject("integration", ["tests/integration/**/*.test.ts"]),
    ],
  },
});
