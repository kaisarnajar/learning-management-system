import type { CourseStatus } from "@prisma/client";
import { syncEnrollmentsWithCourseStatusIn } from "@/services/completion-sync";
import { prisma } from "@/utils/prisma";

/** Keep roster enrollments aligned with course status from Edit Course. */
export async function syncEnrollmentsWithCourseStatus(
  courseId: string,
  courseStatus: CourseStatus,
): Promise<void> {
  return syncEnrollmentsWithCourseStatusIn(prisma, courseId, courseStatus);
}
