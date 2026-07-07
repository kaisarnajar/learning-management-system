import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { PENDING_ENROLLMENT_APPROVAL } from "@/services/enrollment-status";

export async function getStudentCourseForAnnouncements(userId: string, courseId: string) {
  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    }), "Database operation failed");

  // No enrollment at all, or enrollment is still pending admin approval — deny access.
  if (!enrollment || enrollment.status === PENDING_ENROLLMENT_APPROVAL) return null;

  const course = await withDbErrorHandling(() => prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        teacher: { select: { name: true } },
      },
    }), "Database operation failed");
  if (!course) return null;

  return { enrollment, course };
}
