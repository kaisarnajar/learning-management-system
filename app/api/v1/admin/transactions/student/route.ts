import { NextRequest } from "next/server";
import { previewStudentAccountForEnrollment } from "@/app/admin/enrollments/actions";
import { ADMIN_ROLES, staffRead } from "@/services/api-staff";
import { apiError } from "@/utils/api-response";

/** The account behind `email`, as the record-payment form looks it up: `{ student: { userId, name } }` or 404 with the reason. */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/transactions/student", async () => {
    const email = request.nextUrl.searchParams.get("email") ?? "";
    const result = await previewStudentAccountForEnrollment(email);
    if (!result.ok) return apiError(result.error, 404);
    return { student: { userId: result.userId, name: result.name } };
  });
}
