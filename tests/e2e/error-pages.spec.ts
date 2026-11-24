import { expect, test } from "@playwright/test";
import { hasDatabase } from "./support/db";

test.skip(!hasDatabase, "DATABASE_URL_TEST is not set");

test("an unknown URL shows the branded 404 inside the site layout", async ({ page }) => {
  const response = await page.goto("/does-not-exist");
  expect(response?.status()).toBe(404);
  const state = page.getByTestId("error-state");
  await expect(state.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(state.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  // Rendered inside the root layout, so the site header is still there.
  await expect(page.locator("header").first()).toBeVisible();
});

test("a render error shows the branded error page with a retry button", async ({ page }) => {
  await page.goto("/e2e-error");
  const state = page.getByTestId("error-state");
  await expect(state.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
  await expect(state.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(state.getByText(/^Reference: /)).toBeVisible();
});
