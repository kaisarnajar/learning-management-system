import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

export async function getStudentCourseForAnnouncements(userId: string, courseId: string) {
  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    }), "Database operation failed");
  if (!enrollment) return null;

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
