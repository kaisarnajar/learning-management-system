import { NextRequest } from "next/server";
import { voidApprovedPayment } from "@/app/admin/payments/actions";
import { ADMIN_ROLES, readActionForm, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** Voids an approved fee payment. Body: `reason` (at least 3 characters, kept in the audit log). */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/payments/[id]/void", async () => {
    const form = await readActionForm(request);
    return voidApprovedPayment(id, (form.get("reason") as string | null) ?? undefined);
  });
}
