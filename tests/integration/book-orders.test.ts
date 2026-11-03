import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { createBookOrder } from "@/services/book-orders";
import { getStockLevels } from "@/services/inventory";
import {
  approveBookOrder,
  declineBookOrder,
  markBookOrderRefunded,
  markBookOrderShipped,
  voidBookOrder,
} from "@/app/admin/bookstore/orders/actions";
import { getIncomeTotal } from "@/services/finance-income";
import { parseFinanceFilters } from "@/services/finance-filters";
import { createBook, createUser, resetDb, runAction, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";

const input = (items: Array<{ bookId: string; quantity: number }>) => ({
  items,
  paymentMethod: "upi",
  upiTransactionId: `UTR${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
  deliveryAddress: "12 Main Street, Srinagar",
  deliveryPinCode: "190001",
  deliveryPhoneNumber: "9876543210",
});

async function placeOrder(userId: string, items: Array<{ bookId: string; quantity: number }>) {
  const result = await createBookOrder({ userId, input: input(items), screenshotFile: null });
  if (!result.ok) throw new Error(result.error);
  return result.order;
}

describe.skipIf(SKIP_WITHOUT_DB)("book order state machine", () => {
  beforeEach(async () => {
    await resetDb();
    const admin = await createUser({ email: "admin@example.test", name: "Admin" });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
  });

  it("prices the order on the server including the shipping slab", async () => {
    await prisma.shippingChargeSlab.createMany({
      data: [
        { minWeightGrams: 0, maxWeightGrams: 500, chargeInrPaise: 4000 },
        { minWeightGrams: 501, maxWeightGrams: 2000, chargeInrPaise: 9000 },
      ],
    });
    const student = await createUser();
    const book = await createBook({ priceInrPaise: 10000, weightInGrams: 300 });

    const order = await placeOrder(student.id, [{ bookId: book.id, quantity: 2 }]);

    // 2 x 300 g = 600 g -> second slab
    expect(order).toMatchObject({ totalAmountInrPaise: 29000, shippingChargeInrPaise: 9000, status: "PENDING_VERIFICATION" });
    expect(order.items[0]).toMatchObject({ quantity: 2, priceAtPurchaseInrPaise: 10000 });
  });

  it("refuses an order that exceeds the stock and clears the cart on success", async () => {
    const student = await createUser();
    const book = await createBook({ inventoryPurchased: 2 });
    await prisma.userCartItem.create({ data: { userId: student.id, bookId: book.id, quantity: 1 } });

    const tooMany = await createBookOrder({ userId: student.id, input: input([{ bookId: book.id, quantity: 3 }]), screenshotFile: null });
    expect(tooMany).toMatchObject({ ok: false, status: 409 });
    expect(await prisma.bookOrder.count()).toBe(0);
    expect(await prisma.userCartItem.count()).toBe(1);

    await placeOrder(student.id, [{ bookId: book.id, quantity: 2 }]);
    expect(await prisma.userCartItem.count()).toBe(0);
  });

  it("refuses unavailable and unpublished books", async () => {
    const student = await createUser();
    const soldOut = await createBook({ status: "OUT_OF_STOCK" });
    const hidden = await createBook({ published: false });

    const a = await createBookOrder({ userId: student.id, input: input([{ bookId: soldOut.id, quantity: 1 }]), screenshotFile: null });
    const b = await createBookOrder({ userId: student.id, input: input([{ bookId: hidden.id, quantity: 1 }]), screenshotFile: null });

    expect(a).toMatchObject({ ok: false, status: 400 });
    expect(b).toMatchObject({ ok: false, status: 400 });
  });

  it("holds stock from approval, through shipping, and releases it on refund", async () => {
    const student = await createUser();
    const book = await createBook({ inventoryPurchased: 5, priceInrPaise: 10000 });
    const order = await placeOrder(student.id, [{ bookId: book.id, quantity: 2 }]);
    const available = async () => (await getStockLevels(prisma, [book.id])).get(book.id)!.available;

    expect(await available()).toBe(5); // pending orders do not hold stock

    const approved = await runAction(() => approveBookOrder(order.id));
    expect(approved.redirectedTo).toContain("confirmed=1");
    expect(await available()).toBe(3);
    const record = await prisma.paymentRecord.findFirstOrThrow({ where: { bookOrderId: order.id } });
    expect(record).toMatchObject({ amountInrPaise: 20000, paymentTypeEnum: "BOOK_PURCHASE", voidedAt: null });

    const shipped = await runAction(() => markBookOrderShipped(order.id, "Speed Post", "TRK123"));
    expect(shipped.redirectedTo).toContain("shipped=1");
    expect(await prisma.bookOrder.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({
      status: "SHIPPED",
      courierServiceName: "Speed Post",
      trackingId: "TRK123",
    });
    expect(await available()).toBe(3);

    const refunded = await runAction(() => markBookOrderRefunded(order.id));
    expect(refunded.redirectedTo).toContain("refunded=1");
    expect(await available()).toBe(5);
    expect(await prisma.bookOrder.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ status: "REFUNDED" });
    const voided = await prisma.paymentRecord.findUniqueOrThrow({ where: { id: record.id } });
    expect(voided.voidedAt).not.toBeNull();
    expect(voided.voidReason).toContain("Refunded book order");

    const types = (await prisma.studentNotification.findMany({ where: { userId: student.id }, orderBy: { createdAt: "asc" } })).map((n) => n.type);
    expect(types).toEqual(["BOOK_ORDER_APPROVED", "BOOK_ORDER_SHIPPED", "BOOK_ORDER_REFUNDED"]);
  });

  it("only moves orders along the allowed transitions", async () => {
    const student = await createUser();
    const book = await createBook();
    const order = await placeOrder(student.id, [{ bookId: book.id, quantity: 1 }]);

    expect((await markBookOrderShipped(order.id, "Post", "T1")).error).toBe("Only approved orders can be marked as shipped.");
    expect((await markBookOrderRefunded(order.id)).error).toBe("Only approved or shipped orders can be refunded.");

    await runAction(() => declineBookOrder(order.id));
    expect((await approveBookOrder(order.id)).error).toBe("Only pending orders can be approved.");
    expect((await declineBookOrder(order.id)).error).toBe("Only pending orders can be declined.");
    expect((await markBookOrderShipped(order.id, "", "")).error).toBe("Courier Service Name and Tracking ID are required.");
  });

  it("approves each unit of the last copy only once when two orders race", async () => {
    const [a, b] = [await createUser(), await createUser()];
    const book = await createBook({ inventoryPurchased: 1 });
    // Pending orders do not hold stock, so both can be placed.
    const first = await placeOrder(a.id, [{ bookId: book.id, quantity: 1 }]);
    const second = await placeOrder(b.id, [{ bookId: book.id, quantity: 1 }]);

    const results = await Promise.all([
      runAction(() => approveBookOrder(first.id)),
      runAction(() => approveBookOrder(second.id)),
    ]);

    const approvedCount = await prisma.bookOrder.count({ where: { status: "APPROVED" } });
    expect(approvedCount).toBe(1);
    expect(await prisma.paymentRecord.count()).toBe(1);
    const failures = results.filter((r) => r.redirectedTo === null);
    expect(failures).toHaveLength(1);
    expect((failures[0].value as { error?: string }).error).toContain("Not enough stock");
  });

  it("approving the same order twice at once creates a single payment record", async () => {
    const student = await createUser();
    const book = await createBook({ inventoryPurchased: 10 });
    const order = await placeOrder(student.id, [{ bookId: book.id, quantity: 1 }]);

    await Promise.all([runAction(() => approveBookOrder(order.id)), runAction(() => approveBookOrder(order.id))]);

    expect(await prisma.paymentRecord.count({ where: { bookOrderId: order.id } })).toBe(1);
    expect(await prisma.studentNotification.count({ where: { userId: student.id, type: "BOOK_ORDER_APPROVED" } })).toBeLessThanOrEqual(1);
  });

  it("removes refunded income from finance totals and keeps book income out of course income", async () => {
    const student = await createUser();
    const book = await createBook({ priceInrPaise: 10000 });
    const order = await placeOrder(student.id, [{ bookId: book.id, quantity: 1 }]);
    await runAction(() => approveBookOrder(order.id));

    const filters = parseFinanceFilters({ preset: "all_time" });
    // Book sales are reported by the bookstore finance views, not as course income.
    expect(await getIncomeTotal(filters)).toBe(0);
    expect(await getIncomeTotal({ ...filters, paymentType: "book_purchase" as never })).toBe(10000);

    await runAction(() => markBookOrderRefunded(order.id));
    expect(await getIncomeTotal({ ...filters, paymentType: "book_purchase" as never })).toBe(0);
  });

  it("voids only declined or refunded orders, with a reason, and records an audit entry", async () => {
    const student = await createUser();
    const book = await createBook();
    const order = await placeOrder(student.id, [{ bookId: book.id, quantity: 1 }]);

    expect((await voidBookOrder(order.id, "ok"))?.error).toContain("reason");
    expect((await voidBookOrder(order.id, "duplicate order"))?.error).toContain("Only declined or refunded");

    await runAction(() => declineBookOrder(order.id));
    await voidBookOrder(order.id, "duplicate order");

    const row = await prisma.bookOrder.findUniqueOrThrow({ where: { id: order.id } });
    expect(row.deletedAt).not.toBeNull();
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { entity: "BookOrder", entityId: order.id } });
    expect(audit).toMatchObject({ action: "soft_delete", reason: "duplicate order", actorEmail: "admin@example.test" });
    expect((await voidBookOrder(order.id, "again please"))?.error).toBe("Order not found.");
  });

  it("writes a refund audit entry with the number of voided payment records", async () => {
    const student = await createUser();
    const book = await createBook();
    const order = await placeOrder(student.id, [{ bookId: book.id, quantity: 1 }]);
    await runAction(() => approveBookOrder(order.id));

    await runAction(() => markBookOrderRefunded(order.id));

    const audit = await prisma.auditLog.findFirstOrThrow({ where: { entity: "BookOrder", action: "refund" } });
    expect(audit.after).toMatchObject({ status: "REFUNDED", voidedPaymentRecords: 1 });
    expect(audit.before).toMatchObject({ status: "APPROVED" });
  });
});
