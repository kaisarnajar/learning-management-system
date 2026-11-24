import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { courseHeader } from "@/services/api-course-tools";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { getCourseById } from "@/services/courses";
import { getCourseRosterEnrollmentsPaginated } from "@/services/enrollments";
import { formatRollNumber } from "@/services/roll-numbers";

type Params = { params: Promise<{ id: string }> };

/**
 * The course roster, as on /admin/courses/[id]/students: active students (completed ones for a completed
 * course). `q` searches name and e-mail. Remove one with DELETE /admin/enrollments/[enrollmentId]?courseId=.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/courses/[id]/students", async () => {
    const course = await getCourseById(id);
    if (!course) notFound();
    const { page, pageSize, q } = staffListParams(request);
    const { items, totalCount } = await getCourseRosterEnrollmentsPaginated(course.id, course.status, page, pageSize, q || undefined);
    return {
      ...pagedBody(
        items.map((e) => ({
          enrollmentId: e.id,
          userId: e.user.id,
          name: e.user.name,
          email: e.user.email,
          rollNumber: e.rollNumber,
          rollNumberLabel: formatRollNumber(e.rollNumber),
        })),
        totalCount,
        page,
        pageSize,
      ),
      course: { ...courseHeader(course), teacherName: course.teacher?.name ?? null },
      rosterLabel: course.status === "COMPLETED" ? "completed students" : "active students",
    };
  });
}
