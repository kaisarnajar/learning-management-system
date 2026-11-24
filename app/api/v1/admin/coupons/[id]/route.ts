import { NextRequest } from "next/server";
import { deleteCoupon, updateCoupon } from "@/app/admin/coupons/actions";
import { ADMIN_ROLES, readActionForm, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/**
 * Edits a coupon (EditCouponDialog): the create fields for a DEFAULT coupon;
 * only percentage, validFrom, validUntil and isActive for a SPECIAL one.
 * isActive is "true" when ticked (left out when not).
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/coupons/[id] PATCH", async () => updateCoupon(id, await readActionForm(request)));
}

/** Deletes an unused coupon; a used one is deactivated instead (`result.success` says which). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/coupons/[id] DELETE", () => deleteCoupon(id));
}
