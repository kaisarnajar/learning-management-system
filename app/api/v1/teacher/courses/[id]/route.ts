import { NextRequest } from "next/server";
import { courseHeader, requireManagedCourse } from "@/services/api-course-tools";
import { TEACHER_ROLES, staffRead } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** One of the teacher's courses: the header the course pages show (404 for a course that is not theirs). */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, TEACHER_ROLES, "api/v1/teacher/courses/[id]", async (ctx) => ({
    course: courseHeader(await requireManagedCourse(ctx, id)),
  }));
}
