"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/services/auth-actions";
import {
  notifyBookOrderApproved,
  notifyBookOrderDeclined,
  notifyBookOrderShipped,
  notifyBookOrderRefunded,
} from "@/services/notifications";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { recordAudit } from "@/services/audit";
import { normalizeReason } from "@/services/payment-voiding";
import { PAYMENTS } from "@/config/constants/payments";
import type { BookOrderStatus } from "@prisma/client";
import { findStockShortages, formatShortages, lockBooksForUpdate } from "@/services/inventory";
import { paymentTypeData } from "@/services/status-compat";

const MAX_SHIPMENT_FIELD_LENGTH = 100;

function revalidateOrderPaths(userId: string) {
  const paths = [
    "/admin",
    "/admin/bookstore",
    "/admin/bookstore/orders",
    "/profile/cart",
    "/profile/notifications",
    "/profile",
  ];
  for (const p of paths) {
    revalidatePath(p, "page");
    revalidatePath(p, "layout");
  }
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

function orderReturnUrl(returnTo: string | undefined, event: string): string {
  const fallback = `/admin/bookstore/orders?${event}=1`;
  if (!returnTo?.startsWith("/admin")) return fallback;
  const [pathname, query = ""] = returnTo.split("?");
  const params = new URLSearchParams(query);
  params.set(event, "1");
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : fallback;
}

export async function approveBookOrder(
  orderId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const order = await withDbErrorHandling(() => prisma.bookOrder.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, email: true, name: true } }, items: { select: { bookId: true, quantity: true } } },
    }), "Database operation failed");

  if (!order) return { error: "Order not found." };

  if (order.status === "APPROVED") {
    redirect(orderReturnUrl(returnTo, "confirmed"));
  }

  if (order.status !== "PENDING_VERIFICATION") {
    return { error: "Only pending orders can be approved." };
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
    if (error instanceof OrderStateChanged) return { error: error.message };
    throw error;
  }

  await notifyBookOrderApproved({
    userId: order.userId,
    orderId: order.id,
    totalAmountInrPaise: order.totalAmountInrPaise,
  });

  revalidateOrderPaths(order.userId);
  redirect(orderReturnUrl(returnTo, "confirmed"));
}

export async function declineBookOrder(
  orderId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const order = await withDbErrorHandling(() => prisma.bookOrder.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, email: true, name: true } } },
    }), "Database operation failed");

  if (!order) return { error: "Order not found." };

  if (order.status !== "PENDING_VERIFICATION") {
    return { error: "Only pending orders can be declined." };
  }

  try {
    await prisma.$transaction((tx) => transitionOrder(tx, orderId, "PENDING_VERIFICATION", "DECLINED"));
  } catch (error) {
    if (error instanceof OrderStateChanged) return { error: error.message };
    throw error;
  }

  await notifyBookOrderDeclined({
    userId: order.userId,
    orderId: order.id,
  });

  revalidateOrderPaths(order.userId);
  redirect(orderReturnUrl(returnTo, "declined"));
}

export async function markBookOrderShipped(
  orderId: string,
  courierServiceName: string,
  trackingId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  if (!courierServiceName?.trim() || !trackingId?.trim()) {
    return { error: "Courier Service Name and Tracking ID are required." };
  }
  if (
    courierServiceName.trim().length > MAX_SHIPMENT_FIELD_LENGTH ||
    trackingId.trim().length > MAX_SHIPMENT_FIELD_LENGTH
  ) {
    return {
      error: `Courier Service Name and Tracking ID must be at most ${MAX_SHIPMENT_FIELD_LENGTH} characters.`,
    };
  }

  const order = await withDbErrorHandling(() => prisma.bookOrder.findUnique({
      where: { id: orderId },
    }), "Database operation failed");

  if (!order) return { error: "Order not found." };

  if (order.status !== "APPROVED") {
    return { error: "Only approved orders can be marked as shipped." };
  }

  try {
    await prisma.$transaction((tx) =>
      transitionOrder(tx, orderId, "APPROVED", "SHIPPED", {
        courierServiceName: courierServiceName.trim(),
        trackingId: trackingId.trim(),
      }),
    );
  } catch (error) {
    if (error instanceof OrderStateChanged) return { error: error.message };
    throw error;
  }

  await notifyBookOrderShipped({
    userId: order.userId,
    orderId: order.id,
    courierServiceName: courierServiceName.trim(),
    trackingId: trackingId.trim()
  });

  revalidateOrderPaths(order.userId);
  redirect(orderReturnUrl(returnTo, "shipped"));
}

