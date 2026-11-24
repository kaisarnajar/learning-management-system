import type { CourseStatus, PrismaClient } from "@prisma/client";
import { ENROLLMENT_STATUS } from "@/config/constants/business";
import { getRosterEnrollmentStatusForCourse } from "@/services/enrollment-status";
import { enrollmentStatusData } from "@/services/status-compat";
import { withDbErrorHandling } from "@/utils/db-error";

/**
 * Keeps roster enrollments aligned with the course's status, on the client
 * given. services/completion.ts runs it on the app's client; the demo seed
 * runs it on its own (scripts never import utils/prisma, which is
 * server-only).
 */
export async function syncEnrollmentsWithCourseStatusIn(
  db: Pick<PrismaClient, "enrollment">,
  courseId: string,
  courseStatus: CourseStatus,
): Promise<void> {
  const rosterStatus = getRosterEnrollmentStatusForCourse(courseStatus);

  if (rosterStatus === "COMPLETED") {
    await withDbErrorHandling(() => db.enrollment.updateMany({
          where: { courseId, status: ENROLLMENT_STATUS.ACTIVE },
          data: { ...enrollmentStatusData("COMPLETED"), completedAt: new Date() },
        }), "Database operation failed");
    return;
  }

  // Reopening a course: a student who already holds a certificate finished it
  // and stays completed; only the uncertified go back to active.
  await withDbErrorHandling(() => db.enrollment.updateMany({
      where: { courseId, status: ENROLLMENT_STATUS.COMPLETED, certificateGeneratedAt: null },
      data: { ...enrollmentStatusData("ACTIVE"), completedAt: null },
    }), "Database operation failed");
}
