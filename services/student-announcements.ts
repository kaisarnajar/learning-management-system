import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { hasCourseContentAccess } from "@/services/enrollment-status";

export async function getStudentCourseForAnnouncements(userId: string, courseId: string) {
  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    }), "Database operation failed");

  // Only approved (active or completed) enrollments see course announcements;
  // pending, awaiting-fee and rejected requests are denied.
  if (!enrollment || !hasCourseContentAccess(enrollment.status)) return null;

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
