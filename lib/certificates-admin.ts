import { unstable_noStore as noStore } from "next/cache";
import { getCourseIdsByTitleSearch } from "@/lib/courses";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { andWhere, buildSearchOr, type TextSearchWhere } from "@/lib/text-search";
import { withDbErrorHandling } from "@/lib/db-error";

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
    const safePage = clampPage(page, pageSize, totalCount);

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
      },
      orderBy: { certificateGeneratedAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    });

    const courseIdsToFetch = Array.from(new Set(items.map(item => item.courseId)));
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIdsToFetch } },
      select: { id: true, title: true },
    });
    
    const courseMap = new Map(courses.map(c => [c.id, c.title]));

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
      course: {
        id: item.courseId,
        title: courseMap.get(item.courseId) || "Unknown Course",
      },
    }));

    return { items: processedItems, totalCount };
  }, "Failed to fetch certificates");
}
