import { unstable_noStore as noStore } from "next/cache";
import { getCourseIdsByTitleSearch } from "@/lib/courses";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { andWhere, buildSearchOr, type TextSearchWhere } from "@/lib/text-search";
import { withDbErrorHandling } from "@/lib/db-error";

async function receiptSearchWhere(searchQuery?: string): Promise<TextSearchWhere | undefined> {
  if (!searchQuery) return undefined;

  const courseIds = await getCourseIdsByTitleSearch(searchQuery);
  const search = buildSearchOr(
    ["invoiceNumber", "paymentType"],
    [{ relation: "user", fields: ["name", "email"] }],
    searchQuery,
  );
  
  const orClauses = [...(search.OR as Record<string, unknown>[])];
  if (courseIds.length > 0) {
    orClauses.push({ courseId: { in: courseIds } });
  }
  return { OR: orClauses };
}

export type AdminReceiptEntry = {
  id: string;
  userId: string;
  courseId: string | null;
  invoiceNumber: string;
  receiptGeneratedAt: Date;
  paymentType: string | null;
  amountInrPaise: number;
  receiptIncludesGst: boolean | null;
  receiptFeeAmountPaise: number | null;
  receiptGstAmountPaise: number | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  course: {
    id: string;
    title: string;
  } | null;
};

export async function getGeneratedReceiptsPaginated(
  page: number,
  pageSize: number = 20,
  searchQuery?: string,
): Promise<PaginatedResult<AdminReceiptEntry>> {
  noStore();
  
  return withDbErrorHandling(async () => {
    const baseWhere = { receiptGeneratedAt: { not: null } };
    const searchWhere = await receiptSearchWhere(searchQuery);
    const where = andWhere(baseWhere, searchWhere);

    const totalCount = await prisma.paymentRecord.count({ where });
    const safePage = clampPage(page, pageSize, totalCount);

    const items = await prisma.paymentRecord.findMany({
      where,
      select: {
        id: true,
        userId: true,
        courseId: true,
        invoiceNumber: true,
        receiptGeneratedAt: true,
        paymentType: true,
        amountInrPaise: true,
        receiptIncludesGst: true,
        receiptFeeAmountPaise: true,
        receiptGstAmountPaise: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { receiptGeneratedAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    });

    const courseIdsToFetch = Array.from(new Set(items.map(item => item.courseId).filter(Boolean))) as string[];
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIdsToFetch } },
      select: { id: true, title: true },
    });
    
    const courseMap = new Map(courses.map(c => [c.id, c.title]));

    const processedItems: AdminReceiptEntry[] = items.map(item => ({
      id: item.id,
      userId: item.userId,
      courseId: item.courseId,
      invoiceNumber: item.invoiceNumber!,
      receiptGeneratedAt: item.receiptGeneratedAt!,
      paymentType: item.paymentType,
      amountInrPaise: item.amountInrPaise,
      receiptIncludesGst: item.receiptIncludesGst,
      receiptFeeAmountPaise: item.receiptFeeAmountPaise,
      receiptGstAmountPaise: item.receiptGstAmountPaise,
      user: item.user,
      course: item.courseId ? {
        id: item.courseId,
        title: courseMap.get(item.courseId) || "Unknown Course",
      } : null,
    }));

    return { items: processedItems, totalCount };
  }, "Failed to fetch receipts");
}
