import { NextRequest } from "next/server";
import { rejectCouponRequest } from "@/app/admin/coupons/actions";
import { ADMIN_ROLES, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** Rejects a pending waiver request; the student is notified. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/coupons/requests/[id]/reject", () => rejectCouponRequest(id));
}
