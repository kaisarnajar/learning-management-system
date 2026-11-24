import { NextRequest } from "next/server";
import { previewStudentAccountForEnrollment } from "@/app/admin/enrollments/actions";
import { ADMIN_ROLES, staffRead } from "@/services/api-staff";

/** The enrol form's account check: `?email=` → `{ lookup: { ok: true, userId, name, email } | { ok: false, error } }`. */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/enrollments/lookup", async () => {
    const lookup = await previewStudentAccountForEnrollment(request.nextUrl.searchParams.get("email") ?? "");
    return { lookup };
  });
}
