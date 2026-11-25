import { NextRequest } from "next/server";
import { ADMIN_ROLES, readActionForm, staffServiceAction } from "@/services/api-staff";
import {
  couponInputFromForm,
  couponRemovedMessage,
  editCoupon,
  removeCoupon,
  revalidateCouponPaths,
} from "@/services/coupon-admin-actions";

type Params = { params: Promise<{ id: string }> };

/**
 * Edits a coupon (EditCouponDialog): the create fields for a DEFAULT coupon;
 * only percentage, validFrom, validUntil and isActive for a SPECIAL one.
 * isActive is "true" when ticked (left out when not).
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffServiceAction(
    request,
    ADMIN_ROLES,
    "api/v1/admin/coupons/[id] PATCH",
    async () => editCoupon(id, couponInputFromForm(await readActionForm(request))),
    () => {
      revalidateCouponPaths();
      return { result: { success: true } };
    },
  );
}

/** Deletes an unused coupon; a used one is deactivated instead (`result.success` says which). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffServiceAction(
    request,
    ADMIN_ROLES,
    "api/v1/admin/coupons/[id] DELETE",
    (ctx) => removeCoupon(ctx.session, id),
    (result) => {
      revalidateCouponPaths();
      return { result: { success: couponRemovedMessage(result.deactivated) } };
    },
  );
}
