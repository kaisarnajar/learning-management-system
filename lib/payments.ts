import type { PaymentRecord } from "@prisma/client";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";


export async function getPaymentRecordsForUserPaginated(
  userId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<PaymentRecord>> {
  const where = { userId };
  const totalCount = await prisma.paymentRecord.count({ where });
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await prisma.paymentRecord.findMany({
    where,
    orderBy: { paidAt: "desc" },
    ...paginationArgs(safePage, pageSize),
  });
  return { items, totalCount };
}

export async function getPaymentSubmissionsForUser(userId: string) {
  return prisma.coursePaymentSubmission.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
