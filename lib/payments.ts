import type { PaymentRecord } from "@prisma/client";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

export async function getPaymentRecordsForUserPaginated(
  userId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<PaymentRecord>> {
  const where = { userId };
  const totalCount = await withDbErrorHandling(() => prisma.paymentRecord.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.paymentRecord.findMany({
      where,
      orderBy: { paidAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getPaymentSubmissionsForUser(userId: string) {
  return withDbErrorHandling(() => prisma.coursePaymentSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }), "Database operation failed");
}
