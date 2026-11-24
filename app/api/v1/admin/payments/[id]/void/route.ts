import { NextRequest } from "next/server";
import { ADMIN_ROLES, readActionForm, staffServiceAction } from "@/services/api-staff";
import { revalidatePaymentPaths, voidFeePayment } from "@/services/payment-approval";
import { adminReturnUrl } from "@/utils/admin-redirects";

type Params = { params: Promise<{ id: string }> };

/** Voids an approved fee payment. Body: `reason` (at least 3 characters, kept in the audit log). */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffServiceAction(
    request,
    ADMIN_ROLES,
    "api/v1/admin/payments/[id]/void",
    async (ctx) => {
      const form = await readActionForm(request);
      return voidFeePayment(ctx.session, id, (form.get("reason") as string | null) ?? undefined);
    },
    (result) => {
      revalidatePaymentPaths(result.userId, result.courseId);
      return { redirect: adminReturnUrl(undefined, "/admin/payments", "deleted") };
    },
  );
}
