import { unstable_noStore as noStore } from "next/cache";
import type { CourseStatus, Enrollment, EnrollmentStatus, Prisma } from "@prisma/client";
import { ENROLLMENT_STATUS } from "@/config/constants/business";
import { ENROLLMENT_STATUS_TEXT, enrollmentStatusData, enrollmentStatusOf } from "@/services/status-compat";
import {
  AWAITING_ENROLLMENT_FEE,
  PENDING_ENROLLMENT_APPROVAL,
  REJECTED_ENROLLMENT,
} from "@/services/enrollment-status";
import { getCourseIdsByTitleSearch } from "@/services/courses";
import { type PaginatedResult } from "@/utils/pagination";
import { paginateQuery } from "@/utils/prisma-utils";
import { prisma } from "@/utils/prisma";
import { andWhere, buildSearchOr, type TextSearchWhere } from "@/utils/text-search";
import { withDbErrorHandling } from "@/utils/db-error";

async function enrollmentSearchWhere(searchQuery?: string): Promise<TextSearchWhere | undefined> {
  if (!searchQuery) return undefined;

  const courseIds = await getCourseIdsByTitleSearch(searchQuery);
  const userSearch = buildSearchOr(
    [],
    [{ relation: "user", fields: ["name", "email"] }],
    searchQuery,
  );
  const orClauses = [...(userSearch.OR as Record<string, unknown>[])];
  if (courseIds.length > 0) {
    orClauses.push({ courseId: { in: courseIds } });
  }
  return { OR: orClauses };
}

export type CourseEnrollmentWithUser = {
  id: string;
  status: string;
  rollNumber: number | null;
  completedAt: Date | null;
  certificateGeneratedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

/**
 * Creates a student's enrollment row for a course, or resets a previously
 * rejected one (same row, so the (userId, courseId) unique index holds and
 * the request history stays in one place).
 */
export async function startEnrollment(
  userId: string,
  courseId: string,
  status: Extract<EnrollmentStatus, "AWAITING_ENROLLMENT_FEE" | "PENDING_APPROVAL">,
) {
  return withDbErrorHandling(() => prisma.$transaction(async (tx) => {
    const existing = await tx.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true, status: true, statusEnum: true },
    });
    if (!existing) {
      return tx.enrollment.create({ data: { userId, courseId, ...enrollmentStatusData(status) } });
    }
    if (enrollmentStatusOf(existing) !== "REJECTED") {
      // Someone else (or a double click) already created it; leave it as is.
      return tx.enrollment.findUniqueOrThrow({ where: { id: existing.id } });
    }
    return tx.enrollment.update({
      where: { id: existing.id },
      data: { ...enrollmentStatusData(status), rejectedAt: null, rollNumber: null },
    });
  }), "Database operation failed");
}

export async function getUserCourseEnrollmentMap(userId: string) {
  const rows = await withDbErrorHandling(() => prisma.enrollment.findMany({ where: { userId } }), "Database operation failed");
  return new Map(rows.map((row) => [row.courseId, row]));
}

export async function getUserEnrollments(userId: string) {
  return withDbErrorHandling(() => prisma.enrollment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }), "Database operation failed");
}

export type UserEnrollmentWithCourse = Prisma.EnrollmentGetPayload<{
  include: { course: { include: { teacher: true } } };
}>;

