import { NextRequest } from "next/server";
import { declineMonthlyPayment } from "@/app/admin/payments/actions";
import { ADMIN_ROLES, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** Declines a pending fee submission; the student is e-mailed and can resubmit. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/payments/[id]/decline", () => declineMonthlyPayment(id));
}
