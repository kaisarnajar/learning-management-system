import { NextRequest } from "next/server";
import { ADMIN_ROLES, staffListParams, staffRead } from "@/services/api-staff";
import { getEnrollmentsAwaitingCertificatePaginated } from "@/services/certificates-admin";

/**
 * The /admin/certificates/new choices: active or completed enrollments without
 * a certificate, with student and course, one page at a time (`courseId`
 * narrows to one course, `q` searches the student's name or e-mail).
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/certificates/eligible", async () => {
    const { page, pageSize, q, params } = staffListParams(request, 50);
    const courseId = params.get("courseId")?.trim() || undefined;
    const { items, totalCount } = await getEnrollmentsAwaitingCertificatePaginated(page, pageSize, { courseId, searchQuery: q || undefined });
    // `enrollments` keeps the key earlier app versions read.
    return { enrollments: items, totalCount, page, pageSize };
  });
}
