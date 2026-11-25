import { NextRequest } from "next/server";
import { ADMIN_ROLES, staffServiceAction } from "@/services/api-staff";
import { rejectWaiverRequest, revalidateCouponPaths } from "@/services/coupon-admin-actions";

type Params = { params: Promise<{ id: string }> };

/** Rejects a pending waiver request; the student is notified. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffServiceAction(request, ADMIN_ROLES, "api/v1/admin/coupons/requests/[id]/reject", () => rejectWaiverRequest(id), () => {
    revalidateCouponPaths();
    return { result: { success: true } };
  });
}
