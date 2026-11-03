import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { voidApprovedPayment, voidManualPaymentRecord } from "@/app/admin/payments/actions";
import { processEnrollmentPayment } from "@/services/payments";
import { confirmMonthlyPayment } from "@/app/admin/payments/actions";
import { getIncomeRecordsPaginated, getIncomeTotal } from "@/services/finance-income";
import { parseFinanceFilters } from "@/services/finance-filters";
import { getAuditLogPaginated } from "@/services/audit";
import { getPaymentRecordsForUserPaginated, getPaymentSubmissionsForUser } from "@/services/payments";
import { createCourse, createUser, resetDb, runAction, sessionFor, setPaymentSettings, SKIP_WITHOUT_DB } from "../helpers/db";

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
    expect(entries.map((e) => `${e.action}:${e.entity}`).sort()).toEqual(["soft_delete:CoursePaymentSubmission", "void:PaymentRecord"]);
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
    await processEnrollmentPayment(student.id, course.id, "upi", "UTRPENDING1", null);
    const pending = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    expect((await voidApprovedPayment(pending.id, "not approved yet"))?.error).toBe("Only approved payments can be voided.");
    expect(await prisma.auditLog.count()).toBe(2); // only the first void wrote entries
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

  it("never renumbers or alters an issued invoice when a record is voided", async () => {
    const { generateReceipt } = await import("@/app/actions/receipts");
    const fee = await approvedFee();
    const { invoiceNumber } = await generateReceipt(fee.submission.paymentRecordId!);

    await runAction(() => voidApprovedPayment(fee.submission.id, "customer cancelled"));

    const record = await prisma.paymentRecord.findUniqueOrThrow({ where: { id: fee.submission.paymentRecordId! } });
    expect(record.invoiceNumber).toBe(invoiceNumber);
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
