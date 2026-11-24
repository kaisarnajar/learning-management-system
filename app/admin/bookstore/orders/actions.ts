"use server";

import { adminReturnUrl } from "@/utils/admin-redirects";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/services/auth-actions";
import {
  approveOrder,
  declineOrder,
  refundOrder,
  revalidateOrderPaths,
  shipOrder,
  voidOrder,
} from "@/services/book-order-transitions";

// Thin adapters: authorise the admin, run the state machine
// (services/book-order-transitions.ts), then revalidate and redirect, or
// return the error for the table to show.

export async function approveBookOrder(
  orderId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const result = await approveOrder(orderId);
  if (!result.ok) return { error: result.error };

  if (!result.alreadyApproved) revalidateOrderPaths(result.userId);
  redirect(adminReturnUrl(returnTo, "/admin/bookstore/orders", "confirmed"));
}

export async function declineBookOrder(
  orderId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const result = await declineOrder(orderId);
  if (!result.ok) return { error: result.error };

  revalidateOrderPaths(result.userId);
  redirect(adminReturnUrl(returnTo, "/admin/bookstore/orders", "declined"));
}

export async function markBookOrderShipped(
  orderId: string,
  courierServiceName: string,
  trackingId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const result = await shipOrder(orderId, courierServiceName, trackingId);
  if (!result.ok) return { error: result.error };

  revalidateOrderPaths(result.userId);
  redirect(adminReturnUrl(returnTo, "/admin/bookstore/orders", "shipped"));
}

/** Refunds an approved or shipped order (see refundOrder). */
export async function markBookOrderRefunded(
  orderId: string,
  returnTo?: string,
  booksReturned = false,
): Promise<{ error?: string }> {
  const session = await requireAdmin();

  const result = await refundOrder(session, orderId, booksReturned);
  if (!result.ok) return { error: result.error };

  revalidateOrderPaths(result.userId);
  redirect(adminReturnUrl(returnTo, "/admin/bookstore/orders", "refunded"));
}

/** Voids a declined or refunded order (see voidOrder). */
export async function voidBookOrder(
  orderId: string,
  reason?: string,
): Promise<{ error?: string } | void> {
  const session = await requireAdmin();

  const result = await voidOrder(session, orderId, reason);
  if (!result.ok) return { error: result.error };

  revalidateOrderPaths(result.userId);
}
