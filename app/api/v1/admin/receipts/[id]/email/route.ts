import { NextRequest } from "next/server";
import { sendReceiptToEmailAction } from "@/app/actions/receipts";
import { ADMIN_ROLES, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** E-mails the generated receipt PDF to the student. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/receipts/[id]/email", () => sendReceiptToEmailAction(id));
}
