import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { voidApprovedPayment, voidManualPaymentRecord } from "@/app/admin/payments/actions";
import { processEnrollmentPayment, processMonthlyPayment } from "@/services/payments";
import { confirmMonthlyPayment } from "@/app/admin/payments/actions";
import { getIncomeRecordsPaginated, getIncomeTotal } from "@/services/finance-income";
import { parseFinanceFilters } from "@/services/finance-filters";
import { getAuditLogPaginated } from "@/services/audit";
import { getPaymentRecordsForUserPaginated, getPaymentSubmissionsForUser } from "@/services/payments";
import { getApplicableCoupons } from "@/services/coupons";
import { paymentTypeData } from "@/services/status-compat";
import { createCourse, createEnrollment, createUser, resetDb, runAction, sessionFor, setPaymentSettings, SKIP_WITHOUT_DB, startedEnrollment } from "../helpers/db";

const allTime = () => parseFinanceFilters({ preset: "all_time" });

describe.skipIf(SKIP_WITHOUT_DB)("voiding, finance totals and the audit trail", () => {
  beforeEach(async () => {
    await resetDb();
    await setPaymentSettings();
    const admin = await createUser({ email: "admin@example.test", name: "Admin" });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
  });

  async function approvedFee(amountPaise = 50000) {
    const student = await createUser();
    const course = await createCourse({ priceInrPaise: amountPaise });
    await startedEnrollment(student.id, course.id);
    await processEnrollmentPayment(student.id, course.id, "upi", `UTR${Math.random().toString(36).slice(2, 10)}`, null);
    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    await runAction(() => confirmMonthlyPayment(submission.id));
    const approved = await prisma.coursePaymentSubmission.findUniqueOrThrow({ where: { id: submission.id } });
    return { student, course, submission: approved };
  }

  it("excludes a voided fee payment from finance totals and the student's history, but keeps the rows", async () => {
    const kept = await approvedFee(20000);
    const voided = await approvedFee(50000);
    expect(await getIncomeTotal(allTime())).toBe(70000);

    const result = await runAction(() => voidApprovedPayment(voided.submission.id, "entered twice by mistake"));

    expect(result.redirectedTo).toContain("deleted=1");
    expect(await getIncomeTotal(allTime())).toBe(20000);
    const income = await getIncomeRecordsPaginated(allTime(), 1, 50);
    expect(income.items.map((r) => r.id)).toEqual([kept.submission.paymentRecordId]);

    const record = await prisma.paymentRecord.findUniqueOrThrow({ where: { id: voided.submission.paymentRecordId! } });
    expect(record).toMatchObject({ voidReason: "entered twice by mistake" });
    expect(record.voidedAt).not.toBeNull();
    expect(record.voidedById).not.toBeNull();
    expect((await getPaymentRecordsForUserPaginated(voided.student.id, 1, 10)).totalCount).toBe(0);
    expect(await getPaymentSubmissionsForUser(voided.student.id)).toHaveLength(0);
    expect(await prisma.coursePaymentSubmission.count({ where: { id: voided.submission.id, deletedAt: { not: null } } })).toBe(1);
  });

  it("writes one audit entry per voided object, with before/after and the admin who did it", async () => {
    const fee = await approvedFee(50000);

    await runAction(() => voidApprovedPayment(fee.submission.id, "wrong student"));

    const entries = await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } });
    // An enrollment fee: the reopened enrollment is audited too.
    expect(entries.map((e) => `${e.action}:${e.entity}`).sort()).toEqual([
      "soft_delete:CoursePaymentSubmission",
      "update:Enrollment",
      "void:PaymentRecord",
    ]);
    const voidEntry = entries.find((e) => e.action === "void")!;
    expect(voidEntry).toMatchObject({ entityId: fee.submission.paymentRecordId, reason: "wrong student", actorEmail: "admin@example.test" });
    expect(voidEntry.before).toMatchObject({ amountInrPaise: 50000 });
    expect(voidEntry.actorId).not.toBeNull();

    const page = await getAuditLogPaginated(1, 10, { entity: "PaymentRecord" });
    expect(page.totalCount).toBe(1);
  });

  it("requires a reason and refuses to void twice or to void a pending payment", async () => {
    const fee = await approvedFee();

    expect((await voidApprovedPayment(fee.submission.id, "  "))?.error).toContain("reason");
    await runAction(() => voidApprovedPayment(fee.submission.id, "wrong student"));
    expect((await voidApprovedPayment(fee.submission.id, "again please"))?.error).toBe("Payment submission not found.");

    const student = await createUser();
    const course = await createCourse();
    await startedEnrollment(student.id, course.id);
    await processEnrollmentPayment(student.id, course.id, "upi", "UTRPENDING1", null);
    const pending = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    expect((await voidApprovedPayment(pending.id, "not approved yet"))?.error).toBe("Only approved payments can be voided.");
    expect(await prisma.auditLog.count()).toBe(3); // only the first void wrote entries
  });

  it("voids a manually recorded payment and removes it from income", async () => {
    const student = await createUser();
    const record = await prisma.paymentRecord.create({
      data: { userId: student.id, amountInrPaise: 15000, paidAt: new Date(), paymentType: "manual", paymentTypeEnum: "MANUAL", description: "Cash" },
    });
    expect(await getIncomeTotal(allTime())).toBe(15000);

    const result = await runAction(() => voidManualPaymentRecord(record.id, "recorded in error"));

    expect(result.redirectedTo).toContain("deleted=1");
    expect(await getIncomeTotal(allTime())).toBe(0);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { entity: "PaymentRecord", entityId: record.id } });
    expect(audit).toMatchObject({ action: "void", reason: "recorded in error" });
    expect((await voidManualPaymentRecord(record.id, "second try"))?.error).toBe("Payment record not found.");
  });

  it("refuses to void a fee payment or a book order's payment as a manual record", async () => {
    const fee = await approvedFee(20000);
    const result = await voidManualPaymentRecord(fee.submission.paymentRecordId!, "wrong flow");
    expect(result?.error).toContain("fee payment");

    const student = await createUser();
    const order = await prisma.bookOrder.create({ data: { userId: student.id, totalAmountInrPaise: 30000, status: "APPROVED" } });
    const bookRecord = await prisma.paymentRecord.create({
      data: { userId: student.id, amountInrPaise: 30000, paidAt: new Date(), ...paymentTypeData("BOOK_PURCHASE"), description: "Books", bookOrderId: order.id },
    });
    expect((await voidManualPaymentRecord(bookRecord.id, "wrong flow"))?.error).toContain("book order");

    // Nothing changed and nothing was audited.
    expect(await prisma.paymentRecord.count({ where: { voidedAt: { not: null } } })).toBe(0);
    expect(await prisma.auditLog.count()).toBe(0);
  });

  it("never renumbers or alters an issued invoice when a record is voided", async () => {
    const { generateReceipt } = await import("@/app/actions/receipts");
    const fee = await approvedFee();
    const { invoiceNumber } = await generateReceipt(fee.submission.paymentRecordId!);

    await runAction(() => voidApprovedPayment(fee.submission.id, "customer cancelled"));

    const record = await prisma.paymentRecord.findUniqueOrThrow({ where: { id: fee.submission.paymentRecordId! } });
    expect(record.invoiceNumber).toBe(invoiceNumber);
  });

  it("lets the student pay a fee period again after its payment was voided", async () => {
    const student = await createUser();
    const course = await createCourse();
    await createEnrollment(student.id, course.id);

    expect(await processMonthlyPayment(student.id, course.id, "03", "2026", "upi", "UTR8100001", null)).toEqual({ success: true });
    const first = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    await runAction(() => confirmMonthlyPayment(first.id));
    await runAction(() => voidApprovedPayment(first.id, "recorded against the wrong month"));

    // The voided submission is soft-deleted; it must not block a new one for the same period.
    expect(await processMonthlyPayment(student.id, course.id, "03", "2026", "upi", "UTR8100002", null)).toEqual({ success: true });
    expect(await prisma.coursePaymentSubmission.count({ where: { userId: student.id, deletedAt: null } })).toBe(1);
  });

  it("voiding an enrollment fee reopens the enrollment and gives its coupon back", async () => {
    await setPaymentSettings({ feeWaiverEnabled: true });
    const student = await createUser();
    const course = await createCourse();
    const coupon = await prisma.coupon.create({
      data: {
        code: "WAIVER-AK-9999",
        percentage: 50,
        type: "SPECIAL",
        userId: student.id,
        validFrom: new Date(Date.now() - 86_400_000),
        validUntil: new Date(Date.now() + 30 * 86_400_000),
      },
    });
    await startedEnrollment(student.id, course.id);
    expect(await processEnrollmentPayment(student.id, course.id, "upi", "UTR8700001", null, coupon.id, 25000)).toEqual({ success: true });
    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    await runAction(() => confirmMonthlyPayment(submission.id));
    const active = await prisma.enrollment.findFirstOrThrow({ where: { userId: student.id } });
    expect(active).toMatchObject({ statusEnum: "ACTIVE", rollNumber: 1 });
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).isActive).toBe(false);

    await runAction(() => voidApprovedPayment(submission.id, "the transfer bounced"));

    // Back to awaiting the fee (what the course page shows), roll number kept.
    const reopened = await prisma.enrollment.findUniqueOrThrow({ where: { id: active.id } });
    expect(reopened).toMatchObject({ status: "awaiting_enrollment_fee", statusEnum: "AWAITING_ENROLLMENT_FEE", rollNumber: 1 });
    expect(await prisma.couponUsage.count()).toBe(0);
    expect(await getApplicableCoupons(student.id, course.id, "enrollment")).toEqual([
      expect.objectContaining({ id: coupon.id, isUsed: false }),
    ]);
    const audit = await prisma.auditLog.findMany({ where: { entity: { in: ["Enrollment", "Coupon"] } } });
    expect(audit.map((e) => `${e.action}:${e.entity}:${e.entityId}`).sort()).toEqual([
      `restore:Coupon:${coupon.id}`,
      `update:Enrollment:${active.id}`,
    ]);
    expect(audit.find((e) => e.entity === "Enrollment")).toMatchObject({
      reason: "the transfer bounced",
      before: { status: "ACTIVE", rollNumber: 1 },
      after: { status: "AWAITING_ENROLLMENT_FEE", rollNumber: 1 },
    });

    // The student can pay again, with the same coupon, and keeps the roll number.
    expect(await processEnrollmentPayment(student.id, course.id, "upi", "UTR8700002", null, coupon.id, 25000)).toEqual({ success: true });
    const again = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id, deletedAt: null } });
    await runAction(() => confirmMonthlyPayment(again.id));
    expect(await prisma.enrollment.findUniqueOrThrow({ where: { id: active.id } })).toMatchObject({ statusEnum: "ACTIVE", rollNumber: 1 });
  });

  it("does not let a non-admin void anything", async () => {
    const fee = await approvedFee();
    const student = await createUser();
    vi.mocked(auth).mockResolvedValue(sessionFor(student, "STUDENT") as never);

    const result = await runAction(() => voidApprovedPayment(fee.submission.id, "I want my money back"));

    expect(result.redirectedTo).toContain("/login");
    expect((await prisma.paymentRecord.findUniqueOrThrow({ where: { id: fee.submission.paymentRecordId! } })).voidedAt).toBeNull();
  });
});
