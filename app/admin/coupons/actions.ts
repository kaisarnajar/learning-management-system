"use server";

import { requireAdmin } from "@/services/auth-actions";
import {
  approveWaiverRequest,
  couponInputFromForm,
  couponRemovedMessage,
  createCoupon,
  editCoupon,
  rejectWaiverRequest,
  removeCoupon,
  removeWaiverRequest,
  revalidateCouponPaths,
  revalidateWaiverDeletionPaths,
  WAIVER_REQUEST_DELETED_MESSAGE,
} from "@/services/coupon-admin-actions";

// Thin adapters: authorise the admin, run the service (services/coupon-admin-actions.ts),
// revalidate, and answer in the shape the dialogs expect.

export async function createDefaultCoupon(formData: FormData) {
  await requireAdmin();

  const result = await createCoupon(couponInputFromForm(formData));
  if (!result.ok) return { error: result.error };

  revalidateCouponPaths();
  return { success: true };
}

export async function updateCoupon(couponId: string, formData: FormData) {
  await requireAdmin();

  const result = await editCoupon(couponId, couponInputFromForm(formData));
  if (!result.ok) return { error: result.error };

  revalidateCouponPaths();
  return { success: true };
}

/** Deletes an unused coupon; a used one is deactivated instead (see removeCoupon). */
export async function deleteCoupon(couponId: string) {
  const session = await requireAdmin();

  const result = await removeCoupon(session, couponId);
  if (!result.ok) return { error: result.error };

  revalidateCouponPaths();
  return { success: couponRemovedMessage(result.deactivated) };
}

export async function approveCouponRequest(requestId: string, rawPercentage: number, rawValidUntil: string) {
  await requireAdmin();

  const result = await approveWaiverRequest(requestId, rawPercentage, rawValidUntil);
  if (!result.ok) return { error: result.error };

  revalidateCouponPaths();
  return { success: true };
}

export async function rejectCouponRequest(requestId: string) {
  await requireAdmin();

  const result = await rejectWaiverRequest(requestId);
  if (!result.ok) return { error: result.error };

  revalidateCouponPaths();
  return { success: true };
}

/** Deletes a waiver request and its unused coupons (see removeWaiverRequest). */
export async function deleteCouponRequest(requestId: string) {
  const session = await requireAdmin();

  const result = await removeWaiverRequest(session, requestId);
  if (!result.ok) return { error: result.error };

  revalidateWaiverDeletionPaths();
  return { success: WAIVER_REQUEST_DELETED_MESSAGE };
}
