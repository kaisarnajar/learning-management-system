import { unstable_noStore as noStore } from "next/cache";
import type { CourseStatus } from "@prisma/client";
import {
  AWAITING_ENROLLMENT_FEE,
  PENDING_ENROLLMENT_APPROVAL,
} from "@/lib/enrollment-status";
import { getCourseIdsByTitleSearch } from "@/lib/courses";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { andWhere, buildSearchOr, type TextSearchWhere } from "@/lib/text-search";
import { withDbErrorHandling } from "@/lib/db-error";

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
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

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

export async function getUserEnrollmentsPaginated(
  userId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<Awaited<ReturnType<typeof getUserEnrollments>>[number]>> {
  const where = { userId };
  const totalCount = await withDbErrorHandling(() => prisma.enrollment.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.enrollment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export function enrollmentStatusLabel(status: string) {
  if (status === PENDING_ENROLLMENT_APPROVAL) return "Awaiting approval";
  if (status === AWAITING_ENROLLMENT_FEE) return "Awaiting enrollment fee";
  if (status === "completed") return "Completed";
  if (status === "active") return "Active";
  return status.replace(/_/g, " ");
}

export function enrollmentStatusClass(status: string) {
  if (status === "completed") return "bg-success-bg text-success-text";
  if (status === "active") return "bg-info-bg text-info-text";
  if (status === PENDING_ENROLLMENT_APPROVAL) return "bg-warning-bg text-warning-text";
  if (status === AWAITING_ENROLLMENT_FEE) return "bg-warning-bg text-warning-text";
  return "bg-surface-muted-hover text-muted";
}

export async function getEnrollmentsForCoursePaginated(
  courseId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<CourseEnrollmentWithUser>> {
  noStore();
  const where = { courseId };
  const totalCount = await withDbErrorHandling(() => prisma.enrollment.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.enrollment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

/** Active roster for in-progress courses; completed roster when the course is completed. */
export function getRosterEnrollmentStatusForCourse(courseStatus: CourseStatus): "active" | "completed" {
  return courseStatus === "COMPLETED" ? "completed" : "active";
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
    status: getRosterEnrollmentStatusForCourse(courseStatus),
  };
  const searchWhere = searchQuery
    ? buildSearchOr([], [{ relation: "user", fields: ["name", "email"] }], searchQuery)
    : undefined;
  const where = andWhere(base, searchWhere);
  const totalCount = await withDbErrorHandling(() => prisma.enrollment.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.enrollment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getEnrollmentCountsByCourse(): Promise<Map<string, number>> {
  noStore();
  const courses = await withDbErrorHandling(() => prisma.course.findMany({
      select: { id: true, status: true },
    }), "Database operation failed");

  const [activeCounts, completedCounts] = await Promise.all([
    withDbErrorHandling(() => prisma.enrollment.groupBy({
            by: ["courseId"],
            where: { status: "active" },
            _count: { _all: true },
          }), "Database operation failed"),
    withDbErrorHandling(() => prisma.enrollment.groupBy({
            by: ["courseId"],
            where: { status: "completed" },
            _count: { _all: true },
          }), "Database operation failed"),
  ]);

  const activeByCourse = new Map(activeCounts.map((row) => [row.courseId, row._count._all]));
  const completedByCourse = new Map(completedCounts.map((row) => [row.courseId, row._count._all]));

  return new Map(
    courses.map((course) => [
      course.id,
      getRosterEnrollmentStatusForCourse(course.status) === "completed"
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
  const totalCount = await withDbErrorHandling(() => prisma.enrollment.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.enrollment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getAwaitingEnrollmentFeeEnrollmentsPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<PendingEnrollmentWithUser>> {
  noStore();
  const base = { status: AWAITING_ENROLLMENT_FEE };
  const where = andWhere(base, await enrollmentSearchWhere(searchQuery));
  const totalCount = await withDbErrorHandling(() => prisma.enrollment.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.enrollment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
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

