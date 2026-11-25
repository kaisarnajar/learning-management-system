import type { Session } from "next-auth";
import { revalidatePath } from "next/cache";
import type { BookOrderStatus } from "@prisma/client";

import { recordAudit } from "@/services/audit";
import { findStockShortages, formatShortages, lockBooksForUpdate, writeOffUnreturnedStockTx } from "@/services/inventory";
import {
  notifyBookOrderApproved,
  notifyBookOrderDeclined,
  notifyBookOrderRefunded,
  notifyBookOrderShipped,
} from "@/services/notifications";
import { normalizeReason } from "@/services/payment-voiding";
import { paymentTypeData } from "@/services/status-compat";
import { revalidateAdminPaths } from "@/utils/admin-redirects";
import { withDbErrorHandling } from "@/utils/db-error";
import { prisma } from "@/utils/prisma";

/**
 * The book order state machine: PENDING_VERIFICATION → APPROVED → SHIPPED,
 * PENDING_VERIFICATION → DECLINED, APPROVED/SHIPPED → REFUNDED, and voiding
 * (soft delete) of declined or refunded orders. Callers authorise the admin
 * first and map the typed result to their response.
 */

/** A refused operation: `error` is safe to show; `status` is the HTTP status an API would answer. */
export type OrderActionFailure = { ok: false; error: string; status: 400 | 404 | 409 };
export type OrderActionResult<T extends object = object> = ({ ok: true } & T) | OrderActionFailure;

const fail = (error: string, status: OrderActionFailure["status"]): OrderActionFailure => ({ ok: false, error, status });

const MAX_SHIPMENT_FIELD_LENGTH = 100;

/** Cache invalidation after an order changes, for the admin and the buyer's pages. */
export function revalidateOrderPaths(userId: string) {
  const paths = [
    "/admin",
    "/admin/bookstore",
    "/admin/bookstore/orders",
    "/profile/cart",
    "/profile/notifications",
    "/profile",
  ];
  revalidateAdminPaths(paths);
  revalidatePath(`/admin/students/${userId}`, "page");
  revalidatePath(`/admin/students/${userId}`, "page");
}

/** Thrown inside a transaction when the order is no longer in the expected status. */
class OrderStateChanged extends Error {}

/**
 * Moves an order from `from` to `to` atomically. Two admins (or a double
 * click) racing on the same order: only the first update matches, the second
 * sees count === 0 and aborts before any side effect.
 */
async function transitionOrder(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  orderId: string,
  from: BookOrderStatus | BookOrderStatus[],
  to: "APPROVED" | "DECLINED" | "SHIPPED" | "REFUNDED",
  extra: Record<string, unknown> = {},
) {
  const updated = await tx.bookOrder.updateMany({
    where: { id: orderId, status: Array.isArray(from) ? { in: from } : from, deletedAt: null },
    data: { status: to, ...extra },
  });
  if (updated.count === 0) {
    throw new OrderStateChanged("This order was already processed by someone else. Refresh the page.");
  }
}

/**
 * Approves a pending order: checks stock under a lock, records the income and
 * notifies the buyer. `alreadyApproved` is true when it was approved before;
 * nothing was changed then.
 */
