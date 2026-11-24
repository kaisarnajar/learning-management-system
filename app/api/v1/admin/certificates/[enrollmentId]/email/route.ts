import { NextRequest } from "next/server";
import { sendCertificateToEmailAction } from "@/app/actions/certificates";
import { ADMIN_ROLES, staffAction } from "@/services/api-staff";

// Sending may render the PDF first.
export const maxDuration = 60;

type Params = { params: Promise<{ enrollmentId: string }> };

/** "Send via Email": e-mails the certificate PDF to the student. */
export async function POST(request: NextRequest, { params }: Params) {
  const { enrollmentId } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/certificates/[enrollmentId]/email", () =>
    sendCertificateToEmailAction(enrollmentId),
  );
}
