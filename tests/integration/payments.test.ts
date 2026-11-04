import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { processEnrollmentPayment, processMonthlyPayment } from "@/services/payments";
import { confirmMonthlyPayment, declineMonthlyPayment } from "@/app/admin/payments/actions";
import { generateReceipt } from "@/app/actions/receipts";
import {
  createCourse,
  createEnrollment,
  createUser,
  resetDb,
  runAction,
  sessionFor,
  setPaymentSettings,
  SKIP_WITHOUT_DB,
} from "../helpers/db";

async function loginAsAdmin() {
  const admin = await createUser({ email: "admin@example.test", name: "Admin" });
  vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
  return admin;
}

describe.skipIf(SKIP_WITHOUT_DB)("fee payments: submit, approve, receipt", () => {
  beforeEach(async () => {
    await resetDb();
    await setPaymentSettings();
  });

  it("walks an enrollment fee from submission through approval to a receipt", async () => {
    await loginAsAdmin();
    const student = await createUser();
    const course = await createCourse();

    const submitted = await processEnrollmentPayment(student.id, course.id, "upi", "UTR1000001", null);
    expect(submitted).toEqual({ success: true });

    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    expect(submission).toMatchObject({
      amountInrPaise: 50000,
      statusEnum: "PENDING_VERIFICATION",
      paymentTypeEnum: "ENROLLMENT",
      paymentRecordId: null,
    });
    expect(submission.paymentReference).toBe(submission.id);
    const awaiting = await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: student.id, courseId: course.id } } });
    expect(awaiting.statusEnum).toBe("AWAITING_ENROLLMENT_FEE");
    expect(awaiting.rollNumber).toBeNull();

    const approval = await runAction(() => confirmMonthlyPayment(submission.id));
    expect(approval.redirectedTo).toContain("confirmed=1");

    const approved = await prisma.coursePaymentSubmission.findUniqueOrThrow({ where: { id: submission.id } });
    expect(approved.statusEnum).toBe("APPROVED");
    expect(approved.paymentRecordId).not.toBeNull();
    const record = await prisma.paymentRecord.findUniqueOrThrow({ where: { id: approved.paymentRecordId! } });
    expect(record).toMatchObject({ userId: student.id, courseId: course.id, amountInrPaise: 50000, voidedAt: null });

    const active = await prisma.enrollment.findUniqueOrThrow({ where: { id: awaiting.id } });
    expect(active.statusEnum).toBe("ACTIVE");
    expect(active.rollNumber).toBe(1);

    const notifications = await prisma.studentNotification.findMany({ where: { userId: student.id } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ type: "PAYMENT_APPROVED", sourceId: submission.id });

    const receipt = await generateReceipt(record.id);
    expect(receipt.invoiceNumber).toMatch(/^DQA-INV\/\d{4}-\d{2}\/00001$/);
    const withReceipt = await prisma.paymentRecord.findUniqueOrThrow({ where: { id: record.id } });
    expect(withReceipt).toMatchObject({
      invoiceNumber: receipt.invoiceNumber,
      receiptIncludesGst: false,
      receiptFeeAmountPaise: 50000,
      receiptGstAmountPaise: 0,
    });
    expect(withReceipt.receiptGeneratedAt).not.toBeNull();
  });

  it("approving twice does not create a second payment record", async () => {
    await loginAsAdmin();
    const student = await createUser();
    const course = await createCourse();
    await processEnrollmentPayment(student.id, course.id, "upi", "UTR2000001", null);
    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });

    await runAction(() => confirmMonthlyPayment(submission.id));
    const second = await runAction(() => confirmMonthlyPayment(submission.id));

    expect(second.redirectedTo).toContain("confirmed=1");
    expect(await prisma.paymentRecord.count({ where: { userId: student.id } })).toBe(1);
  });

  it("splits GST out of the receipt when the academy includes it, and numbers receipts sequentially", async () => {
    await loginAsAdmin();
    await setPaymentSettings({ includeGstByDefault: true });
    const student = await createUser();
    const course = await createCourse({ priceInrPaise: 11800 });
    await processEnrollmentPayment(student.id, course.id, "upi", "UTR3000001", null);
    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    await runAction(() => confirmMonthlyPayment(submission.id));
    const first = (await prisma.paymentRecord.findFirstOrThrow({ where: { userId: student.id } })).id;

    const other = await createUser();
    const manual = await prisma.paymentRecord.create({
      data: { userId: other.id, amountInrPaise: 10000, paidAt: new Date(), paymentType: "manual", paymentTypeEnum: "MANUAL" },
    });

    const one = await generateReceipt(first);
    const two = await generateReceipt(manual.id);

    expect(one.invoiceNumber.endsWith("/00001")).toBe(true);
    expect(two.invoiceNumber.endsWith("/00002")).toBe(true);
    const row = await prisma.paymentRecord.findUniqueOrThrow({ where: { id: first } });
    expect(row).toMatchObject({ receiptIncludesGst: true, receiptFeeAmountPaise: 10000, receiptGstAmountPaise: 1800 });
    expect(row.receiptFeeAmountPaise! + row.receiptGstAmountPaise!).toBe(row.amountInrPaise);
  });

  it("refuses to generate a receipt twice for the same record", async () => {
    await loginAsAdmin();
    const student = await createUser();
    const record = await prisma.paymentRecord.create({
      data: { userId: student.id, amountInrPaise: 10000, paidAt: new Date(), paymentType: "manual", paymentTypeEnum: "MANUAL" },
    });

    await generateReceipt(record.id);
    await expect(generateReceipt(record.id)).rejects.toThrow("already been generated");
    expect((await prisma.documentSequence.findMany())).toHaveLength(1);
  });

  it("only lets admins generate receipts", async () => {
    const student = await createUser();
    vi.mocked(auth).mockResolvedValue(sessionFor(student, "STUDENT") as never);
    const record = await prisma.paymentRecord.create({
      data: { userId: student.id, amountInrPaise: 10000, paidAt: new Date() },
    });
    await expect(generateReceipt(record.id)).rejects.toThrow("Unauthorized");
  });

  it("declines a pending payment, frees the reference and lets the student pay again", async () => {
    await loginAsAdmin();
    const student = await createUser();
    const course = await createCourse();
    await processEnrollmentPayment(student.id, course.id, "upi", "UTR4000001", null);
    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });

    const declined = await runAction(() => declineMonthlyPayment(submission.id));
    expect(declined.redirectedTo).toContain("declined=1");
    const row = await prisma.coursePaymentSubmission.findUniqueOrThrow({ where: { id: submission.id } });
    expect(row).toMatchObject({ statusEnum: "DECLINED", upiTransactionId: null, paymentMethod: null });

    const again = await processEnrollmentPayment(student.id, course.id, "upi", "UTR4000001", null);
    expect(again).toEqual({ success: true });
  });

  it("rejects a transaction reference that was already used and a stale expected amount", async () => {
    const first = await createUser();
    const second = await createUser();
    const course = await createCourse();
    await processEnrollmentPayment(first.id, course.id, "upi", "UTR5000001", null);

    const reused = await processEnrollmentPayment(second.id, course.id, "upi", "UTR5000001", null);
    expect(reused).toMatchObject({ status: 400, error: expect.stringContaining("already used") });

    const stale = await processEnrollmentPayment(second.id, course.id, "upi", "UTR5000002", null, null, 12345);
    expect(stale).toMatchObject({ status: 409 });
    expect(await prisma.coursePaymentSubmission.count({ where: { userId: second.id } })).toBe(0);
  });

  it("blocks a duplicate pending enrollment fee", async () => {
    const student = await createUser();
    const course = await createCourse();
    await processEnrollmentPayment(student.id, course.id, "upi", "UTR6000001", null);
    const duplicate = await processEnrollmentPayment(student.id, course.id, "upi", "UTR6000002", null);
    expect(duplicate).toMatchObject({ status: 400, error: expect.stringContaining("awaiting verification") });
  });

  it("accepts a monthly fee only from an approved enrollment and only once per period", async () => {
    const student = await createUser();
    const course = await createCourse();

    const notEnrolled = await processMonthlyPayment(student.id, course.id, "03", "2026", "upi", "UTR7000001", null);
    expect(notEnrolled).toMatchObject({ status: 400, error: expect.stringContaining("enrolled and approved") });

    await createEnrollment(student.id, course.id);
    const first = await processMonthlyPayment(student.id, course.id, "03", "2026", "upi", "UTR7000002", null);
    expect(first).toEqual({ success: true });
    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    expect(submission).toMatchObject({ amountInrPaise: 34900, label: "Monthly fee — March 2026" });

    const repeat = await processMonthlyPayment(student.id, course.id, "03", "2026", "upi", "UTR7000003", null);
    expect(repeat).toMatchObject({ status: 400, error: expect.stringContaining("already awaiting verification") });

    const nextMonth = await processMonthlyPayment(student.id, course.id, "04", "2026", "upi", "UTR7000004", null);
    expect(nextMonth).toEqual({ success: true });
  });
});

