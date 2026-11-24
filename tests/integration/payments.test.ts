import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { processEnrollmentPayment, processMonthlyPayment } from "@/services/payments";
import { createBookOrder } from "@/services/book-orders";
import { CouponAlreadyUsedError, recordCouponUsageTx } from "@/services/coupons";
import { confirmMonthlyPayment, declineMonthlyPayment } from "@/app/admin/payments/actions";
import { generateReceipt } from "@/app/actions/receipts";
import { PAYMENT_PROOF_REQUIRED_MESSAGE } from "@/config/constants/payments";
import {
  createBook,
  createCourse,
  createEnrollment,
  createUser,
  resetDb,
  runAction,
  sessionFor,
  setPaymentSettings,
  SKIP_WITHOUT_DB,
  startedEnrollment,
} from "../helpers/db";
import { paymentTypeData, submissionStatusData } from "@/services/status-compat";

// Storage calls go to this stand-in, so a test can see what would be deleted.
const r2 = vi.hoisted(() => ({ send: vi.fn<(command: unknown) => Promise<object>>(async () => ({})) }));
vi.mock("@/utils/s3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/s3")>()),
  getR2Client: () => r2,
}));
const deletedKeys = () =>
  r2.send.mock.calls
    .map(([command]) => command)
    .filter((command): command is DeleteObjectCommand => command instanceof DeleteObjectCommand)
    .map((command) => command.input.Key);

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

    await startedEnrollment(student.id, course.id);
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
    await startedEnrollment(student.id, course.id);
    await processEnrollmentPayment(student.id, course.id, "upi", "UTR2000001", null);
    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });

    await runAction(() => confirmMonthlyPayment(submission.id));
    const second = await runAction(() => confirmMonthlyPayment(submission.id));

    expect(second.redirectedTo).toContain("confirmed=1");
    expect(await prisma.paymentRecord.count({ where: { userId: student.id } })).toBe(1);
  });

  it("two simultaneous approvals create one payment record and one roll number", async () => {
    await loginAsAdmin();
    const student = await createUser();
    const course = await createCourse();
    await startedEnrollment(student.id, course.id);
    await processEnrollmentPayment(student.id, course.id, "upi", "UTR2100001", null);
    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });

    const results = await Promise.all([
      runAction(() => confirmMonthlyPayment(submission.id)),
      runAction(() => confirmMonthlyPayment(submission.id)),
    ]);

    for (const result of results) expect(result.redirectedTo).toContain("confirmed=1");
    expect(await prisma.paymentRecord.count({ where: { userId: student.id } })).toBe(1);
    const approved = await prisma.coursePaymentSubmission.findUniqueOrThrow({ where: { id: submission.id } });
    expect(approved.statusEnum).toBe("APPROVED");
    expect(approved.paymentRecordId).toBe((await prisma.paymentRecord.findFirstOrThrow({ where: { userId: student.id } })).id);
    const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: student.id, courseId: course.id } } });
    expect(enrollment).toMatchObject({ statusEnum: "ACTIVE", rollNumber: 1 });
  });

  it("an approval racing a decline ends in one consistent outcome", async () => {
    await loginAsAdmin();
    for (let round = 0; round < 5; round++) {
      const student = await createUser();
      const course = await createCourse();
      await startedEnrollment(student.id, course.id);
      await processEnrollmentPayment(student.id, course.id, "upi", `UTR22000${round}1`, null);
      const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });

      await Promise.all([
        runAction(() => confirmMonthlyPayment(submission.id)),
        runAction(() => declineMonthlyPayment(submission.id)),
      ]);

      const final = await prisma.coursePaymentSubmission.findUniqueOrThrow({ where: { id: submission.id } });
      const records = await prisma.paymentRecord.count({ where: { userId: student.id } });
      const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: student.id, courseId: course.id } } });
      if (final.statusEnum === "APPROVED") {
        expect(records).toBe(1);
        expect(final.paymentRecordId).not.toBeNull();
        expect(enrollment.statusEnum).toBe("ACTIVE");
      } else {
        expect(final.statusEnum).toBe("DECLINED");
        expect(records).toBe(0);
        expect(final.paymentRecordId).toBeNull();
        expect(enrollment.statusEnum).toBe("AWAITING_ENROLLMENT_FEE");
      }
    }
  });

  it("refuses to decline a payment that has been approved", async () => {
    await loginAsAdmin();
    const student = await createUser();
    const course = await createCourse();
    await startedEnrollment(student.id, course.id);
    await processEnrollmentPayment(student.id, course.id, "upi", "UTR2300001", null);
    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    await runAction(() => confirmMonthlyPayment(submission.id));

    expect((await runAction(() => declineMonthlyPayment(submission.id))).value).toEqual({ error: "Only pending payments can be declined." });
    expect((await prisma.coursePaymentSubmission.findUniqueOrThrow({ where: { id: submission.id } })).statusEnum).toBe("APPROVED");
  });

  it("splits GST out of the receipt when the academy includes it, and numbers receipts sequentially", async () => {
    await loginAsAdmin();
    await setPaymentSettings({ includeGstByDefault: true });
    const student = await createUser();
    const course = await createCourse({ priceInrPaise: 11800 });
    await startedEnrollment(student.id, course.id);
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
    await startedEnrollment(student.id, course.id);
    await processEnrollmentPayment(student.id, course.id, "upi", "UTR4000001", null);
    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });

    const declined = await runAction(() => declineMonthlyPayment(submission.id));
    expect(declined.redirectedTo).toContain("declined=1");
    const row = await prisma.coursePaymentSubmission.findUniqueOrThrow({ where: { id: submission.id } });
    expect(row).toMatchObject({ statusEnum: "DECLINED", upiTransactionId: null, paymentMethod: null });

    await startedEnrollment(student.id, course.id);
    const again = await processEnrollmentPayment(student.id, course.id, "upi", "UTR4000001", null);
    expect(again).toEqual({ success: true });
  });

  it("deletes a declined submission's screenshot from storage, and keeps an approved one's", async () => {
    await loginAsAdmin();
    const student = await createUser();
    const course = await createCourse();
    await createEnrollment(student.id, course.id);
    const screenshot = (name: string) => `/api/files/private/payments/${name}-1732400000000-k3j9x.png`;
    const submit = (month: string, name: string) =>
      prisma.coursePaymentSubmission.create({
        data: {
          userId: student.id,
          courseId: course.id,
          label: `Monthly fee — ${month} 2026`,
          amountInrPaise: 34900,
          paymentScreenshotPath: screenshot(name),
          ...paymentTypeData("MONTHLY"),
          ...submissionStatusData("PENDING_VERIFICATION"),
        },
      });
    const declinedOne = await submit("January", "declined");
    const approvedOne = await submit("February", "approved");
    r2.send.mockClear();

    expect((await runAction(() => declineMonthlyPayment(declinedOne.id))).redirectedTo).toContain("declined=1");
    expect((await runAction(() => confirmMonthlyPayment(approvedOne.id))).redirectedTo).toContain("confirmed=1");
    await new Promise((resolve) => setTimeout(resolve, 0)); // let after() run

    expect(deletedKeys()).toEqual(["private/payments/declined-1732400000000-k3j9x.png"]);
    expect((await prisma.coursePaymentSubmission.findUniqueOrThrow({ where: { id: declinedOne.id } })).paymentScreenshotPath).toBeNull();
  });

  it("rejects a transaction reference that was already used and a stale expected amount", async () => {
    const first = await createUser();
    const second = await createUser();
    const course = await createCourse();
    await startedEnrollment(first.id, course.id);
    await processEnrollmentPayment(first.id, course.id, "upi", "UTR5000001", null);

    await startedEnrollment(second.id, course.id);
    const reused = await processEnrollmentPayment(second.id, course.id, "upi", "UTR5000001", null);
    expect(reused).toMatchObject({ status: 409, error: expect.stringContaining("already used") });

    await startedEnrollment(second.id, course.id);
    const stale = await processEnrollmentPayment(second.id, course.id, "upi", "UTR5000002", null, null, 12345);
    expect(stale).toMatchObject({ status: 409 });
    expect(await prisma.coursePaymentSubmission.count({ where: { userId: second.id } })).toBe(0);
  });

  it("a paid fee needs a UTR or a screenshot", async () => {
    const student = await createUser();
    const course = await createCourse();
    await createEnrollment(student.id, course.id);
    const png = new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64")], "paid.png", { type: "image/png" });

    expect(await processMonthlyPayment(student.id, course.id, "03", "2026", "upi", null, null)).toEqual({ status: 400, error: PAYMENT_PROOF_REQUIRED_MESSAGE });
    expect(await processMonthlyPayment(student.id, course.id, "03", "2026", "upi", "  ", new File([], "empty.png"))).toEqual({ status: 400, error: PAYMENT_PROOF_REQUIRED_MESSAGE });
    expect(await prisma.coursePaymentSubmission.count()).toBe(0);

    expect(await processMonthlyPayment(student.id, course.id, "03", "2026", "upi", null, png)).toEqual({ success: true });
    expect(await processMonthlyPayment(student.id, course.id, "04", "2026", "upi", "UTR7500001", null)).toEqual({ success: true });

    const other = await createUser();
    await startedEnrollment(other.id, course.id);
    expect(await processEnrollmentPayment(other.id, course.id, "upi", "", null)).toEqual({ status: 400, error: PAYMENT_PROOF_REQUIRED_MESSAGE });
    expect((await prisma.enrollment.findFirstOrThrow({ where: { userId: other.id } })).statusEnum).toBe("AWAITING_ENROLLMENT_FEE");
  });

  it("one UTR backs one payment, a fee or a book order, ignoring case and spaces", async () => {
    const student = await createUser();
    const course = await createCourse();
    await createEnrollment(student.id, course.id);
    const book = await createBook({ inventoryPurchased: 10 });
    const order = (utr: string) =>
      createBookOrder({
        userId: student.id,
        input: { items: [{ bookId: book.id, quantity: 1 }], paymentMethod: "upi", upiTransactionId: utr, deliveryAddress: "12 Main Street, Srinagar", deliveryPinCode: "190001", deliveryPhoneNumber: "9876543210" },
        screenshotFile: null,
      });

    expect(await processMonthlyPayment(student.id, course.id, "01", "2026", "upi", " abc123 ", null)).toEqual({ success: true });
    expect((await prisma.coursePaymentSubmission.findFirstOrThrow()).upiTransactionId).toBe("ABC123");
    expect(await processMonthlyPayment(student.id, course.id, "02", "2026", "upi", "ABC123", null)).toMatchObject({ status: 409, error: expect.stringContaining("already used") });
    expect(await order("Abc123")).toMatchObject({ ok: false, status: 409 });

    expect(await order("ord777")).toMatchObject({ ok: true });
    expect((await prisma.bookOrder.findFirstOrThrow()).upiTransactionId).toBe("ORD777");
    expect(await processMonthlyPayment(student.id, course.id, "03", "2026", "upi", "ORD777", null)).toMatchObject({ status: 409 });

    // A row stored before references were upper-cased still counts.
    await prisma.coursePaymentSubmission.create({ data: { userId: student.id, courseId: course.id, label: "Legacy", amountInrPaise: 100, upiTransactionId: "legacy42" } });
    expect(await processMonthlyPayment(student.id, course.id, "04", "2026", "upi", "LEGACY42", null)).toMatchObject({ status: 409 });
    expect(await prisma.coursePaymentSubmission.count({ where: { userId: student.id } })).toBe(2);
  });

  it("blocks a duplicate pending enrollment fee", async () => {
    const student = await createUser();
    const course = await createCourse();
    await startedEnrollment(student.id, course.id);
    await processEnrollmentPayment(student.id, course.id, "upi", "UTR6000001", null);
    await startedEnrollment(student.id, course.id);
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
    expect(repeat).toMatchObject({ status: 409, error: expect.stringContaining("already awaiting verification") });

    const nextMonth = await processMonthlyPayment(student.id, course.id, "04", "2026", "upi", "UTR7000004", null);
    expect(nextMonth).toEqual({ success: true });
    expect((await prisma.coursePaymentSubmission.findMany({ where: { userId: student.id }, orderBy: { createdAt: "asc" } })).map((s) => s.periodKey)).toEqual([
      "MONTHLY:2026-03",
      "MONTHLY:2026-04",
    ]);
  });

  it("takes a one-time fee once per course, whatever year it is submitted for", async () => {
    await loginAsAdmin();
    const student = await createUser();
    const course = await createCourse({ feeFrequency: "ONE_TIME", monthlyFeeInrPaise: 120000 });
    await createEnrollment(student.id, course.id);

    expect(await processMonthlyPayment(student.id, course.id, "01", "2026", "upi", "UTR7100001", null)).toEqual({ success: true });
    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    expect(submission).toMatchObject({ label: "One-Time fee", periodKey: "ONE_TIME" });
    await runAction(() => confirmMonthlyPayment(submission.id));

    const nextYear = await processMonthlyPayment(student.id, course.id, "01", "2027", "upi", "UTR7100002", null);
    expect(nextYear).toMatchObject({ status: 409, error: expect.stringContaining("already recorded") });
    expect(await prisma.coursePaymentSubmission.count({ where: { userId: student.id } })).toBe(1);
  });

  it("the database refuses a second live submission for a billing period", async () => {
    const student = await createUser();
    const course = await createCourse();
    const insert = (label: string, extra: Record<string, unknown> = {}) =>
      prisma.coursePaymentSubmission.create({
        data: { userId: student.id, courseId: course.id, label, amountInrPaise: 34900, periodKey: "MONTHLY:2026-05", ...extra },
      });
    await insert("Monthly fee — May 2026 (30% Fee Waiver)");

    // A different label (no coupon) does not get past the period index.
    await expect(insert("Monthly fee — May 2026")).rejects.toMatchObject({ code: "P2002" });

    // Declined, rejected and voided rows do not hold the period; rows without a key are not covered.
    await insert("Monthly fee — May 2026 (declined)", { status: "rejected", statusEnum: "DECLINED" });
    await insert("Monthly fee — May 2026 (legacy declined)", { status: "declined" });
    await insert("Monthly fee — May 2026 (voided)", { deletedAt: new Date() });
    await insert("Monthly fee — May 2026 (no key)", { periodKey: null });
    await expect(insert("Monthly fee — May 2026 (again)")).rejects.toMatchObject({ code: "P2002" });

    // Another student, course or period is free.
    const other = await createUser();
    await prisma.coursePaymentSubmission.create({
      data: { userId: other.id, courseId: course.id, label: "Monthly fee — May 2026", amountInrPaise: 34900, periodKey: "MONTHLY:2026-05" },
    });
    await insert("Monthly fee — June 2026", { periodKey: "MONTHLY:2026-06" });
  });

  it("matches rows written before the period key existed by their label, ignoring coupon text", async () => {
    const student = await createUser();
    const course = await createCourse();
    await createEnrollment(student.id, course.id);
    const legacy = (label: string, extra: Record<string, unknown> = {}) =>
      prisma.coursePaymentSubmission.create({
        data: { userId: student.id, courseId: course.id, label, amountInrPaise: 17450, status: "approved", statusEnum: "APPROVED", ...extra },
      });
    await legacy("Monthly fee — January 2026 (50% Fee Waiver)");
    await legacy("One-Time fee — 2025");

    expect(await processMonthlyPayment(student.id, course.id, "01", "2026", "upi", "UTR7200001", null)).toMatchObject({ status: 409 });
    // A voided (soft-deleted) payment frees the period again.
    await prisma.coursePaymentSubmission.updateMany({ where: { userId: student.id }, data: { deletedAt: new Date() } });
    expect(await processMonthlyPayment(student.id, course.id, "01", "2026", "upi", "UTR7200002", null)).toEqual({ success: true });

    const oneTime = await createCourse({ feeFrequency: "ONE_TIME" });
    await createEnrollment(student.id, oneTime.id);
    await prisma.coursePaymentSubmission.create({
      data: { userId: student.id, courseId: oneTime.id, label: "One-Time fee — 2025", amountInrPaise: 34900, status: "approved", statusEnum: "APPROVED" },
    });
    expect(await processMonthlyPayment(student.id, oneTime.id, "01", "2026", "upi", "UTR7200003", null)).toMatchObject({ status: 409 });
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

  it("charges the discounted amount only for a coupon the student selected, and spends it once on approval", async () => {
    await loginAsAdmin();
    const student = await createUser();
    const course = await createCourse();
    const coupon = await createCoupon(50);

    await startedEnrollment(student.id, course.id);
    const result = await processEnrollmentPayment(student.id, course.id, "upi", "UTR8000001", null, coupon.id, 25000);
    expect(result).toEqual({ success: true });

    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    expect(submission).toMatchObject({ amountInrPaise: 25000, couponId: coupon.id });
    // Pending: the submission holds the coupon; it is spent when approved.
    expect(await prisma.couponUsage.count({ where: { userId: student.id, couponId: coupon.id } })).toBe(0);
    await runAction(() => confirmMonthlyPayment(submission.id));
    expect(await prisma.couponUsage.count({ where: { userId: student.id, couponId: coupon.id } })).toBe(1);

    // The same coupon cannot be selected again, so the full price is now expected.
    const other = await createCourse();
    await startedEnrollment(student.id, other.id);
    const second = await processEnrollmentPayment(student.id, other.id, "upi", "UTR8000002", null, coupon.id, 25000);
    expect(second).toMatchObject({ status: 409 });
  });

  it("snapshots the fee before the coupon on every new submission", async () => {
    const student = await createUser();
    const enrolling = await createCourse({ priceInrPaise: 50000 });
    const studying = await createCourse({ monthlyFeeInrPaise: 34900 });
    const enrollmentCoupon = await createCoupon(50, { applyToCourse: false });
    const courseCoupon = await createCoupon(20, { applyToEnrollment: false });

    await startedEnrollment(student.id, enrolling.id);
    expect(await processEnrollmentPayment(student.id, enrolling.id, "upi", "UTR8050001", null, enrollmentCoupon.id, 25000)).toEqual({ success: true });
    await createEnrollment(student.id, studying.id);
    expect(await processMonthlyPayment(student.id, studying.id, "05", "2026", "upi", "UTR8050002", null, courseCoupon.id, 27920)).toEqual({ success: true });
    expect(await processMonthlyPayment(student.id, studying.id, "06", "2026", "upi", "UTR8050003", null)).toEqual({ success: true });

    const rows = await prisma.coursePaymentSubmission.findMany({
      where: { userId: student.id },
      orderBy: { createdAt: "asc" },
      select: { amountInrPaise: true, baseFeePaise: true },
    });
    expect(rows).toEqual([
      { amountInrPaise: 25000, baseFeePaise: 50000 },
      { amountInrPaise: 27920, baseFeePaise: 34900 },
      { amountInrPaise: 34900, baseFeePaise: 34900 },
    ]);
  });

  it("does not apply any coupon when none is selected", async () => {
    const student = await createUser();
    const course = await createCourse();
    await createCoupon(50);

    await startedEnrollment(student.id, course.id);
    await processEnrollmentPayment(student.id, course.id, "upi", "UTR8100001", null);

    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    expect(submission.amountInrPaise).toBe(50000);
    expect(submission.couponId).toBeNull();
  });

  it("a period paid with a coupon cannot be paid again without one, or with another", async () => {
    await loginAsAdmin();
    const student = await createUser();
    const course = await createCourse();
    await createEnrollment(student.id, course.id);
    const coupon = await createCoupon(30);

    expect(await processMonthlyPayment(student.id, course.id, "01", "2026", "upi", "UTR8300001", null, coupon.id, 24430)).toEqual({ success: true });
    const january = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    expect(january).toMatchObject({ label: "Monthly fee — January 2026 (30% Fee Waiver)", periodKey: "MONTHLY:2026-01" });
    await runAction(() => confirmMonthlyPayment(january.id));

    const withoutCoupon = await processMonthlyPayment(student.id, course.id, "01", "2026", "upi", "UTR8300002", null);
    expect(withoutCoupon).toMatchObject({ status: 409, error: expect.stringContaining("already recorded") });
    const other = await createCoupon(50, { code: "HALF50" });
    expect(await processMonthlyPayment(student.id, course.id, "01", "2026", "upi", "UTR8300003", null, other.id)).toMatchObject({ status: 409 });
    expect(await prisma.coursePaymentSubmission.count({ where: { userId: student.id, deletedAt: null } })).toBe(1);

    // February is a different period.
    expect(await processMonthlyPayment(student.id, course.id, "02", "2026", "upi", "UTR8300004", null)).toEqual({ success: true });
  });

  it.each(["DEFAULT", "SPECIAL"] as const)("a %s coupon sent with two periods at once is redeemed once", async (type) => {
    const student = await createUser();
    const course = await createCourse();
    await createEnrollment(student.id, course.id);
    const coupon = await createCoupon(100, type === "SPECIAL" ? { type, userId: student.id, code: "WAIVER-AK-1234" } : {});

    const results = await Promise.all([
      processMonthlyPayment(student.id, course.id, "01", "2026", null, null, null, coupon.id, 0),
      processMonthlyPayment(student.id, course.id, "02", "2026", null, null, null, coupon.id, 0),
    ]);

    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(results.filter((r) => !r.success)).toEqual([expect.objectContaining({ status: 409 })]);
    // One pending submission holds the coupon; nothing is spent before approval.
    expect(await prisma.coursePaymentSubmission.count({ where: { couponId: coupon.id } })).toBe(1);
    expect(await prisma.couponUsage.count({ where: { couponId: coupon.id } })).toBe(0);
  });

  it.each(["DEFAULT", "SPECIAL"] as const)("a declined submission gives its %s coupon back", async (type) => {
    await loginAsAdmin();
    const student = await createUser();
    const course = await createCourse();
    await createEnrollment(student.id, course.id);
    const coupon = await createCoupon(50, type === "SPECIAL" ? { type, userId: student.id, code: "WAIVER-AK-2468" } : {});

    expect(await processMonthlyPayment(student.id, course.id, "01", "2026", "upi", "UTR8500001", null, coupon.id, 17450)).toEqual({ success: true });
    const first = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    await runAction(() => declineMonthlyPayment(first.id));
    expect(await prisma.couponUsage.count()).toBe(0);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).isActive).toBe(true);

    expect(await processMonthlyPayment(student.id, course.id, "01", "2026", "upi", "UTR8500002", null, coupon.id, 17450)).toEqual({ success: true });
    const second = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id, statusEnum: "PENDING_VERIFICATION" } });
    expect(second.couponId).toBe(coupon.id);

    await runAction(() => confirmMonthlyPayment(second.id));
    expect(await prisma.couponUsage.count({ where: { userId: student.id, couponId: coupon.id } })).toBe(1);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).isActive).toBe(type === "DEFAULT");
  });

  it("two pending submissions cannot hold the same coupon", async () => {
    const student = await createUser();
    const course = await createCourse();
    await createEnrollment(student.id, course.id);
    const coupon = await createCoupon(50);

    expect(await processMonthlyPayment(student.id, course.id, "01", "2026", "upi", "UTR8600001", null, coupon.id, 17450)).toEqual({ success: true });
    const february = await processMonthlyPayment(student.id, course.id, "02", "2026", "upi", "UTR8600002", null, coupon.id, 17450);
    expect(february).toMatchObject({ status: 409 });
    expect(await prisma.coursePaymentSubmission.count({ where: { couponId: coupon.id } })).toBe(1);
  });

  it("approves a pending submission whose coupon was spent at submission before the change", async () => {
    await loginAsAdmin();
    const student = await createUser();
    const course = await createCourse();
    await createEnrollment(student.id, course.id);
    const coupon = await createCoupon(100, { type: "SPECIAL", userId: student.id, code: "WAIVER-AK-1357" });
    await processMonthlyPayment(student.id, course.id, "01", "2026", null, null, null, coupon.id, 0);
    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    // What the old submit path left behind: a usage row and a deactivated SPECIAL coupon.
    await prisma.couponUsage.create({ data: { couponId: coupon.id, userId: student.id } });
    await prisma.coupon.update({ where: { id: coupon.id }, data: { isActive: false } });

    const approval = await runAction(() => confirmMonthlyPayment(submission.id));

    expect(approval.redirectedTo).toContain("confirmed=1");
    expect((await prisma.coursePaymentSubmission.findUniqueOrThrow({ where: { id: submission.id } })).statusEnum).toBe("APPROVED");
    expect(await prisma.couponUsage.count({ where: { couponId: coupon.id } })).toBe(1);
  });

  it("redeeming a coupon a second time fails instead of passing silently", async () => {
    const student = await createUser();
    const special = await createCoupon(100, { type: "SPECIAL", userId: student.id, code: "WAIVER-AK-5678" });
    const general = await createCoupon(20);

    await prisma.$transaction((tx) => recordCouponUsageTx(tx, student.id, special.id));
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: special.id } })).isActive).toBe(false);
    await expect(prisma.$transaction((tx) => recordCouponUsageTx(tx, student.id, special.id))).rejects.toBeInstanceOf(CouponAlreadyUsedError);

    await prisma.$transaction((tx) => recordCouponUsageTx(tx, student.id, general.id));
    await expect(prisma.$transaction((tx) => recordCouponUsageTx(tx, student.id, general.id))).rejects.toBeInstanceOf(CouponAlreadyUsedError);
    expect(await prisma.couponUsage.count({ where: { userId: student.id } })).toBe(2);

    // A SPECIAL coupon already deactivated (by an admin, or a concurrent redemption) is not redeemed either.
    const other = await createUser();
    const inactive = await createCoupon(100, { type: "SPECIAL", userId: other.id, code: "WAIVER-XY-0001", isActive: false });
    await expect(prisma.$transaction((tx) => recordCouponUsageTx(tx, other.id, inactive.id))).rejects.toBeInstanceOf(CouponAlreadyUsedError);
    expect(await prisma.couponUsage.count({ where: { userId: other.id } })).toBe(0);
  });

  it("keeps a 100% waiver pending unless the academy enabled auto-approval", async () => {
    const student = await createUser();
    const course = await createCourse();
    const coupon = await createCoupon(100);

    await startedEnrollment(student.id, course.id);
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

    await startedEnrollment(student.id, course.id);
    await processEnrollmentPayment(student.id, course.id, null, null, null, coupon.id);

    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    expect(submission.statusEnum).toBe("APPROVED");
    expect(submission.paymentRecordId).not.toBeNull();
    const record = await prisma.paymentRecord.findUniqueOrThrow({ where: { id: submission.paymentRecordId! } });
    expect(record.amountInrPaise).toBe(0);
    const enrollment = await prisma.enrollment.findFirstOrThrow({ where: { userId: student.id } });
    expect(enrollment).toMatchObject({ statusEnum: "ACTIVE", rollNumber: 1 });
    // Auto-approved: the coupon is spent at once.
    expect(await prisma.couponUsage.count({ where: { userId: student.id, couponId: coupon.id } })).toBe(1);
  });
  it.each(["DRAFT", "ON_HOLD", "COMPLETED"] as const)(
    "refuses an auto-approved full waiver once the course is %s, leaving the enrollment as it was",
    async (status) => {
      await setPaymentSettings({ feeWaiverEnabled: true, autoApproveFullWaivers: true });
      const student = await createUser();
      const course = await createCourse();
      const coupon = await createCoupon(100);
      await startedEnrollment(student.id, course.id);
      await prisma.course.update({ where: { id: course.id }, data: { status } });

      const result = await processEnrollmentPayment(student.id, course.id, null, null, null, coupon.id);

      expect(result).toMatchObject({ status: 400 });
      expect(await prisma.coursePaymentSubmission.count()).toBe(0);
      expect(await prisma.paymentRecord.count()).toBe(0);
      expect(await prisma.couponUsage.count()).toBe(0);
      const enrollment = await prisma.enrollment.findFirstOrThrow({ where: { userId: student.id } });
      expect(enrollment).toMatchObject({ statusEnum: "AWAITING_ENROLLMENT_FEE", rollNumber: null });
    },
  );

  it("refuses an enrollment fee while the profile is incomplete", async () => {
    const student = await createUser();
    const course = await createCourse();
    await startedEnrollment(student.id, course.id);
    await prisma.user.update({ where: { id: student.id }, data: { fatherName: null } });

    expect(await processEnrollmentPayment(student.id, course.id, "upi", "UTR8400001", null)).toMatchObject({ status: 400 });
    expect(await prisma.coursePaymentSubmission.count()).toBe(0);
  });
});
