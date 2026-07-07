import type { Teacher as PrismaTeacher } from "@prisma/client";
import { clampPage, paginationArgs, type PaginatedResult } from "@/utils/pagination";
import { prisma } from "@/utils/prisma";
import { andWhere, buildSearchOr } from "@/utils/text-search";
import { withDbErrorHandling } from "@/utils/db-error";

function allTeachersWhere(searchQuery?: string) {
  if (!searchQuery) return undefined;
  return buildSearchOr(["name", "email", "specialization"], [], searchQuery);
}

export type Teacher = PrismaTeacher;

export async function getPublishedTeachersPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<Teacher>> {
  const baseWhere = { published: true };
  const searchWhere = searchQuery ? buildSearchOr(["name", "specialization", "bio"], [], searchQuery) : undefined;
  const where = andWhere(baseWhere, searchWhere) || baseWhere;
  const totalCount = await withDbErrorHandling(() => prisma.teacher.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.teacher.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");

  const emails = items.map((t) => t.email).filter(Boolean) as string[];
  if (emails.length > 0) {
    const users = await withDbErrorHandling(() => prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, image: true },
    }), "Database operation failed");
    
    const userImageMap = new Map(users.map((u) => [u.email, u.image]));
    for (const item of items) {
      if (!item.imageUrl && item.email && userImageMap.get(item.email)) {
        item.imageUrl = userImageMap.get(item.email) || null;
      }
    }
  }

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
  const teacher = await withDbErrorHandling(() => prisma.teacher.findUnique({ where: { id } }), "Database operation failed");

  if (teacher && !teacher.imageUrl && teacher.email) {
    const user = await withDbErrorHandling(() => prisma.user.findUnique({
      where: { email: teacher.email! },
      select: { image: true },
    }), "Database operation failed");
    if (user?.image) {
      teacher.imageUrl = user.image;
    }
  }

  return teacher;
}

export async function getPublishedTeacherById(id: string): Promise<Teacher | null> {
  const teacher = await withDbErrorHandling(() => prisma.teacher.findFirst({
      where: { id, published: true },
    }), "Database operation failed");

  if (teacher && !teacher.imageUrl && teacher.email) {
    const user = await withDbErrorHandling(() => prisma.user.findUnique({
      where: { email: teacher.email! },
      select: { image: true },
    }), "Database operation failed");
    if (user?.image) {
      teacher.imageUrl = user.image;
    }
  }

  return teacher;
}
