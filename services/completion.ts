import type { CourseStatus } from "@prisma/client";
import { getRosterEnrollmentStatusForCourse } from "@/services/enrollments";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";

/** Keep roster enrollments aligned with course status from Edit Course. */
export async function syncEnrollmentsWithCourseStatus(
  courseId: string,
  courseStatus: CourseStatus,
): Promise<void> {
  const rosterStatus = getRosterEnrollmentStatusForCourse(courseStatus);

  if (rosterStatus === "completed") {
    await withDbErrorHandling(() => prisma.enrollment.updateMany({
          where: { courseId, status: "active" },
          data: { status: "completed", completedAt: new Date() },
        }), "Database operation failed");
    return;
  }

  await withDbErrorHandling(() => prisma.enrollment.updateMany({
      where: { courseId, status: "completed" },
      data: { status: "active", completedAt: null },
    }), "Database operation failed");
}
