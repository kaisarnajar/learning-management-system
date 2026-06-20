"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import {
  notifyBookOrderApproved,
  notifyBookOrderDeclined,
  notifyBookOrderShipped,
  notifyBookOrderRefunded,
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

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
}

export async function approveBookOrder(
  orderId: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const order = await withDbErrorHandling(() => prisma.bookOrder.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, email: true, name: true } } },
    }), "Database operation failed");

  if (!order) return { error: "Order not found." };

  if (order.status === "APPROVED") {
    redirect("/admin/bookstore/orders?confirmed=1");
  }

  if (order.status !== "PENDING_VERIFICATION") {
    return { error: "Only pending orders can be approved." };
  }

  await withDbErrorHandling(() => prisma.bookOrder.update({
      where: { id: orderId },
      data: { status: "APPROVED" },
    }), "Database operation failed");

  // Create a payment record for finance tracking
  await withDbErrorHandling(() => prisma.paymentRecord.create({
      data: {
        userId: order.userId,
        amountInrPaise: order.totalAmountInrPaise,
        paidAt: new Date(),
        paymentType: "book_purchase",
        description: `Book order #${orderId.slice(-6).toUpperCase()}`,
      },
    }), "Database operation failed");

  await notifyBookOrderApproved({
    userId: order.userId,
    orderId: order.id,
    totalAmountInrPaise: order.totalAmountInrPaise,
  });

  revalidateOrderPaths(order.userId);
  redirect("/admin/bookstore/orders?confirmed=1");
}

export async function declineBookOrder(
  orderId: string,
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
  redirect("/admin/bookstore/orders?declined=1");
}

export async function markBookOrderShipped(
  orderId: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const order = await withDbErrorHandling(() => prisma.bookOrder.findUnique({
      where: { id: orderId },
    }), "Database operation failed");

  if (!order) return { error: "Order not found." };

  if (order.status !== "APPROVED") {
    return { error: "Only approved orders can be marked as shipped." };
  }

  await withDbErrorHandling(() => prisma.bookOrder.update({
      where: { id: orderId },
      data: { status: "SHIPPED" },
    }), "Database operation failed");

  await notifyBookOrderShipped({
    userId: order.userId,
    orderId: order.id,
  });

  revalidateOrderPaths(order.userId);
  redirect("/admin/bookstore/orders?shipped=1");
}

export async function markBookOrderRefunded(
  orderId: string,
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
  redirect("/admin/bookstore/orders?refunded=1");
}

export async function deleteBookOrder(
  orderId: string,
): Promise<{ error?: string } | void> {
  await requireAdmin();

  const order = await withDbErrorHandling(() => prisma.bookOrder.findUnique({
      where: { id: orderId },
    }), "Database operation failed");

  if (!order) return { error: "Order not found." };

  if (order.status === "APPROVED" || order.status === "PENDING_VERIFICATION") {
    return { error: "Only completed orders can be deleted." };
  }

  await withDbErrorHandling(() => prisma.bookOrder.delete({
      where: { id: orderId },
    }), "Database operation failed");

  revalidateOrderPaths(order.userId);
}
