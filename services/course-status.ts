import type { CourseStatus } from "@prisma/client";

export const COURSE_STATUS_OPTIONS: {
  value: CourseStatus;
  label: string;
  description: string;
}[] = [
  { value: "DRAFT", label: "Draft", description: "Hidden from the public site" },
  { value: "PUBLISHED", label: "Published", description: "Listed and open for enrollment" },
  { value: "ONGOING", label: "Ongoing", description: "Course in progress; enrollment open" },
  { value: "ON_HOLD", label: "On hold", description: "Hidden from the public site; enrollments paused" },
  { value: "COMPLETED", label: "Completed", description: "Hidden from the public site; course finished" },
  { value: "COMING_SOON", label: "Coming soon", description: "Listed; enrollments not started yet" },
];

export function courseStatusLabel(status: CourseStatus): string {
  return COURSE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function courseStatusBadgeClass(status: CourseStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-surface-muted-hover text-muted";
    case "PUBLISHED":
      return "bg-info-bg text-info-text";
    case "ONGOING":
      return "bg-success-bg text-success-text";
    case "COMPLETED":
      return "bg-surface-muted-hover text-foreground";
    case "ON_HOLD":
      return "bg-warning-bg text-warning-text";
    case "COMING_SOON":
      return "bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 ring-1 ring-violet-200/80 dark:ring-violet-800/30";
    default:
      return "bg-surface-muted-hover text-muted";
  }
}

/**
 * Statuses listed on the public site (course list, homepage, teacher pages,
 * sitemap, public API). DRAFT, ON_HOLD and COMPLETED courses are hidden;
 * students already enrolled in one can still open its page.
 */
export const PUBLIC_COURSE_STATUSES = ["PUBLISHED", "ONGOING", "COMING_SOON"] as const satisfies readonly CourseStatus[];

export function isCoursePubliclyVisible(status: CourseStatus): boolean {
  return (PUBLIC_COURSE_STATUSES as readonly CourseStatus[]).includes(status);
}

export function isCourseEnrollmentOpen(status: CourseStatus): boolean {
  return status === "PUBLISHED" || status === "ONGOING";
}

export function getCourseEnrollmentClosedMessage(status: CourseStatus): string | null {
  if (isCourseEnrollmentOpen(status)) return null;
  switch (status) {
    case "DRAFT":
      return "This course is not available.";
    case "ON_HOLD":
      return "Enrollment is temporarily on hold for this course.";
    case "COMPLETED":
      return "This course has completed. New enrollments are closed.";
    case "COMING_SOON":
      return "Enrollment has not started yet. Coming soon!";
    default:
      return "Enrollment is not available for this course.";
  }
}
