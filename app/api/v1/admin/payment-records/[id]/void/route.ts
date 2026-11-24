import { NextRequest } from "next/server";
import { ADMIN_ROLES, readActionForm, staffServiceAction } from "@/services/api-staff";
import { revalidatePaymentPaths, voidManualPayment } from "@/services/payment-approval";
import { adminReturnUrl } from "@/utils/admin-redirects";

type Params = { params: Promise<{ id: string }> };

/** Voids a manually recorded payment. Body: `reason` (at least 3 characters, kept in the audit log). */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffServiceAction(
    request,
    ADMIN_ROLES,
    "api/v1/admin/payment-records/[id]/void",
    async (ctx) => {
      const form = await readActionForm(request);
      return voidManualPayment(ctx.session, id, (form.get("reason") as string | null) ?? undefined);
    },
    (result) => {
      revalidatePaymentPaths(result.userId);
      return { redirect: adminReturnUrl("/admin/completed-payments", "/admin/payments", "deleted") };
    },
  );
}
