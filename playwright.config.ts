import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end journeys against a production build (`next build` + `next start`)
 * backed by a disposable Postgres (DATABASE_URL_TEST). The journeys write to
 * that database, so they are skipped when the variable is absent.
 *
 *   npm run build            # once
 *   npm run test:e2e
 *
 * CSP_ENFORCE=true is set for the server so a page that needs an inline script
 * or an un-allow-listed origin fails here before the policy is enforced in
 * production (see docs/TESTING.md).
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const databaseUrl = process.env.DATABASE_URL_TEST ?? "";

export const E2E_ENV = {
  ADMIN_EMAIL: "admin@e2e.test",
  AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-0123456789",
  NEXT_PUBLIC_APP_URL: BASE_URL,
  NEXTAUTH_URL: BASE_URL,
  AUTH_URL: BASE_URL,
  AUTH_TRUST_HOST: "true",
  CSP_ENFORCE: "true",
  RATE_LIMIT_DISABLED: "true",
};

export default defineConfig({
  testDir: path.join(__dirname, "tests/e2e"),
  testMatch: "**/*.spec.ts",
  globalSetup: path.join(__dirname, "tests/e2e/support/global-setup.ts"),
  // The journeys share one database and run in a fixed order.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  ...(databaseUrl
    ? {
        webServer: {
          command: `npx next start --hostname 127.0.0.1 --port ${PORT}`,
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            ...(process.env as Record<string, string>),
            ...E2E_ENV,
            DATABASE_URL: databaseUrl,
            DIRECT_URL: process.env.DIRECT_URL_TEST ?? databaseUrl,
          },
        },
      }
    : {}),
});
