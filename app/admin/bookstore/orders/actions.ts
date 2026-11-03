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
      include: { user: { select: { id: true, email: true, name: true } } },
    }), "Database operation failed");

  if (!order) return { error: "Order not found." };

  if (order.status === "APPROVED") {
    redirect(orderReturnUrl(returnTo, "confirmed"));
  }

  if (order.status !== "PENDING_VERIFICATION") {
    return { error: "Only pending orders can be approved." };
  }

  await withDbErrorHandling(() => prisma.$transaction(async (tx) => {
    await tx.bookOrder.update({
      where: { id: orderId },
      data: { status: "APPROVED" },
    });

    // Create a payment record for finance tracking
    await tx.paymentRecord.create({
      data: {
        userId: order.userId,
        amountInrPaise: order.totalAmountInrPaise,
        paidAt: new Date(),
        paymentType: "book_purchase",
        description: `Book order #${orderId.slice(-6).toUpperCase()}`,
      },
    });
  }), "Database operation failed");

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

  await withDbErrorHandling(() => prisma.bookOrder.update({
      where: { id: orderId },
      data: { status: "DECLINED" },
    }), "Database operation failed");

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

  const order = await withDbErrorHandling(() => prisma.bookOrder.findUnique({
      where: { id: orderId },
    }), "Database operation failed");

  if (!order) return { error: "Order not found." };

  if (order.status !== "APPROVED") {
    return { error: "Only approved orders can be marked as shipped." };
  }

  await withDbErrorHandling(() => prisma.bookOrder.update({
      where: { id: orderId },
      data: { 
        status: "SHIPPED",
        courierServiceName: courierServiceName.trim(),
        trackingId: trackingId.trim()
      },
    }), "Database operation failed");

  await notifyBookOrderShipped({
    userId: order.userId,
    orderId: order.id,
    courierServiceName: courierServiceName.trim(),
    trackingId: trackingId.trim()
  });

  revalidateOrderPaths(order.userId);
  redirect(orderReturnUrl(returnTo, "shipped"));
}

export async function markBookOrderRefunded(
  orderId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const order = await withDbErrorHandling(() => prisma.bookOrder.findUnique({
      where: { id: orderId },
    }), "Database operation failed");

  if (!order) return { error: "Order not found." };

  if (order.status !== "APPROVED") {
    return { error: "Only approved orders can be refunded." };
  }

  await withDbErrorHandling(() => prisma.bookOrder.update({
      where: { id: orderId },
      data: { status: "REFUNDED" },
    }), "Database operation failed");

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
    // Linked payment record (matched by description until the FK lands): void, never delete.
    const shortId = orderId.slice(-6).toUpperCase();
    await tx.paymentRecord.updateMany({
      where: {
        paymentType: "book_purchase",
        userId: order.userId,
        description: `Book order #${shortId}`,
        voidedAt: null,
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
