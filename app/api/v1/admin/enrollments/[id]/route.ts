import { NextRequest } from "next/server";
import { removeEnrollmentFromCourse } from "@/app/admin/enrollments/actions";
import { ADMIN_ROLES, staffAction } from "@/services/api-staff";
import { apiError } from "@/utils/api-response";

type Params = { params: Promise<{ id: string }> };

/** Removes a student from one course (`?courseId=`); the account stays. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const courseId = request.nextUrl.searchParams.get("courseId");
  if (!courseId) return apiError("courseId is required.", 400);
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/enrollments/[id] DELETE", () => removeEnrollmentFromCourse(id, courseId));
}
