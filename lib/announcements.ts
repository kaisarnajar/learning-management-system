import type { AnnouncementCategory, CourseAnnouncement, Prisma } from "@prisma/client";
import { clampPage, paginationArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { andWhere, buildSearchOr } from "@/lib/text-search";
import { withDbErrorHandling } from "@/lib/db-error";

function courseAnnouncementWhere(
  courseId: string,
  searchQuery?: string,
) {
  const base = { courseId, enrollmentId: null };
  if (!searchQuery) return base;
  return andWhere(
    base,
    buildSearchOr(["title", "body", "authorName"], [], searchQuery),
  );
}

export const ANNOUNCEMENT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function isAnnouncementAttachmentTooLarge(fileSizeBytes: number): boolean {
  return fileSizeBytes > ANNOUNCEMENT_MAX_UPLOAD_BYTES;
}

export const ANNOUNCEMENT_CATEGORIES: AnnouncementCategory[] = [
  "EXAMS_TESTS",
  "ASSIGNMENTS_HOMEWORK",
  "STUDY_MATERIALS",
  "CLASS_SCHEDULE",
  "COURSE_ANNOUNCEMENT",
  "GENERAL_NOTICE",
];

export const announcementCategoryLabels: Record<AnnouncementCategory, string> = {
  EXAMS_TESTS: "Exams & Tests",
  ASSIGNMENTS_HOMEWORK: "Assignments & Homework",
  STUDY_MATERIALS: "Study Materials",
  CLASS_SCHEDULE: "Class Schedule",
  COURSE_ANNOUNCEMENT: "Course Announcements",
  GENERAL_NOTICE: "General Notices",
};

export const announcementCategoryStyles: Record<AnnouncementCategory, string> = {
  EXAMS_TESTS: "bg-red-100 text-red-900",
  ASSIGNMENTS_HOMEWORK: "bg-orange-100 text-orange-900",
  STUDY_MATERIALS: "bg-blue-100 text-blue-900",
  CLASS_SCHEDULE: "bg-info-bg text-info-text",
  COURSE_ANNOUNCEMENT: "bg-teal/15 text-teal-dark",
  GENERAL_NOTICE: "bg-surface-muted-hover text-muted",
};

const announcementInclude = {
  teacher: { select: { name: true } },
  enrollment: {
    select: {
      user: { select: { name: true, email: true } },
    },
  },
} satisfies Prisma.CourseAnnouncementInclude;

export function formatAnnouncementDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getAnnouncementAuthorName(announcement: {
  authorName: string;
  teacher: { name: string } | null;
}): string {
  return announcement.authorName.trim() || announcement.teacher?.name || "Academy";
}

export async function getCourseWideAnnouncementsForCoursePaginated(
  courseId: string,
  page: number,
  pageSize: number,
  searchQuery?: string,
) {
  const where = courseAnnouncementWhere(courseId, searchQuery);
  const totalCount = await withDbErrorHandling(() => prisma.courseAnnouncement.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.courseAnnouncement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: announcementInclude,
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getStudentAnnouncementsForEnrollmentPaginated(
  enrollmentId: string,
  page: number,
  pageSize: number,
) {
  const where = { enrollmentId };
  const totalCount = await withDbErrorHandling(() => prisma.courseAnnouncement.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.courseAnnouncement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: announcementInclude,
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getAnnouncementsVisibleToStudentPaginated(
  userId: string,
  courseId: string,
  personalPage: number,
  courseWidePage: number,
  pageSize: number,
) {
  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true },
    }), "Database operation failed");
  if (!enrollment) {
    return {
      courseWide: [],
      personal: [] as Awaited<
        ReturnType<typeof getStudentAnnouncementsForEnrollmentPaginated>
      >["items"],
      courseWideTotal: 0,
      personalTotal: 0,
    };
  }

  const [personalPaginated, courseWidePaginated] = await Promise.all([
    getStudentAnnouncementsForEnrollmentPaginated(enrollment.id, personalPage, pageSize),
    getCourseWideAnnouncementsForCoursePaginated(courseId, courseWidePage, pageSize),
  ]);

  return {
    personal: personalPaginated.items,
    personalTotal: personalPaginated.totalCount,
    courseWide: courseWidePaginated.items,
    courseWideTotal: courseWidePaginated.totalCount,
  };
}

export async function getAnnouncementForCourse(
  courseId: string,
  announcementId: string,
  options?: { enrollmentId?: string | null },
) {
  return withDbErrorHandling(() => prisma.courseAnnouncement.findFirst({
      where: {
        id: announcementId,
        courseId,
        ...(options?.enrollmentId !== undefined ? { enrollmentId: options.enrollmentId } : {}),
      },
      include: announcementInclude,
    }), "Database operation failed");
}

export function canTeacherManageCourseAnnouncement(
  announcement: Pick<CourseAnnouncement, "teacherId" | "postedByAdmin">,
  teacherId: string,
): boolean {
  return !announcement.postedByAdmin && announcement.teacherId === teacherId;
}
