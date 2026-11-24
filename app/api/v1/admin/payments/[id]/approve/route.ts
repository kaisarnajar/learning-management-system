import { NextRequest } from "next/server";
import { ADMIN_ROLES, staffServiceAction } from "@/services/api-staff";
import { approveFeePayment, revalidatePaymentPaths } from "@/services/payment-approval";
import { adminReturnUrl } from "@/utils/admin-redirects";

type Params = { params: Promise<{ id: string }> };

/** Approves a pending fee submission: records the payment and notifies the student. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffServiceAction(request, ADMIN_ROLES, "api/v1/admin/payments/[id]/approve", () => approveFeePayment(id), (result) => {
    if (!result.alreadyApproved) revalidatePaymentPaths(result.userId, result.courseId);
    return { redirect: adminReturnUrl(undefined, "/admin/payments", "confirmed") };
  });
}