export async function approveOrder(orderId: string): Promise<OrderActionResult<{ alreadyApproved: boolean; userId: string }>> {
  const order = await withDbErrorHandling(() => prisma.bookOrder.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, email: true, name: true } }, items: { select: { bookId: true, quantity: true } } },
    }), "Database operation failed");

  if (!order) return fail("Order not found.", 404);

  if (order.status === "APPROVED") {
    return { ok: true, alreadyApproved: true, userId: order.userId };
  }

  if (order.status !== "PENDING_VERIFICATION") {
    return fail("Only pending orders can be approved.", 409);
  }

  try {
    await prisma.$transaction(async (tx) => {
    // Approval commits stock: lock the books, then verify availability under the lock.
    await lockBooksForUpdate(tx, order.items.map((i) => i.bookId));
    const shortages = await findStockShortages(tx, order.items);
    if (shortages.length > 0) {
      throw new OrderStateChanged(`Not enough stock to approve this order: ${formatShortages(shortages)}.`);
    }

    await transitionOrder(tx, orderId, "PENDING_VERIFICATION", "APPROVED");

    // Create a payment record for finance tracking
    await tx.paymentRecord.create({
      data: {
        userId: order.userId,
        bookOrderId: orderId,
        amountInrPaise: order.totalAmountInrPaise,
        paidAt: new Date(),
        ...paymentTypeData("BOOK_PURCHASE"),
        description: `Book order #${orderId.slice(-6).toUpperCase()}`,
      },
    });
    });
  } catch (error) {
    if (error instanceof OrderStateChanged) return fail(error.message, 409);
    throw error;
  }

  await notifyBookOrderApproved({
    userId: order.userId,
    orderId: order.id,
    totalAmountInrPaise: order.totalAmountInrPaise,
  });

  return { ok: true, alreadyApproved: false, userId: order.userId };
}

/** Declines a pending order and notifies the buyer. */
export async function declineOrder(orderId: string): Promise<OrderActionResult<{ userId: string }>> {
  const order = await withDbErrorHandling(() => prisma.bookOrder.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, email: true, name: true } } },
    }), "Database operation failed");

  if (!order) return fail("Order not found.", 404);

  if (order.status !== "PENDING_VERIFICATION") {
    return fail("Only pending orders can be declined.", 409);
  }

  try {
    await prisma.$transaction((tx) => transitionOrder(tx, orderId, "PENDING_VERIFICATION", "DECLINED"));
  } catch (error) {
    if (error instanceof OrderStateChanged) return fail(error.message, 409);
    throw error;
  }

  await notifyBookOrderDeclined({
    userId: order.userId,
    orderId: order.id,
  });

  return { ok: true, userId: order.userId };
}

/** Marks an approved order as shipped with its courier and tracking id, and notifies the buyer. */
export async function shipOrder(
  orderId: string,
  courierServiceName: string,
  trackingId: string,
): Promise<OrderActionResult<{ userId: string }>> {
  if (!courierServiceName?.trim() || !trackingId?.trim()) {
    return fail("Courier Service Name and Tracking ID are required.", 400);
  }
  if (
    courierServiceName.trim().length > MAX_SHIPMENT_FIELD_LENGTH ||
    trackingId.trim().length > MAX_SHIPMENT_FIELD_LENGTH
  ) {
    return fail(`Courier Service Name and Tracking ID must be at most ${MAX_SHIPMENT_FIELD_LENGTH} characters.`, 400);
  }

  const order = await withDbErrorHandling(() => prisma.bookOrder.findUnique({
      where: { id: orderId },
    }), "Database operation failed");

  if (!order) return fail("Order not found.", 404);

  if (order.status !== "APPROVED") {
    return fail("Only approved orders can be marked as shipped.", 409);
  }

  try {
    await prisma.$transaction((tx) =>
      transitionOrder(tx, orderId, "APPROVED", "SHIPPED", {
        courierServiceName: courierServiceName.trim(),
        trackingId: trackingId.trim(),
      }),
    );
  } catch (error) {
    if (error instanceof OrderStateChanged) return fail(error.message, 409);
    throw error;
  }

  await notifyBookOrderShipped({
    userId: order.userId,
    orderId: order.id,
    courierServiceName: courierServiceName.trim(),
    trackingId: trackingId.trim()
  });

  return { ok: true, userId: order.userId };
}

/**
 * Refunds an approved or shipped order. The income that was recorded at
 * approval is voided (kept for audit, excluded from finance and receipts)
 * and the refund is written to the audit log. An approved order's books never
 * left, so they are available again; a shipped order's books are only when
 * the admin confirms they came back (`booksReturned`), otherwise they are
 * written off so the shop cannot sell copies it no longer has.
 */
