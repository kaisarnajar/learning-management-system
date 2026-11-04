import { createHash } from "node:crypto";
import { expect, type Locator, type Page } from "@playwright/test";
import { db, FIXTURES } from "./db";

/** Signs in through the real login form. */
export async function signIn(page: Page, email: string, password: string = FIXTURES.password): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in with email/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
}

/**
 * The verification link is e-mailed and only its hash is stored, so the test
 * replaces the stored token with one it knows and opens that link.
 */
export async function verifyEmailThroughLink(page: Page, email: string): Promise<void> {
  const token = `e2e-${createHash("sha256").update(email).digest("hex")}`;
  await db().verificationToken.deleteMany({ where: { identifier: email } });
  await db().verificationToken.create({
    data: { identifier: email, token: createHash("sha256").update(token).digest("hex"), expires: new Date(Date.now() + 3_600_000) },
  });
  await page.goto(`/verify-email?token=${encodeURIComponent(token)}`);
  await page.getByRole("button", { name: /confirm email/i }).click();
  await expect(page.getByRole("heading", { name: "Email Verified" })).toBeVisible();
}

/** The table row that mentions `text` (a name, e-mail or reference). */
export function rowWith(page: Page, text: string | RegExp): Locator {
  return page.locator("tr", { hasText: text }).first();
}

/** Confirms the dialog a ConfirmationModal opens (optionally filling the reason field). */
export async function confirmDialog(page: Page, action: string | RegExp, reason?: string): Promise<void> {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  if (reason !== undefined) await dialog.locator("textarea, input[type='text']").first().fill(reason);
  await dialog.getByRole("button", { name: action }).click();
}
