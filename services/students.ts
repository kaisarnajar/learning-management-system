import type { Prisma } from "@prisma/client";
import { getAdminEmails } from "@/services/admin";
import { clampPage, paginationArgs, type PaginatedResult } from "@/utils/pagination";
import { prisma } from "@/utils/prisma";
import { andWhere, buildSearchOr } from "@/utils/text-search";
import { withDbErrorHandling } from "@/utils/db-error";

export type StudentSortOption =
  | "regNo_asc"
  | "regNo_desc"
  | "name_asc"
  | "name_desc"
  | "date_asc"
  | "date_desc"
  | "email_asc"
  | "email_desc";

export function getStudentOrderBy(sort?: string): Prisma.UserOrderByWithRelationInput[] {
  switch (sort) {
    case "regNo_desc":
      return [{ registrationNumber: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
    case "name_asc":
      return [{ name: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
    case "name_desc":
      return [{ name: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
    case "date_asc":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "date_desc":
      return [{ createdAt: "desc" }, { id: "desc" }];
    case "email_asc":
      return [{ email: "asc" }, { createdAt: "desc" }];
    case "email_desc":
      return [{ email: "desc" }, { createdAt: "desc" }];
    case "regNo_asc":
    default:
      return [{ registrationNumber: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
  }
}

/**
 * The student list hides admin accounts only, as it always has. Teacher and
 * developer accounts stay listed: at this academy teachers also enrol and pay
 * fees as students, and hiding them made real students disappear from the
 * list and from the finance filters. Deleting a staff account from the
 * student pages is refused separately (app/admin/students/actions.ts).
 */
function studentUsersWhere(searchQuery?: string) {
  const adminEmails = getAdminEmails();
  const base = {
    deletedAt: null,
    ...(adminEmails.length > 0 ? { email: { notIn: adminEmails } } : {}),
  };
  if (!searchQuery) return base;
  return andWhere(base, buildSearchOr(["name", "email", "registrationNumber"], [], searchQuery));
}

/**
 * Students who have at least one payment record: the bounded list the finance
 * filters need, instead of every registered user.
 */
export async function getStudentsWithPayments() {
  const where = studentUsersWhere();
  return withDbErrorHandling(() => prisma.user.findMany({
      where: { ...where, paymentRecords: { some: {} } },
      select: { id: true, name: true, email: true },
      orderBy: getStudentOrderBy(),
    }), "Database operation failed");
}

export type StudentOption = { id: string; name: string | null; email: string };

/** How many matches a student picker shows. */
export const STUDENT_OPTION_LIMIT = 20;

/**
 * Students for a picker: the first `take` matching name, e-mail or
 * registration number (all students when `query` is empty), with only the
 * fields a picker shows.
 */
export async function searchStudentOptions(query: string | undefined, take = STUDENT_OPTION_LIMIT): Promise<StudentOption[]> {
  const where = studentUsersWhere(query?.trim() || undefined);
  return withDbErrorHandling(() => prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true },
      orderBy: getStudentOrderBy(),
      take,
    }), "Database operation failed");
}

/** The currently selected student of a picker, if it still exists. */
export async function getStudentOption(id: string | undefined): Promise<StudentOption | null> {
  if (!id) return null;
  return withDbErrorHandling(() => prisma.user.findFirst({
      where: { ...studentUsersWhere(), id },
      select: { id: true, name: true, email: true },
    }), "Database operation failed");
}

export async function getStudentUsersPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
  sort?: string,
): Promise<PaginatedResult<Prisma.UserGetPayload<object>>> {
  const where = studentUsersWhere(searchQuery);
  const totalCount = await withDbErrorHandling(() => prisma.user.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.user.findMany({
      where,
      orderBy: getStudentOrderBy(sort),
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getStudentUserById(id: string) {
  const adminEmails = getAdminEmails();

  const user = await withDbErrorHandling(() => prisma.user.findUnique({
      where: { id },
      include: {
        enrollments: {
          orderBy: { createdAt: "desc" },
        },
      },
    }), "Database operation failed");

  if (!user || user.deletedAt) return null;
  if (adminEmails.includes(user.email.toLowerCase())) return null;

  return user;
}

export async function getStudentCount() {
  const where = studentUsersWhere();
  return withDbErrorHandling(() => prisma.user.count({ where }), "Database operation failed");
}