export async function refundOrder(
  actor: Session,
  orderId: string,
  booksReturned = false,
): Promise<OrderActionResult<{ userId: string }>> {
  const order = await withDbErrorHandling(() => prisma.bookOrder.findUnique({
      where: { id: orderId },
    }), "Database operation failed");

  if (!order || order.deletedAt) return fail("Order not found.", 404);

  if (order.status !== "APPROVED" && order.status !== "SHIPPED") {
    return fail("Only approved or shipped orders can be refunded.", 409);
  }

  try {
    await prisma.$transaction(async (tx) => {
      // From the status read above only: whether the books left depends on it.
      await transitionOrder(tx, orderId, order.status, "REFUNDED");
      const writtenOff = order.status === "SHIPPED" && !booksReturned
        ? await writeOffUnreturnedStockTx(tx, orderId, actor.user.id)
        : 0;

      const shortId = orderId.slice(-6).toUpperCase();
      const voided = await tx.paymentRecord.updateMany({
        where: {
          paymentTypeEnum: "BOOK_PURCHASE",
          userId: order.userId,
          voidedAt: null,
          OR: [{ bookOrderId: orderId }, { bookOrderId: null, description: `Book order #${shortId}` }],
        },
        data: { voidedAt: new Date(), voidReason: `Refunded book order ${shortId}`, voidedById: actor.user.id },
      });

      await recordAudit(tx, actor, {
        action: "refund",
        entity: "BookOrder",
        entityId: orderId,
        before: { status: order.status, totalAmountInrPaise: order.totalAmountInrPaise },
        after: {
          status: "REFUNDED",
          voidedPaymentRecords: voided.count,
          ...(order.status === "SHIPPED" ? { booksReturned, booksWrittenOff: writtenOff } : {}),
        },
      });
    });
  } catch (error) {
    if (error instanceof OrderStateChanged) return fail(error.message, 409);
    throw error;
  }

  await notifyBookOrderRefunded({
    userId: order.userId,
    orderId: order.id,
  });

  return { ok: true, userId: order.userId };
}

/**
 * Voids a declined or refunded order: the order is soft-deleted (kept for
 * audit) and any linked payment record is voided. Approved and shipped
 * orders are fulfilment history and cannot be voided here.
 */
export async function voidOrder(
  actor: Session,
  orderId: string,
  reason?: string,
): Promise<OrderActionResult<{ userId: string }>> {
  const normalizedReason = normalizeReason(reason);
  if (!normalizedReason) {
    return fail("Please give a reason (at least 3 characters); it is recorded in the audit log.", 400);
  }

  const order = await withDbErrorHandling(() => prisma.bookOrder.findUnique({
      where: { id: orderId },
    }), "Database operation failed");

  if (!order || order.deletedAt) return fail("Order not found.", 404);

  if (order.status !== "DECLINED" && order.status !== "REFUNDED") {
    return fail("Only declined or refunded orders can be voided. Decline or refund the order first.", 409);
  }

  await withDbErrorHandling(() => prisma.$transaction(async (tx) => {
    // Linked payment record (FK, with the legacy description match as fallback): void, never delete.
    const shortId = orderId.slice(-6).toUpperCase();
    await tx.paymentRecord.updateMany({
      where: {
        paymentTypeEnum: "BOOK_PURCHASE",
        userId: order.userId,
        voidedAt: null,
        OR: [{ bookOrderId: orderId }, { bookOrderId: null, description: `Book order #${shortId}` }],
      },
      data: { voidedAt: new Date(), voidReason: normalizedReason, voidedById: actor.user.id },
    });

    await tx.bookOrder.update({
      where: { id: orderId },
      data: { deletedAt: new Date() },
    });

    await recordAudit(tx, actor, {
      action: "soft_delete",
      entity: "BookOrder",
      entityId: orderId,
      reason: normalizedReason,
      before: { status: order.status, totalAmountInrPaise: order.totalAmountInrPaise, userId: order.userId },
    });
  }), "Database operation failed");

  return { ok: true, userId: order.userId };
}
