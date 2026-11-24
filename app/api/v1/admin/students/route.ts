import { NextRequest } from "next/server";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { getStudentUsersPaginated } from "@/services/students";

/** Students, as on /admin/students. `sort`: regNo_asc (default), regNo_desc, name_asc, name_desc, date_asc, date_desc, email_asc, email_desc. */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/students", async () => {
    const { page, pageSize, q, params } = staffListParams(request);
    const sort = params.get("sort") || "regNo_asc";
    const { items, totalCount } = await getStudentUsersPaginated(page, pageSize, q || undefined, sort);
    return pagedBody(
      items.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        registrationNumber: s.registrationNumber,
        image: s.image,
        gender: s.gender,
        createdAt: s.createdAt,
      })),
      totalCount,
      page,
      pageSize,
    );
  });
}
