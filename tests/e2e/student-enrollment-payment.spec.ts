import { expect, test } from "@playwright/test";
import { AUTH_STATE, COMPLETE_PROFILE, db, FIXTURES, hasDatabase } from "./support/db";
import { confirmDialog, rowWith, signIn, verifyEmailThroughLink } from "./support/ui";

test.skip(!hasDatabase, "DATABASE_URL_TEST is not set");

const STUDENT = { name: "Journey Student", email: "journey.student@e2e.test", password: "Journey-Pass-1" };

test("register, verify, complete the profile, enrol, pay, get approved and download the receipt", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await test.step("register with e-mail and password", async () => {
    await page.goto("/register");
    await page.locator("#name").fill(STUDENT.name);
    await page.locator("#email").fill(STUDENT.email);
    await page.locator("#password").fill(STUDENT.password);
    await page.locator("#acceptPolicies").check();
    await page.getByRole("button", { name: /register with email/i }).click();
    // An unverified address cannot sign in yet, so the form sends the student to the login page.
    await page.waitForURL(/\/login\?registered=1/);
    const created = await db().user.findUniqueOrThrow({ where: { email: STUDENT.email } });
    expect(created.emailVerified).toBeNull();
    expect(created.password).not.toBe(STUDENT.password);
  });

  await test.step("an unverified account cannot sign in", async () => {
    await page.locator("#email").fill(STUDENT.email);
    await page.locator("#password").fill(STUDENT.password);
    await page.getByRole("button", { name: /sign in with email/i }).click();
    await expect(page.getByText(/please verify your email/i)).toBeVisible();
  });

  await test.step("verify the e-mail address and sign in", async () => {
    await verifyEmailThroughLink(page, STUDENT.email);
    await signIn(page, STUDENT.email, STUDENT.password);
    expect((await db().user.findUniqueOrThrow({ where: { email: STUDENT.email } })).emailVerified).not.toBeNull();
  });

  await test.step("enrolling is blocked until the profile is complete", async () => {
    await page.goto(`/courses/${FIXTURES.course.id}`);
    await expect(page.getByRole("link", { name: /complete profile to enroll/i })).toBeVisible();
  });

  await test.step("complete the profile", async () => {
    await page.goto("/profile");
    await page.getByRole("button", { name: /edit details/i }).click();
    await page.locator("#fatherName").fill(COMPLETE_PROFILE.fatherName);
    await page.locator("#gender").selectOption({ label: "Male" });
    await page.locator("#dateOfBirth").fill("1995-04-12");
    await page.locator("#occupation").selectOption({ label: "Student" });
    await page.locator("#address").fill(COMPLETE_PROFILE.address);
    await page.locator("#whatsapp").fill("9876543210");
    await page.getByRole("button", { name: /save profile/i }).click();
    await expect.poll(async () => (await db().user.findUniqueOrThrow({ where: { email: STUDENT.email } })).fatherName).toBe(COMPLETE_PROFILE.fatherName);
  });

  await test.step("request enrolment and pay the enrolment fee", async () => {
    await page.goto(`/courses/${FIXTURES.course.id}`);
    await page.getByRole("button", { name: /enroll/i }).first().click();
    await page.waitForURL(/\/profile\/courses\/e2e-tajweed\/enrollment-pay/);
    await page.getByLabel(/transaction \/ utr reference/i).fill("E2EUTR000001");
    await page.getByRole("button", { name: /submit enrollment fee for verification/i }).click();
    await page.waitForURL(/\/profile\/payments/);

    const enrollment = await db().enrollment.findFirstOrThrow({ where: { user: { email: STUDENT.email } } });
    expect(enrollment.statusEnum).toBe("AWAITING_ENROLLMENT_FEE");
    const submission = await db().coursePaymentSubmission.findFirstOrThrow({ where: { user: { email: STUDENT.email } } });
    expect(submission).toMatchObject({ statusEnum: "PENDING_VERIFICATION", amountInrPaise: FIXTURES.course.enrollmentFeePaise, upiTransactionId: "E2EUTR000001" });
  });

  const admin = await browser.newContext({ storageState: AUTH_STATE.admin });
  const adminPage = await admin.newPage();

  await test.step("the admin confirms the payment", async () => {
    await adminPage.goto("/admin/payments");
    const row = rowWith(adminPage, STUDENT.name);
    await expect(row).toContainText("E2EUTR000001");
    await row.getByRole("button", { name: "Confirm" }).click();
    await confirmDialog(adminPage, "Confirm");
    await expect.poll(async () =>
      (await db().coursePaymentSubmission.findFirstOrThrow({ where: { user: { email: STUDENT.email } } })).statusEnum,
    ).toBe("APPROVED");

    const enrollment = await db().enrollment.findFirstOrThrow({ where: { user: { email: STUDENT.email } } });
    expect(enrollment).toMatchObject({ statusEnum: "ACTIVE", rollNumber: 2 }); // the seeded classmate holds roll number 1
  });

  await test.step("the student sees the approval notification", async () => {
    await page.goto("/profile/notifications");
    await expect(page.getByText(/payment approved/i).first()).toBeVisible();
  });

  await test.step("the admin generates the receipt", async () => {
    await adminPage.goto("/admin/completed-payments");
    const row = rowWith(adminPage, STUDENT.name);
    await row.getByRole("button", { name: /generate receipt/i }).click();
    await expect.poll(async () => (await db().paymentRecord.findFirstOrThrow({ where: { user: { email: STUDENT.email } } })).invoiceNumber).toMatch(/^[A-Z]+-INV\/\d{4}-\d{2}\/\d{5}$/);
  });

  await test.step("the student downloads the receipt PDF; another student cannot", async () => {
    const record = await db().paymentRecord.findFirstOrThrow({ where: { user: { email: STUDENT.email } } });
    const own = await page.request.get(`/api/receipt/${record.id}`);
    expect(own.status()).toBe(200);
    expect(own.headers()["content-type"]).toContain("application/pdf");
    expect((await own.body()).subarray(0, 5).toString()).toBe("%PDF-");

    const stranger = await browser.newContext({ storageState: AUTH_STATE.buyer });
    expect((await stranger.request.get(`/api/receipt/${record.id}`)).status()).toBe(404);
    await stranger.close();
  });

  await admin.close();
});
