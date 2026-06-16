"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import { notifyBookOrderApproved, notifyBookOrderDeclined } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

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

  const order = await prisma.bookOrder.findUnique({
    where: { id: orderId },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (!order) return { error: "Order not found." };

  if (order.status === "APPROVED") {
    redirect("/admin/bookstore/orders?confirmed=1");
  }

  if (order.status !== "PENDING_VERIFICATION") {
    return { error: "Only pending orders can be approved." };
  }

  await prisma.bookOrder.update({
    where: { id: orderId },
    data: { status: "APPROVED" },
  });

  // Create a payment record for finance tracking
  await prisma.paymentRecord.create({
    data: {
      userId: order.userId,
      amountInrPaise: order.totalAmountInrPaise,
      paidAt: new Date(),
      paymentType: "book_purchase",
      description: `Book order #${orderId.slice(-6).toUpperCase()}`,
    },
  });

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

  const order = await prisma.bookOrder.findUnique({
    where: { id: orderId },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (!order) return { error: "Order not found." };

  if (order.status !== "PENDING_VERIFICATION") {
    return { error: "Only pending orders can be declined." };
  }

  await prisma.bookOrder.update({
    where: { id: orderId },
    data: { status: "DECLINED" },
  });

  await notifyBookOrderDeclined({
    userId: order.userId,
    orderId: order.id,
  });

  revalidateOrderPaths(order.userId);
  redirect("/admin/bookstore/orders?declined=1");
}
