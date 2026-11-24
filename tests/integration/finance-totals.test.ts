import { beforeEach, describe, expect, it } from "vitest";
import type { BookOrderStatus } from "@prisma/client";
import { prisma } from "@/utils/prisma";
import { getBookstoreFinanceSummary } from "@/services/finance-bookstore";
import { getFeeWaiverFinanceData } from "@/services/waiver-finance";
import { parseFinanceFilters, type FinanceFilters } from "@/services/finance-filters";
import { createBook, createCourse, createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

/**
 * The bookstore and waiver totals moved from JavaScript loops over every row
 * to SQL aggregates (M23). These reference implementations are the previous
 * row-by-row computations; the seeded dataset covers each branch, and the
 * services must agree with them exactly.
 */

async function referenceBookstoreSummary(filters: FinanceFilters) {
  const createdAt = filters.from || filters.to ? { gte: filters.from ?? undefined, lte: filters.to ?? undefined } : undefined;
  const books = await prisma.book.findMany({ include: { stockMovements: true } });
  const orders = await prisma.bookOrder.findMany({
    where: { deletedAt: null, ...(createdAt ? { createdAt } : {}) },
    include: { items: { include: { book: true } } },
  });
  const sum = { purchased: 0, cost: 0, sold: 0, revenue: 0, shipping: 0, profit: 0, pending: 0, approved: 0, completed: 0, valid: 0 };
  for (const b of books) {
    sum.purchased += b.inventoryPurchased;
    sum.cost += b.inventoryPurchased * b.purchasePriceInrPaise;
  }
  for (const o of orders) {
    if (o.status === "PENDING_VERIFICATION") sum.pending += o.totalAmountInrPaise;
    else if (o.status === "APPROVED") sum.approved += o.totalAmountInrPaise;
    else if (o.status === "SHIPPED") sum.completed += o.totalAmountInrPaise;
    if (o.status === "APPROVED" || o.status === "SHIPPED") {
      sum.shipping += o.shippingChargeInrPaise;
      sum.valid++;
      for (const i of o.items) {
        sum.sold += i.quantity;
        const revenue = i.quantity * i.priceAtPurchaseInrPaise;
        sum.revenue += revenue;
        sum.profit += revenue - i.quantity * (i.unitCostPaise ?? i.book.purchasePriceInrPaise);
      }
    }
  }
  const adjustments = books.reduce((s, b) => s + b.stockMovements.reduce((t, m) => t + m.delta, 0), 0);
  const committed = await prisma.bookOrderItem.findMany({ where: { order: { status: { in: ["APPROVED", "SHIPPED"] }, deletedAt: null } } });
  return {
    totalBooksPurchased: sum.purchased,
    totalBooksSold: sum.sold,
    currentInventoryCount: sum.purchased + adjustments - committed.reduce((s, i) => s + i.quantity, 0),
    totalPurchaseCostPaise: sum.cost,
    totalSalesRevenuePaise: sum.revenue,
    totalShippingCollectedPaise: sum.shipping,
    totalProfitLossPaise: sum.profit,
    pendingOrdersValuePaise: sum.pending,
    approvedOrdersValuePaise: sum.approved,
    completedOrdersValuePaise: sum.completed,
    averageOrderValuePaise: sum.valid > 0 ? Math.round((sum.revenue + sum.shipping) / sum.valid) : 0,
  };
}

async function referenceWaiverStats(filters: FinanceFilters) {
  const rows = await prisma.coursePaymentSubmission.findMany({
    where: {
      status: "approved",
      deletedAt: null,
      couponId: { not: null },
      ...(filters.from || filters.to ? { createdAt: { gte: filters.from ?? undefined, lte: filters.to ?? undefined } } : {}),
    },
    include: { course: true },
  });
  const s = { totalWaiverCount: 0, totalSumWaivedPaise: 0, totalOriginalFeePaise: 0, totalNetPaidPaise: 0, fullWaiverCount: 0, fullWaiverSumPaise: 0, partialWaiverCount: 0, partialWaiverSumPaise: 0 };
  for (const r of rows) {
    const current = r.paymentType === "enrollment" ? r.course.priceInrPaise : r.course.monthlyFeeInrPaise;
    const original = Math.max(r.baseFeePaise ?? current, r.amountInrPaise);
    const waived = Math.max(0, original - r.amountInrPaise);
    s.totalWaiverCount++;
    s.totalSumWaivedPaise += waived;
    s.totalOriginalFeePaise += original;
    s.totalNetPaidPaise += r.amountInrPaise;
    if (r.amountInrPaise === 0) {
      s.fullWaiverCount++;
      s.fullWaiverSumPaise += waived;
    } else {
      s.partialWaiverCount++;
      s.partialWaiverSumPaise += waived;
    }
  }
  return s;
}

const IN_RANGE = new Date("2026-03-15T06:00:00Z");
const OUT_OF_RANGE = new Date("2026-01-15T06:00:00Z");
const MARCH = parseFinanceFilters({ from: "2026-03-01", to: "2026-03-31" });
const ALL_TIME = parseFinanceFilters({ preset: "all_time" });

describe.skipIf(SKIP_WITHOUT_DB)("finance totals computed in SQL match the row-by-row computation", () => {
  beforeEach(resetDb);

  it("bookstore summary", async () => {
    const student = await createUser();
    const cheap = await createBook({ priceInrPaise: 10000, purchasePriceInrPaise: 6000, inventoryPurchased: 50 });
    const dear = await createBook({ priceInrPaise: 25000, purchasePriceInrPaise: 18000, inventoryPurchased: 20 });
    await prisma.bookStockMovement.createMany({
      data: [
        { bookId: cheap.id, delta: 5, reason: "restock" },
        { bookId: dear.id, delta: -2, reason: "damaged" },
      ],
    });

    const orders: Array<{ status: BookOrderStatus; createdAt: Date; deletedAt?: Date; lines: Array<[string, number, number, number | null]> }> = [
      { status: "APPROVED", createdAt: IN_RANGE, lines: [[cheap.id, 2, 10000, 6000], [dear.id, 1, 25000, 18000]] },
      { status: "SHIPPED", createdAt: IN_RANGE, lines: [[cheap.id, 3, 9500, null]] },
      { status: "SHIPPED", createdAt: IN_RANGE, lines: [[cheap.id, 1, 10000, 5500], [dear.id, 2, 24000, null]] },
      { status: "PENDING_VERIFICATION", createdAt: IN_RANGE, lines: [[dear.id, 4, 25000, 18000]] },
      { status: "DECLINED", createdAt: IN_RANGE, lines: [[cheap.id, 1, 10000, 6000]] },
      { status: "REFUNDED", createdAt: IN_RANGE, lines: [[dear.id, 1, 25000, 18000]] },
      { status: "APPROVED", createdAt: OUT_OF_RANGE, lines: [[cheap.id, 5, 10000, 6000]] },
      { status: "SHIPPED", createdAt: IN_RANGE, deletedAt: IN_RANGE, lines: [[dear.id, 1, 25000, 18000]] },
    ];
    for (const [n, o] of orders.entries()) {
      const items = o.lines.map(([bookId, quantity, price, cost]) => ({ bookId, quantity, priceAtPurchaseInrPaise: price, unitCostPaise: cost }));
      const subtotal = items.reduce((s, i) => s + i.quantity * i.priceAtPurchaseInrPaise, 0);
      const shipping = 4000 + n * 500;
      await prisma.bookOrder.create({
        data: {
          userId: student.id,
          status: o.status,
          createdAt: o.createdAt,
          deletedAt: o.deletedAt ?? null,
          totalAmountInrPaise: subtotal + shipping,
          shippingChargeInrPaise: shipping,
          paymentMethod: "upi",
          upiTransactionId: `UTRSUM${n}`,
          deliveryAddress: "12 Main Street, Srinagar",
          items: { create: items },
        },
      });
    }
    // Today's cost differs from every snapshot, so the fallback branch is visible.
    await prisma.book.update({ where: { id: cheap.id }, data: { purchasePriceInrPaise: 7000 } });

    for (const filters of [MARCH, ALL_TIME]) {
      const actual = await getBookstoreFinanceSummary(filters);
      expect(actual).toEqual(await referenceBookstoreSummary(filters));
    }
    // A sanity anchor, so both sides cannot agree on nothing.
    expect((await getBookstoreFinanceSummary(MARCH)).totalBooksSold).toBe(9);
  });

  it("waiver totals", async () => {
    const student = await createUser();
    const a = await createCourse({ priceInrPaise: 50000, monthlyFeeInrPaise: 30000 });
    const b = await createCourse({ priceInrPaise: 80000, monthlyFeeInrPaise: 45000 });
    const coupon = await prisma.coupon.create({
      data: { code: "SUMS", percentage: 50, type: "DEFAULT", validFrom: OUT_OF_RANGE, validUntil: IN_RANGE, isActive: true },
    });

    const rows: Array<[string, "enrollment" | "monthly", number, number | null, Date, string?]> = [
      [a.id, "enrollment", 25000, 50000, IN_RANGE],
      [a.id, "enrollment", 25000, 50000, IN_RANGE],
      [a.id, "monthly", 0, 30000, IN_RANGE],
      [a.id, "monthly", 15000, null, IN_RANGE],
      [b.id, "enrollment", 0, null, IN_RANGE],
      [b.id, "monthly", 50000, 45000, IN_RANGE], // paid more than the fee: nothing waived
      [b.id, "monthly", 22500, 40000, OUT_OF_RANGE],
      [b.id, "monthly", 10000, 45000, IN_RANGE, "pending_verification"],
    ];
    for (const [n, [courseId, paymentType, amount, base, createdAt, status]] of rows.entries()) {
      await prisma.coursePaymentSubmission.create({
        data: {
          userId: student.id,
          courseId,
          paymentType,
          label: `Fee ${n} (50% Fee Waiver)`,
          amountInrPaise: amount,
          baseFeePaise: base,
          status: status ?? "approved",
          couponId: coupon.id,
          createdAt,
        },
      });
    }

    for (const filters of [MARCH, ALL_TIME]) {
      const { stats, paginatedResult } = await getFeeWaiverFinanceData(filters);
      expect(stats).toEqual(await referenceWaiverStats(filters));
      expect(paginatedResult.totalCount).toBe(stats.totalWaiverCount);
    }
    expect((await getFeeWaiverFinanceData(MARCH)).stats.totalWaiverCount).toBe(6);
  });
});