describe.skipIf(SKIP_WITHOUT_DB)("coupons and fee waivers", () => {
  beforeEach(async () => {
    await resetDb();
    await setPaymentSettings({ feeWaiverEnabled: true });
  });

  const createCoupon = (percentage: number, extra: Record<string, unknown> = {}) =>
    prisma.coupon.create({
      data: {
        code: `SAVE${percentage}`,
        percentage,
        type: "DEFAULT",
        validFrom: new Date(Date.now() - 86_400_000),
        validUntil: new Date(Date.now() + 30 * 86_400_000),
        isActive: true,
        applyToEnrollment: true,
        applyToCourse: true,
        ...extra,
      },
    });

  it("charges the discounted amount only for a coupon the student selected, and burns it once", async () => {
    const student = await createUser();
    const course = await createCourse();
    const coupon = await createCoupon(50);

    const result = await processEnrollmentPayment(student.id, course.id, "upi", "UTR8000001", null, coupon.id, 25000);
    expect(result).toEqual({ success: true });

    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    expect(submission).toMatchObject({ amountInrPaise: 25000, couponId: coupon.id });
    expect(await prisma.couponUsage.count({ where: { userId: student.id, couponId: coupon.id } })).toBe(1);

    // The same coupon cannot be selected again, so the full price is now expected.
    const other = await createCourse();
    const second = await processEnrollmentPayment(student.id, other.id, "upi", "UTR8000002", null, coupon.id, 25000);
    expect(second).toMatchObject({ status: 409 });
  });

  it("does not apply any coupon when none is selected", async () => {
    const student = await createUser();
    const course = await createCourse();
    await createCoupon(50);

    await processEnrollmentPayment(student.id, course.id, "upi", "UTR8100001", null);

    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    expect(submission.amountInrPaise).toBe(50000);
    expect(submission.couponId).toBeNull();
  });

  it("keeps a 100% waiver pending unless the academy enabled auto-approval", async () => {
    const student = await createUser();
    const course = await createCourse();
    const coupon = await createCoupon(100);

    await processEnrollmentPayment(student.id, course.id, null, null, null, coupon.id);

    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    expect(submission).toMatchObject({ amountInrPaise: 0, statusEnum: "PENDING_VERIFICATION", paymentMethodEnum: "WAIVER" });
    expect(await prisma.paymentRecord.count()).toBe(0);
    const enrollment = await prisma.enrollment.findFirstOrThrow({ where: { userId: student.id } });
    expect(enrollment.statusEnum).toBe("AWAITING_ENROLLMENT_FEE");
  });

  it("activates the enrollment with a roll number when a 100% waiver is auto-approved", async () => {
    await setPaymentSettings({ feeWaiverEnabled: true, autoApproveFullWaivers: true });
    const student = await createUser();
    const course = await createCourse();
    const coupon = await createCoupon(100);

    await processEnrollmentPayment(student.id, course.id, null, null, null, coupon.id);

    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    expect(submission.statusEnum).toBe("APPROVED");
    expect(submission.paymentRecordId).not.toBeNull();
    const record = await prisma.paymentRecord.findUniqueOrThrow({ where: { id: submission.paymentRecordId! } });
    expect(record.amountInrPaise).toBe(0);
    const enrollment = await prisma.enrollment.findFirstOrThrow({ where: { userId: student.id } });
    expect(enrollment).toMatchObject({ statusEnum: "ACTIVE", rollNumber: 1 });
  });
});
