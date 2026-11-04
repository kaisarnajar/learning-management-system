import { expect, test } from "@playwright/test";
import { AUTH_STATE, db, FIXTURES, hasDatabase } from "./support/db";
import { confirmDialog, rowWith } from "./support/ui";

test.skip(!hasDatabase, "DATABASE_URL_TEST is not set");
test.use({ storageState: AUTH_STATE.admin });

test("voiding an approved payment keeps the record, drops it from finance and writes the audit log", async ({ page }) => {
  test.setTimeout(180_000);
  const classmate = await db().user.findUniqueOrThrow({ where: { email: FIXTURES.classmate.email } });
  const enrollment = await db().enrollment.findFirstOrThrow({ where: { userId: classmate.id } });
  const record = await db().paymentRecord.create({
    data: { userId: classmate.id, courseId: enrollment.courseId, amountInrPaise: 34900, paidAt: new Date(), paymentType: "monthly", paymentTypeEnum: "MONTHLY", description: "Monthly fee — E2E void" },
  });
  const submission = await db().coursePaymentSubmission.create({
    data: {
      userId: classmate.id,
      courseId: enrollment.courseId,
      label: "Monthly fee — E2E void",
      amountInrPaise: 34900,
      status: "approved",
      statusEnum: "APPROVED",
      paymentType: "monthly",
      paymentTypeEnum: "MONTHLY",
      upiTransactionId: "VOIDUTR0001",
      paymentRecordId: record.id,
    },
  });

  await test.step("it counts towards income before it is voided", async () => {
    await page.goto("/admin/finance?preset=all_time");
    await expect(page.getByText("Monthly fee — E2E void").first()).toBeVisible();
  });

  await test.step("the admin voids it with a reason", async () => {
    await page.goto("/admin/completed-payments?type=monthly_approved");
    await rowWith(page, "VOIDUTR0001").getByRole("button", { name: "Void" }).click();
    await confirmDialog(page, "Void", "Entered by mistake during the end-to-end run");

    await expect.poll(async () => (await db().paymentRecord.findUniqueOrThrow({ where: { id: record.id } })).voidedAt).not.toBeNull();
    const voided = await db().paymentRecord.findUniqueOrThrow({ where: { id: record.id } });
    expect(voided.voidReason).toBe("Entered by mistake during the end-to-end run");
    expect((await db().coursePaymentSubmission.findUniqueOrThrow({ where: { id: submission.id } })).deletedAt).not.toBeNull();
  });

  await test.step("it no longer appears in finance, but the audit log shows who voided it and why", async () => {
    await page.goto("/admin/finance?preset=all_time");
    await expect(page.getByText("Monthly fee — E2E void")).toHaveCount(0);

    await page.goto("/admin/audit-log");
    const entry = rowWith(page, record.id);
    await expect(entry).toContainText(/void/i);
    await expect(entry).toContainText(FIXTURES.admin.email);
    await expect(entry).toContainText("Entered by mistake during the end-to-end run");
  });
});
