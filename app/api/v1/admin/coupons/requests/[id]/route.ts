import { NextRequest } from "next/server";
import { ADMIN_ROLES, staffServiceAction } from "@/services/api-staff";
import {
  removeWaiverRequest,
  revalidateWaiverDeletionPaths,
  WAIVER_REQUEST_DELETED_MESSAGE,
} from "@/services/coupon-admin-actions";

type Params = { params: Promise<{ id: string }> };

/** Deletes a waiver request (refused once its coupon has been used). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffServiceAction(
    request,
    ADMIN_ROLES,
    "api/v1/admin/coupons/requests/[id] DELETE",
    (ctx) => removeWaiverRequest(ctx.session, id),
    () => {
      revalidateWaiverDeletionPaths();
      return { result: { success: WAIVER_REQUEST_DELETED_MESSAGE } };
    },
  );
}
