import { NextRequest } from "next/server";
import { confirmMonthlyPayment } from "@/app/admin/payments/actions";
import { ADMIN_ROLES, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** Approves a pending fee submission: records the payment and notifies the student. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/payments/[id]/approve", () => confirmMonthlyPayment(id));
}
