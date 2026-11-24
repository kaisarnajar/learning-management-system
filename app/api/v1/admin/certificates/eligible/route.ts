import { NextRequest } from "next/server";
import { ADMIN_ROLES, staffRead } from "@/services/api-staff";
import { getEnrollmentsAwaitingCertificate } from "@/services/certificates-admin";

/** The /admin/certificates/new choices: enrollments without a certificate, with student and course. */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/certificates/eligible", async () => ({
    enrollments: await getEnrollmentsAwaitingCertificate(),
  }));
}
