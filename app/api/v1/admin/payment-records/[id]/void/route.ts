import { NextRequest } from "next/server";
import { voidManualPaymentRecord } from "@/app/admin/payments/actions";
import { ADMIN_ROLES, readActionForm, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** Voids a manually recorded payment. Body: `reason` (at least 3 characters, kept in the audit log). */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/payment-records/[id]/void", async () => {
    const form = await readActionForm(request);
    return voidManualPaymentRecord(id, (form.get("reason") as string | null) ?? undefined, "/admin/completed-payments");
  });
}
