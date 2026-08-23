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

function studentUsersWhere(searchQuery?: string) {
  const adminEmails = getAdminEmails();
  const base = adminEmails.length > 0 ? { email: { notIn: adminEmails } } : undefined;
  if (!searchQuery) return base;
  return andWhere(base, buildSearchOr(["name", "email", "registrationNumber"], [], searchQuery));
}

export async function getStudentUsers() {
  return withDbErrorHandling(() => prisma.user.findMany({
      where: studentUsersWhere(),
      orderBy: getStudentOrderBy(),
    }), "Database operation failed");
}

export async function getStudentUsersPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
  sort?: string,
): Promise<PaginatedResult<Awaited<ReturnType<typeof getStudentUsers>>[number]>> {
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

  if (!user) return null;
  if (adminEmails.includes(user.email.toLowerCase())) return null;

  return user;
}

export async function getStudentCount() {
  const adminEmails = getAdminEmails();

  return withDbErrorHandling(() => prisma.user.count({
      where: adminEmails.length > 0 ? { email: { notIn: adminEmails } } : undefined,
    }), "Database operation failed");
}
