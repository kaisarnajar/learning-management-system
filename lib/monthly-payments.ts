import { unstable_noStore as noStore } from "next/cache";
import {
  MONTHLY_PAYMENT_PENDING,
  MONTHLY_PAYMENT_APPROVED,
  PAYMENT_TYPE_ENROLLMENT,
  PAYMENT_TYPE_MONTHLY,
} from "@/lib/monthly-payment-status";
import { getCourseIdsByTitleSearch } from "@/lib/courses";
import { APPROVAL_PAGE_SIZE, clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { andWhere, buildSearchOr, type TextSearchWhere } from "@/lib/text-search";
import { withDbErrorHandling } from "@/lib/db-error";

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
};

export async function getPendingMonthlyPaymentsPaginated(
  page: number,
  pageSize: number = APPROVAL_PAGE_SIZE,
  searchQuery?: string,
): Promise<PaginatedResult<CoursePaymentSubmissionWithUser>> {
  noStore();
  const base = { status: MONTHLY_PAYMENT_PENDING, paymentType: PAYMENT_TYPE_MONTHLY };
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
  const base = { status: MONTHLY_PAYMENT_PENDING, paymentType: PAYMENT_TYPE_ENROLLMENT };
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
      where: { status: MONTHLY_PAYMENT_PENDING },
    }), "Database operation failed");
}

/** How many calendar years before the current year students may select. */
export const PAYMENT_YEARS_BACK = 2;

/** How many calendar years after the current year students may select (e.g. 2035, 2040). */
export const PAYMENT_YEARS_FORWARD = 25;

export function getPaymentYearBounds(referenceDate = new Date()) {
  const current = referenceDate.getFullYear();
  return {
    min: current - PAYMENT_YEARS_BACK,
    max: current + PAYMENT_YEARS_FORWARD,
  };
}

export function getPaymentYearOptions(referenceDate = new Date()): string[] {
  const { min, max } = getPaymentYearBounds(referenceDate);
  const years: string[] = [];
  for (let y = min; y <= max; y++) {
    years.push(String(y));
  }
  return years;
}

export function isPaymentYearAllowed(year: string, referenceDate = new Date()): boolean {
  const y = Number.parseInt(year, 10);
  if (!Number.isFinite(y) || year.length !== 4) return false;
  const { min, max } = getPaymentYearBounds(referenceDate);
  return y >= min && y <= max;
}

export function buildMonthlyFeeLabel(month: string, year: string): string {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const index = Number.parseInt(month, 10) - 1;
  const monthName = monthNames[index] ?? month;
  return `Monthly fee — ${monthName} ${year}`;
}

export function buildEnrollmentFeeLabel(courseTitle: string): string {
  return `Enrollment fee — ${courseTitle}`;
}

export async function hasPendingEnrollmentFeeSubmission(
  userId: string,
  courseId: string,
): Promise<boolean> {
  const submission = await withDbErrorHandling(() => prisma.coursePaymentSubmission.findFirst({
      where: {
        userId,
        courseId,
        paymentType: PAYMENT_TYPE_ENROLLMENT,
        status: MONTHLY_PAYMENT_PENDING,
      },
      select: { id: true },
    }), "Database operation failed");
  return Boolean(submission);
}

export async function getPendingEnrollmentFeeSubmissionMap(userId: string) {
  const rows = await withDbErrorHandling(() => prisma.coursePaymentSubmission.findMany({
      where: {
        userId,
        paymentType: PAYMENT_TYPE_ENROLLMENT,
        status: MONTHLY_PAYMENT_PENDING,
      },
      select: { courseId: true },
    }), "Database operation failed");
  return new Set(rows.map((row) => row.courseId));
}

export async function getApprovedMonthlyPaymentsPaginated(
  page: number,
  pageSize: number = APPROVAL_PAGE_SIZE,
  searchQuery?: string,
): Promise<PaginatedResult<CoursePaymentSubmissionWithUser>> {
  noStore();
  const base = { status: MONTHLY_PAYMENT_APPROVED, paymentType: PAYMENT_TYPE_MONTHLY };
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

export async function getApprovedEnrollmentFeePaymentsPaginated(
  page: number,
  pageSize: number = APPROVAL_PAGE_SIZE,
  searchQuery?: string,
): Promise<PaginatedResult<CoursePaymentSubmissionWithUser>> {
  noStore();
  const base = { status: MONTHLY_PAYMENT_APPROVED, paymentType: PAYMENT_TYPE_ENROLLMENT };
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
