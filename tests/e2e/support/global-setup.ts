import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";
import { AUTH_STATE, disconnect, FIXTURES, hasDatabase, resetAndSeed } from "./db";

/**
 * Applies the committed migrations to the disposable database, loads the
 * fixtures and saves a signed-in browser state for each seeded role so the
 * journeys do not repeat the login form.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  if (!hasDatabase) return;

  const url = process.env.DATABASE_URL_TEST!;
  const parsed = new URL(url);
  const local = ["localhost", "127.0.0.1", "::1", "[::1]", "postgres"].includes(parsed.hostname.toLowerCase());
  if (!local && !parsed.pathname.toLowerCase().includes("test")) {
    throw new Error("DATABASE_URL_TEST does not look disposable; refusing to truncate it.");
  }

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: process.env.DIRECT_URL_TEST ?? url },
  });
  await resetAndSeed();
  await disconnect();

  const baseURL = config.projects[0].use.baseURL!;
  const browser = await chromium.launch();
  try {
    const accounts: Array<[keyof typeof AUTH_STATE, string, string]> = [
      ["admin", FIXTURES.admin.email, "/admin"],
      ["teacher", FIXTURES.teacher.email, "/teacher"],
      ["buyer", FIXTURES.buyer.email, "/"],
    ];
    for (const [role, email, landing] of accounts) {
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      await page.goto("/login");
      await page.locator("#email").fill(email);
      await page.locator("#password").fill(FIXTURES.password);
      await page.getByRole("button", { name: /sign in with email/i }).click();
      await page.waitForURL((u) => u.pathname.startsWith(landing === "/" ? "/" : landing) && u.pathname !== "/login", { timeout: 30_000 });
      mkdirSync(path.dirname(AUTH_STATE[role]), { recursive: true });
      await context.storageState({ path: AUTH_STATE[role] });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
