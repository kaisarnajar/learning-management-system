import type { CourseStatus } from "@prisma/client";
import { courseStatusBadgeClass, courseStatusLabel } from "@/services/course-status";

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${courseStatusBadgeClass(status)}`}
    >
      {courseStatusLabel(status)}
    </span>
  );
}
