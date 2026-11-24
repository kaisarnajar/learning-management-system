import { NextRequest } from "next/server";
import { ADMIN_ROLES, staffServiceAction } from "@/services/api-staff";
import { declineFeePayment, revalidatePaymentPaths } from "@/services/payment-approval";
import { adminReturnUrl } from "@/utils/admin-redirects";

type Params = { params: Promise<{ id: string }> };

/** Declines a pending fee submission; the student is e-mailed and can resubmit. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffServiceAction(request, ADMIN_ROLES, "api/v1/admin/payments/[id]/decline", () => declineFeePayment(id), (result) => {
    revalidatePaymentPaths(result.userId, result.courseId);
    return { redirect: adminReturnUrl(undefined, "/admin/payments", "declined") };
  });
}
