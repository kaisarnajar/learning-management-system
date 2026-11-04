import { expect, test } from "@playwright/test";
import { hasDatabase } from "./support/db";

test.skip(!hasDatabase, "DATABASE_URL_TEST is not set");

const PUBLIC_PAGES = ["/", "/courses", "/blog", "/fatwa", "/library", "/bookstore", "/teachers", "/announcements", "/login", "/register"];

test("public pages load under the enforced CSP without violations", async ({ page }) => {
  const violations: string[] = [];
  const serverErrors: string[] = [];
  const unauthorized: string[] = [];
  page.on("console", (message) => {
    if (/content security policy|refused to (load|execute|apply)/i.test(message.text())) violations.push(message.text());
  });
  page.on("pageerror", (error) => violations.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
    if (response.status() === 401) unauthorized.push(response.url());
  });

  for (const path of PUBLIC_PAGES) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    expect(response?.headers()["content-security-policy"], `CSP header on ${path}`).toContain("script-src");
    expect(response?.headers()["content-security-policy-report-only"], path).toBeUndefined();
  }

  expect(violations).toEqual([]);
  expect(serverErrors).toEqual([]);
  console.log("401s:", [...new Set(unauthorized)]);
});

test("the removed demo seed endpoint answers 404", async ({ request }) => {
  for (const url of ["/api/dev/seed", "/api/dev/seed?secret=seed123"]) {
    expect((await request.get(url)).status(), url).toBe(404);
  }
});
