"use server";

import { adminReturnUrl } from "@/utils/admin-redirects";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/services/auth-actions";
import {
  approveFeePayment,
  declineFeePayment,
  revalidatePaymentPaths,
  voidFeePayment,
  voidManualPayment,
} from "@/services/payment-approval";

// Thin adapters: authorise the admin, run the service (services/payment-approval.ts),
// then revalidate and redirect, or return the error for the form to show.

export async function confirmMonthlyPayment(
  submissionId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const result = await approveFeePayment(submissionId);
  if (!result.ok) return { error: result.error };

  if (!result.alreadyApproved) revalidatePaymentPaths(result.userId, result.courseId);
  redirect(adminReturnUrl(returnTo, "/admin/payments", "confirmed"));
}

export async function declineMonthlyPayment(
  submissionId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const result = await declineFeePayment(submissionId);
  if (!result.ok) return { error: result.error };

  revalidatePaymentPaths(result.userId, result.courseId);
  redirect(adminReturnUrl(returnTo, "/admin/payments", "declined"));
}

/** Voids an approved fee payment (see voidFeePayment). */
export async function voidApprovedPayment(
  submissionId: string,
  reason: string | undefined,
  returnTo?: string,
): Promise<{ error?: string } | void> {
  const session = await requireAdmin();

  const result = await voidFeePayment(session, submissionId, reason);
  if (!result.ok) return { error: result.error };

  revalidatePaymentPaths(result.userId, result.courseId);
  redirect(adminReturnUrl(returnTo, "/admin/payments", "deleted"));
}

/** Voids a manually recorded payment (see voidManualPayment). */
export async function voidManualPaymentRecord(
  recordId: string,
  reason: string | undefined,
  returnTo?: string,
): Promise<{ error?: string } | void> {
  const session = await requireAdmin();

  const result = await voidManualPayment(session, recordId, reason);
  if (!result.ok) return { error: result.error };

  revalidatePaymentPaths(result.userId);
  const param = new URLSearchParams({ type: "manual_transactions", deleted: "1" });
  redirect(returnTo?.startsWith("/admin") ? adminReturnUrl(returnTo, "/admin/payments", "deleted") : `/admin/payments?${param.toString()}`);
}
