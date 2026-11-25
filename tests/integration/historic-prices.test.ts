import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { getPaymentRecordById, processEnrollmentPayment } from "@/services/payments";
import { prepareReceiptData } from "@/services/payment-receipt";
import { getFeeWaiverFinanceData } from "@/services/waiver-finance";
import { parseFinanceFilters } from "@/services/finance-filters";
import { createBookOrder } from "@/services/book-orders";
import { getBookOrderFinanceAll, getBookSalesAll, getBookstoreFinanceSummary } from "@/services/finance-bookstore";
import { confirmMonthlyPayment } from "@/app/admin/payments/actions";
import { approveBookOrder } from "@/app/admin/bookstore/orders/actions";
import {
  createBook,
  createCourse,
  createUser,
  resetDb,
  runAction,
  sessionFor,
  setPaymentSettings,
  SKIP_WITHOUT_DB,
  startedEnrollment,
} from "../helpers/db";

const ALL_TIME = parseFinanceFilters({ preset: "all_time" });

/** Reports read the price in force at the time of sale, not today's (L17). */
describe.skipIf(SKIP_WITHOUT_DB)("historic reports use the price at the time of sale", () => {
  beforeEach(async () => {
    await resetDb();
    await setPaymentSettings({ feeWaiverEnabled: true });
    const admin = await createUser({ email: "admin@example.test", name: "Admin" });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
  });

  /** A 50% waived ₹500 enrollment fee, approved, after which the fee goes up to ₹800. */
  async function waivedEnrollmentThenFeeRise() {
    const student = await createUser();
    const course = await createCourse({ priceInrPaise: 50000 });
    const coupon = await prisma.coupon.create({
      data: {
        code: "HALF",
        percentage: 50,
        type: "DEFAULT",
        validFrom: new Date(Date.now() - 86_400_000),
        validUntil: new Date(Date.now() + 30 * 86_400_000),
        isActive: true,
        applyToEnrollment: true,
        applyToCourse: false,
      },
    });
    await startedEnrollment(student.id, course.id);
    expect(await processEnrollmentPayment(student.id, course.id, "upi", "UTR9100001", null, coupon.id, 25000)).toEqual({ success: true });
    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    await runAction(() => confirmMonthlyPayment(submission.id));
    await prisma.course.update({ where: { id: course.id }, data: { priceInrPaise: 80000 } });
    const approved = await prisma.coursePaymentSubmission.findUniqueOrThrow({ where: { id: submission.id } });
    return { course, submission: approved };
  }

  it("the waiver report and the receipt discount keep the fee the student was charged against", async () => {
    const { course, submission } = await waivedEnrollmentThenFeeRise();

    const { stats, paginatedResult } = await getFeeWaiverFinanceData(ALL_TIME);
    expect(paginatedResult.items).toHaveLength(1);
    expect(paginatedResult.items[0]).toMatchObject({ originalFeePaise: 50000, waivedAmountPaise: 25000, discountPercentage: 50, netPaidPaise: 25000 });
    expect(stats).toMatchObject({ totalOriginalFeePaise: 50000, totalSumWaivedPaise: 25000 });

    const record = await getPaymentRecordById(submission.paymentRecordId!);
    const { receiptData } = await prepareReceiptData(record!, course.title);
    expect(receiptData.payment).toMatchObject({ originalAmount: 500, discountAmount: 250, discountPercentage: 50 });
  });

  it("falls back to the current fee for submissions made before the snapshot existed", async () => {
    const { course, submission } = await waivedEnrollmentThenFeeRise();
    await prisma.coursePaymentSubmission.update({ where: { id: submission.id }, data: { baseFeePaise: null } });

    const { paginatedResult } = await getFeeWaiverFinanceData(ALL_TIME);
    expect(paginatedResult.items[0]).toMatchObject({ originalFeePaise: 80000, waivedAmountPaise: 55000 });

    const record = await getPaymentRecordById(submission.paymentRecordId!);
    const { receiptData } = await prepareReceiptData(record!, course.title);
    expect(receiptData.payment).toMatchObject({ originalAmount: 800, discountAmount: 550 });
  });

  it("the waiver report's date range follows when the waiver was claimed, not its last edit", async () => {
    const { submission } = await waivedEnrollmentThenFeeRise();
    await prisma.coursePaymentSubmission.update({
      where: { id: submission.id },
      data: { createdAt: new Date("2026-01-10T06:00:00Z") },
    });

    const january = await getFeeWaiverFinanceData(parseFinanceFilters({ from: "2026-01-01", to: "2026-01-31" }));
    expect(january.paginatedResult.items.map((i) => i.id)).toEqual([submission.id]);
    expect(january.paginatedResult.items[0].date).toEqual(new Date("2026-01-10T06:00:00Z"));

    // updatedAt is today; a range around today no longer picks the January waiver up.
    const today = new Date().toISOString().slice(0, 10);
    const now = await getFeeWaiverFinanceData(parseFinanceFilters({ from: today, to: today }));
    expect(now.paginatedResult.totalCount).toBe(0);
  });

  it("bookstore profit keeps the purchase cost of the copies that were sold", async () => {
    const student = await createUser();
    const book = await createBook({ priceInrPaise: 10000, purchasePriceInrPaise: 6000, inventoryPurchased: 5 });
    const placed = await createBookOrder({
      userId: student.id,
      input: {
        items: [{ bookId: book.id, quantity: 2 }],
        paymentMethod: "upi",
        upiTransactionId: "UTR9200001",
        deliveryAddress: "12 Main Street, Srinagar",
        deliveryPinCode: "190001",
        deliveryPhoneNumber: "9876543210",
      },
      screenshotFile: null,
    });
    if (!placed.ok) throw new Error(placed.error);
    await runAction(() => approveBookOrder(placed.order.id));
    await prisma.book.update({ where: { id: book.id }, data: { purchasePriceInrPaise: 9000 } });

    // 2 copies x (₹100 sale − ₹60 cost at the time) = ₹80, whatever the cost is now.
    expect((await getBookstoreFinanceSummary(ALL_TIME)).totalProfitLossPaise).toBe(8000);
    expect((await getBookOrderFinanceAll(ALL_TIME))[0].profitContributionPaise).toBe(8000);
    expect((await getBookSalesAll(ALL_TIME))[0].profitPaise).toBe(8000);

    // A line from before the snapshot uses today's cost.
    await prisma.bookOrderItem.updateMany({ where: { orderId: placed.order.id }, data: { unitCostPaise: null } });
    expect((await getBookstoreFinanceSummary(ALL_TIME)).totalProfitLossPaise).toBe(2000);
  });
});
