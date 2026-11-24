import { NextRequest } from "next/server";
import { sendIdCardToEmailAction } from "@/app/actions/id-card";
import { ADMIN_ROLES, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** E-mails the ID card PDF to the student. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/students/[id]/id-card/email", () => sendIdCardToEmailAction(id));
}
