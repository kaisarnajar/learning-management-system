import { unstable_noStore as noStore } from "next/cache";
import { getCourseIdsByTitleSearch } from "@/services/courses";
import { clampPage, paginationArgs, type PaginatedResult } from "@/utils/pagination";
import { prisma } from "@/utils/prisma";
import { andWhere, buildSearchOr, type TextSearchWhere } from "@/utils/text-search";
import { withDbErrorHandling } from "@/utils/db-error";
import type { EnrollmentStatus, Prisma } from "@prisma/client";

import { enrollmentStatusOf } from "@/services/status-compat";

async function certificateSearchWhere(searchQuery?: string): Promise<TextSearchWhere | undefined> {
  if (!searchQuery) return undefined;

  const courseIds = await getCourseIdsByTitleSearch(searchQuery);
  const search = buildSearchOr(
    ["certificateNumber"],
    [{ relation: "user", fields: ["name", "email"] }],
    searchQuery,
  );
  
  const orClauses = [...(search.OR as Record<string, unknown>[])];
  if (courseIds.length > 0) {
    orClauses.push({ courseId: { in: courseIds } });
  }
  return { OR: orClauses };
}

export type AdminCertificateEntry = {
  id: string;
  userId: string;
  courseId: string;
  certificateNumber: string;
  certificateGeneratedAt: Date;
  certificateType: string | null;
  certificateGrade: number | null;
  status: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  course: {
    id: string;
    title: string;
  };
};

export async function getGeneratedCertificatesPaginated(
  page: number,
  pageSize: number = 20,
  searchQuery?: string,
): Promise<PaginatedResult<AdminCertificateEntry>> {
  noStore();
  
  return withDbErrorHandling(async () => {
    const baseWhere = { certificateGeneratedAt: { not: null } };
    const searchWhere = await certificateSearchWhere(searchQuery);
    const where = andWhere(baseWhere, searchWhere);

    const totalCount = await prisma.enrollment.count({ where });
    const safePage = clampPage(page, totalCount, pageSize);

    const items = await prisma.enrollment.findMany({
      where,
      select: {
        id: true,
        userId: true,
        courseId: true,
        certificateNumber: true,
        certificateGeneratedAt: true,
        certificateType: true,
        certificateGrade: true,
        status: true,
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { certificateGeneratedAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    });

    const processedItems: AdminCertificateEntry[] = items.map(item => ({
      id: item.id,
      userId: item.userId,
      courseId: item.courseId,
      certificateNumber: item.certificateNumber!,
      certificateGeneratedAt: item.certificateGeneratedAt!,
      certificateType: item.certificateType,
      certificateGrade: item.certificateGrade,
      status: item.status,
      user: item.user,
      course: item.course,
    }));

    return { items: processedItems, totalCount };
  }, "Failed to fetch certificates");
}

export type CertificateCandidate = {
  id: string;
  status: EnrollmentStatus | null;
  user: { name: string | null; email: string };
  course: { id: string; title: string };
};

/**
 * Enrollments a certificate can be issued for: none issued yet, the
 * enrollment ACTIVE (appreciation) or COMPLETED (completion; checked when
 * generating), and the student's account not deleted.
 */
const CERTIFIABLE_WHERE = {
  certificateGeneratedAt: null,
  statusEnum: { in: ["ACTIVE", "COMPLETED"] },
  user: { deletedAt: null },
} satisfies Prisma.EnrollmentWhereInput;

/** Courses with at least one enrollment awaiting a certificate, for the generate form's course choice. */
export async function getCoursesAwaitingCertificates(): Promise<{ id: string; title: string }[]> {
  noStore();
  return withDbErrorHandling(async () => {
    const groups = await prisma.enrollment.groupBy({ by: ["courseId"], where: CERTIFIABLE_WHERE });
    if (groups.length === 0) return [];
    return prisma.course.findMany({
      where: { id: { in: groups.map((g) => g.courseId) } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
  }, "Failed to fetch courses");
}

/**
 * Enrollments awaiting a certificate (see CERTIFIABLE_WHERE), one page at a
 * time, optionally for one course and matching a student name or e-mail,
 * for /admin/certificates/new and the staff API.
 */
export async function getEnrollmentsAwaitingCertificatePaginated(
  page: number,
  pageSize: number,
  filters: { courseId?: string; searchQuery?: string } = {},
): Promise<PaginatedResult<CertificateCandidate>> {
  noStore();
  return withDbErrorHandling(async () => {
    const base: TextSearchWhere = { ...CERTIFIABLE_WHERE, ...(filters.courseId ? { courseId: filters.courseId } : {}) };
    const search = filters.searchQuery ? buildSearchOr([], [{ relation: "user", fields: ["name", "email"] }], filters.searchQuery) : undefined;
    const where = andWhere(base, search) as Prisma.EnrollmentWhereInput;

    const totalCount = await prisma.enrollment.count({ where });
    const safePage = clampPage(page, totalCount, pageSize);
    const enrollments = await prisma.enrollment.findMany({
      where,
      select: {
        id: true,
        status: true,
        statusEnum: true,
        user: { select: { name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: [{ user: { name: "asc" } }, { id: "asc" }],
      ...paginationArgs(safePage, pageSize),
    });
    return {
      items: enrollments.map((e) => ({ id: e.id, status: enrollmentStatusOf(e), user: e.user, course: e.course })),
      totalCount,
    };
  }, "Failed to fetch enrollments");
}

/** One enrollment with what its certificate shows (student, course, number, type, grade), or null. */
export async function getCertificateEnrollment(enrollmentId: string) {
  noStore();
  return withDbErrorHandling(() => prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      user: { select: { id: true, name: true, email: true, address: true, whatsapp: true } },
      course: { select: { id: true, title: true } },
    },
  }), "Failed to fetch certificate");
}
