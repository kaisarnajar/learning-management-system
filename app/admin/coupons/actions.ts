"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/services/auth-actions";
import {
  approveWaiverRequest,
  createCoupon,
  editCoupon,
  rejectWaiverRequest,
  removeCoupon,
  removeWaiverRequest,
  type CouponInput,
} from "@/services/coupon-admin-actions";

// Thin adapters: authorise the admin, run the service (services/coupon-admin-actions.ts),
// revalidate, and answer in the shape the dialogs and the staff API expect.

function couponInput(formData: FormData): CouponInput {
  return {
    code: formData.get("code"),
    percentage: formData.get("percentage"),
    validFrom: formData.get("validFrom"),
    validUntil: formData.get("validUntil"),
    courseId: formData.get("courseId"),
    gender: formData.get("gender"),
    isActive: formData.get("isActive") === "true",
    applyTo: formData.get("applyTo"),
  };
}

export async function createDefaultCoupon(formData: FormData) {
  await requireAdmin();

  const result = await createCoupon(couponInput(formData));
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/coupons");
  return { success: true };
}

export async function updateCoupon(couponId: string, formData: FormData) {
  await requireAdmin();

  const result = await editCoupon(couponId, couponInput(formData));
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/coupons");
  return { success: true };
}

/** Deletes an unused coupon; a used one is deactivated instead (see removeCoupon). */
export async function deleteCoupon(couponId: string) {
  const session = await requireAdmin();

  const result = await removeCoupon(session, couponId);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/coupons");
  return {
    success: result.deactivated
      ? "This coupon has been used, so it was deactivated instead of deleted."
      : "Coupon deleted successfully.",
  };
}

export async function approveCouponRequest(requestId: string, rawPercentage: number, rawValidUntil: string) {
  await requireAdmin();

  const result = await approveWaiverRequest(requestId, rawPercentage, rawValidUntil);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/coupons");
  return { success: true };
}

export async function rejectCouponRequest(requestId: string) {
  await requireAdmin();

  const result = await rejectWaiverRequest(requestId);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/coupons");
  return { success: true };
}

/** Deletes a waiver request and its unused coupons (see removeWaiverRequest). */
export async function deleteCouponRequest(requestId: string) {
  const session = await requireAdmin();

  const result = await removeWaiverRequest(session, requestId);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/coupons");
  revalidatePath("/admin/coupons/finance");
  revalidatePath("/admin/finance");
  revalidatePath("/profile/waiver-requests");
  return { success: "Waiver request deleted." };
}
