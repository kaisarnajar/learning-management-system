import { NextRequest } from "next/server";
import { deleteCouponRequest } from "@/app/admin/coupons/actions";
import { ADMIN_ROLES, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** Deletes a waiver request (refused once its coupon has been used). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/coupons/requests/[id] DELETE", () => deleteCouponRequest(id));
}
