import { NextRequest } from "next/server";
import { approveCouponRequest } from "@/app/admin/coupons/actions";
import { ADMIN_ROLES, readActionForm, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** Approves a waiver request and creates the student's coupon. Fields: percentage (1–100), validUntil (YYYY-MM-DD). */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/coupons/requests/[id]/approve", async () => {
    const form = await readActionForm(request);
    return approveCouponRequest(id, Number(form.get("percentage")), String(form.get("validUntil") ?? ""));
  });
}
