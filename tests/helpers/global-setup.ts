import { execSync } from "node:child_process";

/**
 * Applies the committed migrations (`prisma migrate deploy`, never db push)
 * to the disposable test database once per run. Does nothing, and the DB
 * suites skip themselves, when DATABASE_URL_TEST is not set.
 *
 * Refuses to touch a database that does not look disposable, so a mistyped
 * variable can never point the suites (which truncate every table) at
 * production.
 */
function assertDisposable(url: string): void {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  const database = parsed.pathname.replace(/^\//, "").toLowerCase();
  const local = ["localhost", "127.0.0.1", "::1", "[::1]", "postgres"].includes(host);
  if (!local && !database.includes("test")) {
    throw new Error(
      `DATABASE_URL_TEST (${host}/${database}) is not a local host and its name does not contain "test"; refusing to run destructive tests against it.`,
    );
  }
}

export default function setup(): void {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) return;
  assertDisposable(url);

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: process.env.DIRECT_URL_TEST ?? url },
  });
}
