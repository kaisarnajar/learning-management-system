import type { Teacher as PrismaTeacher } from "@prisma/client";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { buildSearchOr } from "@/lib/text-search";
import { withDbErrorHandling } from "@/lib/db-error";

function allTeachersWhere(searchQuery?: string) {
  if (!searchQuery) return undefined;
  return buildSearchOr(["name", "email", "specialization"], [], searchQuery);
}

export type Teacher = PrismaTeacher;

export async function getPublishedTeachersPaginated(
  page: number,
  pageSize: number,
): Promise<PaginatedResult<Teacher>> {
  const where = { published: true };
  const totalCount = await withDbErrorHandling(() => prisma.teacher.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.teacher.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getAllTeachers(): Promise<Teacher[]> {
  return withDbErrorHandling(() => prisma.teacher.findMany({ orderBy: { createdAt: "desc" } }), "Database operation failed");
}

export async function getAllTeachersPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<Teacher>> {
  const where = allTeachersWhere(searchQuery);
  const totalCount = await withDbErrorHandling(() => prisma.teacher.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.teacher.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getTeacherById(id: string): Promise<Teacher | null> {
  return withDbErrorHandling(() => prisma.teacher.findUnique({ where: { id } }), "Database operation failed");
}

export async function getPublishedTeacherById(id: string): Promise<Teacher | null> {
  return withDbErrorHandling(() => prisma.teacher.findFirst({
      where: { id, published: true },
    }), "Database operation failed");
}
