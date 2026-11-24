import { notFound } from "next/navigation";

/**
 * Test-only route: throws during render so the e2e suite can check the branded
 * error page. It is a 404 unless E2E_TEST_ROUTES=true, which only the server
 * started by playwright.config.ts sets (NODE_ENV is "production" there, since
 * the journeys run against `next build` + `next start`).
 */
export default function E2eErrorPage() {
  if (process.env.E2E_TEST_ROUTES !== "true") notFound();
  throw new Error("Forced render error for the e2e error-page test.");
}
