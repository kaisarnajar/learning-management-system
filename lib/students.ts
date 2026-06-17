import { getAdminEmails } from "@/lib/admin";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { andWhere, buildSearchOr } from "@/lib/text-search";
import { withDbErrorHandling } from "@/lib/db-error";

function studentUsersWhere(searchQuery?: string) {
  const adminEmails = getAdminEmails();
  const base = adminEmails.length > 0 ? { email: { notIn: adminEmails } } : undefined;
  if (!searchQuery) return base;
  return andWhere(base, buildSearchOr(["name", "email"], [], searchQuery));
}

export async function getStudentUsers() {
  return withDbErrorHandling(() => prisma.user.findMany({
      where: studentUsersWhere(),
      orderBy: { createdAt: "desc" },
    }), "Database operation failed");
}

export async function getStudentUsersPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<Awaited<ReturnType<typeof getStudentUsers>>[number]>> {
  const where = studentUsersWhere(searchQuery);
  const totalCount = await withDbErrorHandling(() => prisma.user.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
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
