import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { createBookOrder } from "@/services/book-orders";
import { approveOrder, declineOrder, refundOrder, shipOrder, voidOrder } from "@/services/book-order-transitions";
import { createBook, createUser, resetDb, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";

/**
 * The state machine behind the admin order actions answers with typed
 * results; the transitions themselves are covered through the actions in
 * book-orders.test.ts.
 */
describe.skipIf(SKIP_WITHOUT_DB)("book order transitions service", () => {
  beforeEach(resetDb);

  async function pendingOrder() {
    const student = await createUser();
    const book = await createBook();
    const result = await createBookOrder({
      userId: student.id,
      input: {
        items: [{ bookId: book.id, quantity: 1 }],
        paymentMethod: "upi",
        upiTransactionId: `UTR${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        deliveryAddress: "12 Main Street, Srinagar",
        deliveryPinCode: "190001",
        deliveryPhoneNumber: "9876543210",
      },
      screenshotFile: null,
    });
    if (!result.ok) throw new Error(result.error);
    return { student, order: result.order };
  }

  it("walks an order through approval, shipping and refund", async () => {
    const session = sessionFor(await createUser({ email: "admin@example.test" }), "ADMIN") as never;
    const { student, order } = await pendingOrder();

    expect(await approveOrder(order.id)).toEqual({ ok: true, alreadyApproved: false, userId: student.id });
    expect(await approveOrder(order.id)).toEqual({ ok: true, alreadyApproved: true, userId: student.id });
    expect(await shipOrder(order.id, "India Post", "EE123456789IN")).toEqual({ ok: true, userId: student.id });
    expect(await refundOrder(session, order.id, true)).toEqual({ ok: true, userId: student.id });
    expect(await prisma.bookOrder.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ status: "REFUNDED" });
  });

  it("answers refusals with their HTTP status", async () => {
    const session = sessionFor(await createUser({ email: "admin@example.test" }), "ADMIN") as never;
    const { order } = await pendingOrder();

    expect(await approveOrder("missing")).toMatchObject({ ok: false, status: 404 });
    expect(await shipOrder(order.id, " ", "x")).toMatchObject({ ok: false, status: 400 });
    expect(await shipOrder(order.id, "India Post", "EE1")).toMatchObject({ ok: false, status: 409, error: "Only approved orders can be marked as shipped." });
    expect(await voidOrder(session, order.id, "")).toMatchObject({ ok: false, status: 400 });
    expect(await voidOrder(session, order.id, "Duplicate order")).toMatchObject({ ok: false, status: 409 });

    expect(await declineOrder(order.id)).toMatchObject({ ok: true });
    expect(await declineOrder(order.id)).toMatchObject({ ok: false, status: 409 });
    expect(await voidOrder(session, order.id, "Duplicate order")).toMatchObject({ ok: true });
  });
});