/**
 * Refunds an approved or shipped order. The income that was recorded at
 * approval is voided (kept for audit, excluded from finance and receipts)
 * and the refund is written to the audit log.
 */
export async function markBookOrderRefunded(
  orderId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  const session = await requireAdmin();

  const order = await withDbErrorHandling(() => prisma.bookOrder.findUnique({
      where: { id: orderId },
    }), "Database operation failed");

  if (!order || order.deletedAt) return { error: "Order not found." };

  if (order.status !== "APPROVED" && order.status !== "SHIPPED") {
    return { error: "Only approved or shipped orders can be refunded." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await transitionOrder(tx, orderId, ["APPROVED", "SHIPPED"], "REFUNDED");

      const shortId = orderId.slice(-6).toUpperCase();
      const voided = await tx.paymentRecord.updateMany({
        where: {
          paymentType: PAYMENTS.TYPES.BOOK_ORDER,
          userId: order.userId,
          voidedAt: null,
          OR: [{ bookOrderId: orderId }, { bookOrderId: null, description: `Book order #${shortId}` }],
        },
        data: { voidedAt: new Date(), voidReason: `Refunded book order ${shortId}`, voidedById: session.user.id },
      });

      await recordAudit(tx, session, {
        action: "refund",
        entity: "BookOrder",
        entityId: orderId,
        before: { status: order.status, totalAmountInrPaise: order.totalAmountInrPaise },
        after: { status: "REFUNDED", voidedPaymentRecords: voided.count },
      });
    });
  } catch (error) {
    if (error instanceof OrderStateChanged) return { error: error.message };
    throw error;
  }

  await notifyBookOrderRefunded({
    userId: order.userId,
    orderId: order.id,
  });

  revalidateOrderPaths(order.userId);
  redirect(orderReturnUrl(returnTo, "refunded"));
}

/**
 * Voids a declined or refunded order: the order is soft-deleted (kept for
 * audit) and any linked payment record is voided. Approved and shipped
 * orders are fulfilment history and cannot be voided here.
 */
export async function voidBookOrder(
  orderId: string,
  reason?: string,
): Promise<{ error?: string } | void> {
  const session = await requireAdmin();
  const normalizedReason = normalizeReason(reason);
  if (!normalizedReason) {
    return { error: "Please give a reason (at least 3 characters); it is recorded in the audit log." };
  }

  const order = await withDbErrorHandling(() => prisma.bookOrder.findUnique({
      where: { id: orderId },
    }), "Database operation failed");

  if (!order || order.deletedAt) return { error: "Order not found." };

  if (order.status !== "DECLINED" && order.status !== "REFUNDED") {
    return { error: "Only declined or refunded orders can be voided. Decline or refund the order first." };
  }

  await withDbErrorHandling(() => prisma.$transaction(async (tx) => {
    // Linked payment record (FK, with the legacy description match as fallback): void, never delete.
    const shortId = orderId.slice(-6).toUpperCase();
    await tx.paymentRecord.updateMany({
      where: {
        paymentType: PAYMENTS.TYPES.BOOK_ORDER,
        userId: order.userId,
        voidedAt: null,
        OR: [{ bookOrderId: orderId }, { bookOrderId: null, description: `Book order #${shortId}` }],
      },
      data: { voidedAt: new Date(), voidReason: normalizedReason, voidedById: session.user.id },
    });

    await tx.bookOrder.update({
      where: { id: orderId },
      data: { deletedAt: new Date() },
    });

    await recordAudit(tx, session, {
      action: "soft_delete",
      entity: "BookOrder",
      entityId: orderId,
      reason: normalizedReason,
      before: { status: order.status, totalAmountInrPaise: order.totalAmountInrPaise, userId: order.userId },
    });
  }), "Database operation failed");

  revalidateOrderPaths(order.userId);
}
