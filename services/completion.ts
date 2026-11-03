import type { CourseStatus } from "@prisma/client";
import { ENROLLMENT_STATUS } from "@/config/constants/business";
import { getRosterEnrollmentStatusForCourse } from "@/services/enrollments";
import { enrollmentStatusData } from "@/services/status-compat";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";

/** Keep roster enrollments aligned with course status from Edit Course. */
export async function syncEnrollmentsWithCourseStatus(
  courseId: string,
  courseStatus: CourseStatus,
): Promise<void> {
  const rosterStatus = getRosterEnrollmentStatusForCourse(courseStatus);

  if (rosterStatus === "COMPLETED") {
    await withDbErrorHandling(() => prisma.enrollment.updateMany({
          where: { courseId, status: ENROLLMENT_STATUS.ACTIVE },
          data: { ...enrollmentStatusData("COMPLETED"), completedAt: new Date() },
        }), "Database operation failed");
    return;
  }

  await withDbErrorHandling(() => prisma.enrollment.updateMany({
      where: { courseId, status: ENROLLMENT_STATUS.COMPLETED },
      data: { ...enrollmentStatusData("ACTIVE"), completedAt: null },
    }), "Database operation failed");
}
