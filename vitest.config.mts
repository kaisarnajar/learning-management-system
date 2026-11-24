import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;
const alias = { "@": root };

// Suites that need Postgres share one disposable database, so their files run
// one at a time, and each project gets its own `sequence.groupOrder` so that
// `npm test` runs integration, then api, then security, never two at once
// (each truncates every table). They are skipped when DATABASE_URL_TEST is not set.
const dbProject = (name: string, groupOrder: number, include: string[]) => ({
  resolve: { alias },
  test: {
    name,
    environment: "node" as const,
    include,
    setupFiles: [path.join(root, "tests/helpers/db-setup.ts")],
    globalSetup: [path.join(root, "tests/helpers/global-setup.ts")],
    fileParallelism: false,
    sequence: { groupOrder },
    // next-auth imports "next/server" without an extension, which Node ESM cannot resolve.
    server: { deps: { inline: ["next-auth"] } },
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
          sequence: { groupOrder: 0 },
        },
      },
      dbProject("integration", 1, ["tests/integration/**/*.test.ts"]),
      dbProject("api", 2, ["tests/api/**/*.test.ts"]),
      dbProject("security", 3, ["tests/security/**/*.test.ts"]),
    ],
    // `npm run test:coverage`. Thresholds apply to services/ (the business
    // rules) and are a ratchet: raise them as coverage grows, never lower them.
    coverage: {
      provider: "v8",
      include: ["services/**/*.ts", "utils/**/*.ts", "app/**/*.ts"],
      exclude: ["**/*.d.ts"],
      reporter: ["text-summary", "html", "json-summary"],
      reportsDirectory: "coverage",
      thresholds: {
        // Measured 2026-11-24 (all four projects): 61.4 / 51.4 / 59.7 / 63.9.
        "services/**": { statements: 60, branches: 50, functions: 58, lines: 62 },
      },
    },
  },
});
