import { NextRequest } from "next/server";
import { ADMIN_ROLES, readActionForm, staffServiceAction } from "@/services/api-staff";
import { approveWaiverRequest, revalidateCouponPaths } from "@/services/coupon-admin-actions";

type Params = { params: Promise<{ id: string }> };

/** Approves a waiver request and creates the student's coupon. Fields: percentage (1–100), validUntil (YYYY-MM-DD). */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffServiceAction(
    request,
    ADMIN_ROLES,
    "api/v1/admin/coupons/requests/[id]/approve",
    async () => {
      const form = await readActionForm(request);
      return approveWaiverRequest(id, Number(form.get("percentage")), String(form.get("validUntil") ?? ""));
    },
    () => {
      revalidateCouponPaths();
      return { result: { success: true } };
    },
  );
}
