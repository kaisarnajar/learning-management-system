import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { courseHeader } from "@/services/api-course-tools";
import { TEACHER_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { enrollmentStatusLabel } from "@/services/enrollments";
import { formatRollNumber } from "@/services/roll-numbers";
import { getTeacherCourseStudentsPaginated } from "@/services/teacher-portal";

type Params = { params: Promise<{ id: string }> };

/** The students of one of the teacher's courses (approved enrollments), as on /teacher/courses/[id]. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, TEACHER_ROLES, "api/v1/teacher/courses/[id]/students", async (ctx) => {
    const { page, pageSize } = staffListParams(request);
    const data = await getTeacherCourseStudentsPaginated(ctx.teacherId!, id, page, pageSize);
    if (!data) notFound();
    return {
      ...pagedBody(
        data.enrollments.map((e) => ({
          enrollmentId: e.id,
          name: e.user.name,
          email: e.user.email,
          rollNumber: e.rollNumber,
          rollNumberLabel: formatRollNumber(e.rollNumber),
          status: e.status,
          statusLabel: enrollmentStatusLabel(e.status),
        })),
        data.totalCount,
        page,
        pageSize,
      ),
      course: courseHeader(data.course),
    };
  });
}
