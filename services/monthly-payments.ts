import { unstable_noStore as noStore } from "next/cache";
import { COURSE_FEE_PAYMENT_TYPES } from "@/services/status-compat";
import { getCourseIdsByTitleSearch } from "@/services/courses";
import { APPROVAL_PAGE_SIZE, clampPage, paginationArgs, type PaginatedResult } from "@/utils/pagination";
import { prisma } from "@/utils/prisma";
import { andWhere, buildSearchOr, type TextSearchWhere } from "@/utils/text-search";
import { withDbErrorHandling } from "@/utils/db-error";
import { PAYMENT_YEARS_BACK, PAYMENT_YEARS_FORWARD, getPaymentYearBounds, getPaymentYearOptions, isPaymentYearAllowed } from "@/utils/payment-years";
import { buildEnrollmentFeeLabel, buildMonthlyFeeLabel } from "@/services/fee-labels";

// Pure helpers, importable from client components: services/fee-labels.ts
export { buildEnrollmentFeeLabel, buildMonthlyFeeLabel };

// Pure helpers, importable from client components: utils/payment-years.ts
export { PAYMENT_YEARS_BACK, PAYMENT_YEARS_FORWARD, getPaymentYearBounds, getPaymentYearOptions, isPaymentYearAllowed };

async function paymentSubmissionSearchWhere(
  searchQuery?: string,
): Promise<TextSearchWhere | undefined> {
  if (!searchQuery) return undefined;

  const courseIds = await getCourseIdsByTitleSearch(searchQuery);
  const search = buildSearchOr(
    ["label", "upiTransactionId"],
    [{ relation: "user", fields: ["name", "email"] }],
    searchQuery,
  );
  const orClauses = [...(search.OR as Record<string, unknown>[])];
  if (courseIds.length > 0) {
    orClauses.push({ courseId: { in: courseIds } });
  }
  return { OR: orClauses };
}

export type CoursePaymentSubmissionWithUser = {
  id: string;
  userId: string;
  courseId: string;
  paymentType: string;
  label: string;
  amountInrPaise: number;
  status: string;
  paymentMethod: string | null;
  upiTransactionId: string | null;
  paymentScreenshotPath: string | null;
  paymentReference: string | null;
  paymentRecordId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  paymentRecord?: {
    receiptGeneratedAt: Date | null;
  } | null;
};

export async function getPendingMonthlyPaymentsPaginated(
  page: number,
  pageSize: number = APPROVAL_PAGE_SIZE,
  searchQuery?: string,
): Promise<PaginatedResult<CoursePaymentSubmissionWithUser>> {
  noStore();
  const base = {
    statusEnum: "PENDING_VERIFICATION" as const,
    deletedAt: null,
    paymentTypeEnum: { in: COURSE_FEE_PAYMENT_TYPES }
  };
  const where = andWhere(base, await paymentSubmissionSearchWhere(searchQuery));
  const totalCount = await withDbErrorHandling(() => prisma.coursePaymentSubmission.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.coursePaymentSubmission.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getPendingEnrollmentFeePaymentsPaginated(
  page: number,
  pageSize: number = APPROVAL_PAGE_SIZE,
  searchQuery?: string,
): Promise<PaginatedResult<CoursePaymentSubmissionWithUser>> {
  noStore();
  const base = { statusEnum: "PENDING_VERIFICATION" as const, paymentTypeEnum: "ENROLLMENT" as const, deletedAt: null };
  const where = andWhere(base, await paymentSubmissionSearchWhere(searchQuery));
  const totalCount = await withDbErrorHandling(() => prisma.coursePaymentSubmission.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.coursePaymentSubmission.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getPendingPaymentCount(): Promise<number> {
  noStore();
  return withDbErrorHandling(() => prisma.coursePaymentSubmission.count({
      where: { statusEnum: "PENDING_VERIFICATION", deletedAt: null },
    }), "Database operation failed");
}

export async function hasPendingEnrollmentFeeSubmission(
  userId: string,
  courseId: string,
): Promise<boolean> {
  const submission = await withDbErrorHandling(() => prisma.coursePaymentSubmission.findFirst({
      where: {
        userId,
        courseId,
        paymentTypeEnum: "ENROLLMENT",
        statusEnum: "PENDING_VERIFICATION",
        deletedAt: null,
      },
      select: { id: true },
    }), "Database operation failed");
  return Boolean(submission);
}

export async function getPendingEnrollmentFeeSubmissionMap(userId: string) {
  const rows = await withDbErrorHandling(() => prisma.coursePaymentSubmission.findMany({
      where: {
        userId,
        paymentTypeEnum: "ENROLLMENT",
        statusEnum: "PENDING_VERIFICATION",
        deletedAt: null,
      },
      select: { courseId: true },
    }), "Database operation failed");
  return new Set(rows.map((row) => row.courseId));
}

export async function getApprovedMonthlyPaymentsPaginated(
  page: number,
  pageSize: number = APPROVAL_PAGE_SIZE,
  searchQuery?: string,
  filterType: "all" | "paid" | "waiver" = "all",
): Promise<PaginatedResult<CoursePaymentSubmissionWithUser>> {
  noStore();
  const base: Record<string, unknown> = {
    statusEnum: "APPROVED",
    deletedAt: null,
    paymentTypeEnum: { in: COURSE_FEE_PAYMENT_TYPES }
  };
  if (filterType === "paid") {
    base.amountInrPaise = { gt: 0 };
  } else if (filterType === "waiver") {
    base.amountInrPaise = 0;
  }

  const where = andWhere(base, await paymentSubmissionSearchWhere(searchQuery));
  const totalCount = await withDbErrorHandling(() => prisma.coursePaymentSubmission.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.coursePaymentSubmission.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        paymentRecord: { select: { receiptGeneratedAt: true } },
      },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  // Read-only: submissions without a PaymentRecord are shown as such; the
  // one-off scripts/backfill-payment-records.ts creates missing records.
  return { items, totalCount };
}

export async function getApprovedEnrollmentFeePaymentsPaginated(
  page: number,
  pageSize: number = APPROVAL_PAGE_SIZE,
  searchQuery?: string,
  filterType: "all" | "paid" | "waiver" = "all",
): Promise<PaginatedResult<CoursePaymentSubmissionWithUser>> {
  noStore();
  const base: Record<string, unknown> = { statusEnum: "APPROVED", paymentTypeEnum: "ENROLLMENT", deletedAt: null };
  if (filterType === "paid") {
    base.amountInrPaise = { gt: 0 };
  } else if (filterType === "waiver") {
    base.amountInrPaise = 0;
  }

  const where = andWhere(base, await paymentSubmissionSearchWhere(searchQuery));
  const totalCount = await withDbErrorHandling(() => prisma.coursePaymentSubmission.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.coursePaymentSubmission.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        paymentRecord: { select: { receiptGeneratedAt: true } },
      },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}