/** A student's enrollments with the course (and its teacher) joined in. */
export async function getUserEnrollmentsPaginated(
  userId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<UserEnrollmentWithCourse>> {
  const where = { userId };
  return paginateQuery<Enrollment>(prisma.enrollment, {
    where,
    orderBy: { createdAt: "desc" },
    include: { course: { include: { teacher: true } } },
  }, page, pageSize) as unknown as Promise<PaginatedResult<UserEnrollmentWithCourse>>;
}

export function enrollmentStatusLabel(status: string) {
  if (status === PENDING_ENROLLMENT_APPROVAL) return "Awaiting approval";
  if (status === AWAITING_ENROLLMENT_FEE) return "Awaiting enrollment fee";
  if (status === ENROLLMENT_STATUS.COMPLETED) return "Completed";
  if (status === ENROLLMENT_STATUS.ACTIVE) return "Active";
  if (status === REJECTED_ENROLLMENT) return "Rejected";
  return status.replace(/_/g, " ");
}

export function enrollmentStatusClass(status: string) {
  if (status === ENROLLMENT_STATUS.COMPLETED) return "bg-success-bg text-success-text";
  if (status === ENROLLMENT_STATUS.ACTIVE) return "bg-info-bg text-info-text";
  if (status === PENDING_ENROLLMENT_APPROVAL) return "bg-warning-bg text-warning-text";
  if (status === AWAITING_ENROLLMENT_FEE) return "bg-warning-bg text-warning-text";
  if (status === REJECTED_ENROLLMENT) return "bg-destructive-bg text-destructive-text";
  return "bg-surface-muted-hover text-muted";
}

export async function getEnrollmentsForCoursePaginated(
  courseId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<CourseEnrollmentWithUser>> {
  noStore();
  const where = { courseId };
  return paginateQuery<CourseEnrollmentWithUser>(prisma.enrollment, {
    where,
    orderBy: { rollNumber: { sort: "asc", nulls: "last" } },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  }, page, pageSize);
}

/** Legacy text values of the statuses that grant access to course content and appear on teacher rosters (for where-clauses). */
export const APPROVED_ENROLLMENT_STATUSES = [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.COMPLETED] as const;

/**
 * Approved (active or completed) enrollments for a course. Pending applicants
 * and students still awaiting the enrollment fee are excluded.
 */
export async function getApprovedEnrollmentsForCoursePaginated(
  courseId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<CourseEnrollmentWithUser>> {
  noStore();
  const where = { courseId, status: { in: [...APPROVED_ENROLLMENT_STATUSES] } };
  return paginateQuery<CourseEnrollmentWithUser>(prisma.enrollment, {
    where,
    orderBy: { rollNumber: { sort: "asc", nulls: "last" } },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  }, page, pageSize);
}

/** Active roster for in-progress courses; completed roster when the course is completed. */
export function getRosterEnrollmentStatusForCourse(courseStatus: CourseStatus): Extract<EnrollmentStatus, "ACTIVE" | "COMPLETED"> {
  return courseStatus === "COMPLETED" ? "COMPLETED" : "ACTIVE";
}

export async function getCourseRosterEnrollmentsPaginated(
  courseId: string,
  courseStatus: CourseStatus,
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<CourseEnrollmentWithUser>> {
  noStore();
  const base = {
    courseId,
    status: ENROLLMENT_STATUS_TEXT[getRosterEnrollmentStatusForCourse(courseStatus)],
  };
  const searchWhere = searchQuery
    ? buildSearchOr([], [{ relation: "user", fields: ["name", "email"] }], searchQuery)
    : undefined;
  const where = andWhere(base, searchWhere);
  return paginateQuery<CourseEnrollmentWithUser>(prisma.enrollment, {
    where,
    orderBy: { rollNumber: { sort: "asc", nulls: "last" } },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  }, page, pageSize);
}

export async function getEnrollmentCountsByCourse(): Promise<Map<string, number>> {
  noStore();
  const courses = await withDbErrorHandling(() => prisma.course.findMany({
      select: { id: true, status: true },
    }), "Database operation failed");

  const [activeCounts, completedCounts] = await Promise.all([
    withDbErrorHandling(() => prisma.enrollment.groupBy({
            by: ["courseId"],
            where: { status: ENROLLMENT_STATUS.ACTIVE },
            _count: { _all: true },
          }), "Database operation failed"),
    withDbErrorHandling(() => prisma.enrollment.groupBy({
            by: ["courseId"],
            where: { status: ENROLLMENT_STATUS.COMPLETED },
            _count: { _all: true },
          }), "Database operation failed"),
  ]);

  const activeByCourse = new Map(activeCounts.map((row) => [row.courseId, row._count._all]));
  const completedByCourse = new Map(completedCounts.map((row) => [row.courseId, row._count._all]));

  return new Map(
    courses.map((course) => [
      course.id,
      getRosterEnrollmentStatusForCourse(course.status) === "COMPLETED"
        ? (completedByCourse.get(course.id) ?? 0)
        : (activeByCourse.get(course.id) ?? 0),
    ]),
  );
}

export type PendingEnrollmentWithUser = CourseEnrollmentWithUser & {
  courseId: string;
};

export async function getPendingFreeEnrollmentApprovalsPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<PendingEnrollmentWithUser>> {
  noStore();
  const base = { status: PENDING_ENROLLMENT_APPROVAL };
  const where = andWhere(base, await enrollmentSearchWhere(searchQuery));
  return paginateQuery<PendingEnrollmentWithUser>(prisma.enrollment, {
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  }, page, pageSize);
}

export async function getAwaitingEnrollmentFeeEnrollmentsPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<PendingEnrollmentWithUser>> {
  noStore();
  const base = { status: AWAITING_ENROLLMENT_FEE };
  const where = andWhere(base, await enrollmentSearchWhere(searchQuery));
  return paginateQuery<PendingEnrollmentWithUser>(prisma.enrollment, {
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  }, page, pageSize);
}

export async function getPendingEnrollmentApprovalCount(): Promise<number> {
  noStore();
  return withDbErrorHandling(() => prisma.enrollment.count({
      where: { status: PENDING_ENROLLMENT_APPROVAL },
    }), "Database operation failed");
}

export async function getAwaitingEnrollmentFeeCount(): Promise<number> {
  noStore();
  return withDbErrorHandling(() => prisma.enrollment.count({
      where: { status: AWAITING_ENROLLMENT_FEE },
    }), "Database operation failed");
}

