import { NextRequest } from "next/server";
import { rejectEnrollmentRequest } from "@/app/admin/enrollments/actions";
import { ADMIN_ROLES, readActionForm, staffAction } from "@/services/api-staff";
import { apiError } from "@/utils/api-response";

type Params = { params: Promise<{ id: string }> };

/** Rejects a pending enrollment (free request or paid awaiting fee; body: courseId); the student is notified. */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/enrollments/[id]/reject", async () => {
    const courseId = String((await readActionForm(request)).get("courseId") ?? "");
    if (!courseId) return apiError("courseId is required.", 400);
    return rejectEnrollmentRequest(id, courseId);
  });
}
