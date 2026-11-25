import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { processEnrollmentPayment } from "@/services/payments";
import { approveFeePayment, declineFeePayment, voidFeePayment, voidManualPayment } from "@/services/payment-approval";
import { createCourse, createUser, resetDb, sessionFor, setPaymentSettings, SKIP_WITHOUT_DB, startedEnrollment } from "../helpers/db";

/**
 * The service behind the admin payment actions (and, later, the staff API)
 * answers with typed results instead of redirects. The flows themselves are
 * covered through the actions in payments.test.ts and audit-and-void.test.ts.
 */
describe.skipIf(SKIP_WITHOUT_DB)("payment approval service", () => {
  beforeEach(async () => {
    await resetDb();
    await setPaymentSettings();
  });

  async function pendingEnrollmentFee() {
    const student = await createUser();
    const course = await createCourse();
    await startedEnrollment(student.id, course.id);
    expect(await processEnrollmentPayment(student.id, course.id, "upi", "UTR2000001", null)).toEqual({ success: true });
    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    return { student, course, submission };
  }

  it("approves once, then reports the repeat as already approved", async () => {
    const { student, course, submission } = await pendingEnrollmentFee();

    expect(await approveFeePayment(submission.id)).toEqual({ ok: true, alreadyApproved: false, userId: student.id, courseId: course.id });
    expect(await approveFeePayment(submission.id)).toEqual({ ok: true, alreadyApproved: true, userId: student.id, courseId: course.id });
    expect(await prisma.paymentRecord.count({ where: { userId: student.id } })).toBe(1);
  });

  it("answers not found and invalid-state refusals with their HTTP status", async () => {
    const { submission } = await pendingEnrollmentFee();

    expect(await approveFeePayment("missing")).toMatchObject({ ok: false, status: 404, error: "Payment submission not found." });
    expect(await declineFeePayment(submission.id)).toMatchObject({ ok: true });
    expect(await declineFeePayment(submission.id)).toMatchObject({ ok: false, status: 409, error: "Only pending payments can be declined." });
    expect(await approveFeePayment(submission.id)).toMatchObject({ ok: false, status: 409, error: "This payment cannot be confirmed." });
  });

  it("requires a reason to void, and voids only approved payments", async () => {
    const admin = await createUser({ email: "admin@example.test" });
    const session = sessionFor(admin, "ADMIN") as never;
    const { submission } = await pendingEnrollmentFee();

    expect(await voidFeePayment(session, submission.id, " ")).toMatchObject({ ok: false, status: 400 });
    expect(await voidFeePayment(session, submission.id, "Entered twice")).toMatchObject({ ok: false, status: 409, error: "Only approved payments can be voided." });
    expect(await voidManualPayment(session, "missing", "Entered twice")).toMatchObject({ ok: false, status: 404 });

    await approveFeePayment(submission.id);
    expect(await voidFeePayment(session, submission.id, "Entered twice")).toMatchObject({ ok: true });
    expect(await prisma.coursePaymentSubmission.findUniqueOrThrow({ where: { id: submission.id } })).toMatchObject({ deletedAt: expect.any(Date) });
  });
});
