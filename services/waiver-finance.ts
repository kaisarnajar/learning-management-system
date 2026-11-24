import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/utils/prisma";
import { MONTHLY_PAYMENT_APPROVED, PAYMENT_TYPE_ENROLLMENT } from "@/services/monthly-payment-status";
import { getCourseIdsByTitleSearch, getAllCourses } from "@/services/courses";
import { getMonthlyFeePaise, getRegistrationFeePaise } from "@/services/course-pricing";
import { clampPage, type PaginatedResult } from "@/utils/pagination";
import { buildSearchOr } from "@/utils/text-search";
import type { FinanceFilters } from "@/services/finance-filters";
import { PAYMENT_METHOD_TEXT } from "@/services/status-compat";

export type FeeWaiverFinanceStats = {
  totalWaiverCount: number;
  totalSumWaivedPaise: number;
  totalOriginalFeePaise: number;
  totalNetPaidPaise: number;
  fullWaiverCount: number;
  fullWaiverSumPaise: number;
  partialWaiverCount: number;
  partialWaiverSumPaise: number;
};

export type ClaimedFeeWaiverItem = {
  id: string;
  date: Date;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  paymentType: string;
  label: string;
  originalFeePaise: number;
  waivedAmountPaise: number;
  discountPercentage: number;
  netPaidPaise: number;
  paymentRecordId: string | null;
  receiptGeneratedAt: Date | null;
};

/** A submission counts as a waiver when a coupon was used, it was recorded as a waiver, or its label says so. */
const WAIVER_CLAIM_WHERE = {
  OR: [
    { couponId: { not: null } },
    { paymentMethod: { equals: PAYMENT_METHOD_TEXT.WAIVER, mode: "insensitive" as const } },
    { paymentMethodEnum: "WAIVER" as const },
    { label: { contains: "waiver", mode: "insensitive" as const } },
  ],
};

async function buildWaiverSearchWhere(filters: FinanceFilters): Promise<Record<string, unknown>> {
  const where: Record<string, unknown> = {
    status: MONTHLY_PAYMENT_APPROVED,
    deletedAt: null,
    AND: [WAIVER_CLAIM_WHERE],
  };

  // Date filtering on when the waiver was claimed. updatedAt moved with
  // every later edit (a void, a relabel), shifting old waivers into the
  // current period.
  if (filters.from || filters.to) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (filters.from) createdAt.gte = filters.from;
    if (filters.to) createdAt.lte = filters.to;
    where.createdAt = createdAt;
  }

  // Course filtering
  if (filters.courseId) {
    where.courseId = filters.courseId;
  }

  // Student filtering
  if (filters.studentId) {
    where.userId = filters.studentId;
  }

  // Payment type filter if set
  if (filters.paymentType) {
    where.paymentType = filters.paymentType;
  }

  // Search query
  if (filters.q) {
    const courseIds = await getCourseIdsByTitleSearch(filters.q);
    const search = buildSearchOr(
      ["label", "upiTransactionId"],
      [{ relation: "user", fields: ["name", "email"] }],
      filters.q
    );
    const orClauses = [...((search.OR as Record<string, unknown>[]) || [])];
    if (courseIds.length > 0) {
      orClauses.push({ courseId: { in: courseIds } });
    }
    where.OR = orClauses;
  }

  return where;
}

export async function getFeeWaiverFinanceData(
  filters: FinanceFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{
  stats: FeeWaiverFinanceStats;
  paginatedResult: PaginatedResult<ClaimedFeeWaiverItem>;
}> {
  noStore();

  const where = await buildWaiverSearchWhere(filters);
  const courses = await getAllCourses();
  const courseById = new Map(courses.map((c) => [c.id, c]));

  // Totals are summed in the database: one row per distinct (course, type,
  // snapshot fee, amount) with its count, so the work no longer grows with
  // the number of waivers. The page itself is read with skip/take.
  const groups = await prisma.coursePaymentSubmission.groupBy({
    by: ["courseId", "paymentType", "baseFeePaise", "amountInrPaise"],
    where,
    _count: { _all: true },
  });
  const totalCount = groups.reduce((sum, g) => sum + g._count._all, 0);
  const safePage = clampPage(page, totalCount, pageSize);

  const pageRows = await prisma.coursePaymentSubmission.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    include: {
      user: { select: { name: true, email: true } },
      paymentRecord: { select: { receiptGeneratedAt: true } },
    },
  });

  // The fee in force at submission (baseFeePaise); the course's current fee
  // only for rows written before the snapshot existed.
  const originalFeeFor = (s: { courseId: string; paymentType: string; amountInrPaise: number; baseFeePaise: number | null }) => {
    if (s.baseFeePaise != null) return Math.max(s.baseFeePaise, s.amountInrPaise);
    const course = courseById.get(s.courseId);
    const baseCourseFeePaise = course
      ? s.paymentType === PAYMENT_TYPE_ENROLLMENT
        ? getRegistrationFeePaise(course)
        : getMonthlyFeePaise(course)
      : 0;
    return Math.max(baseCourseFeePaise, s.amountInrPaise);
  };

  const processedItems: ClaimedFeeWaiverItem[] = [];

  let totalWaiverCount = 0;
  let totalSumWaivedPaise = 0;
  let totalOriginalFeePaise = 0;
  let totalNetPaidPaise = 0;
  let fullWaiverCount = 0;
  let fullWaiverSumPaise = 0;
  let partialWaiverCount = 0;
  let partialWaiverSumPaise = 0;

  for (const g of groups) {
    const count = g._count._all;
    const originalFeePaise = originalFeeFor(g);
    const waivedAmountPaise = Math.max(0, originalFeePaise - g.amountInrPaise);

    totalWaiverCount += count;
    totalSumWaivedPaise += waivedAmountPaise * count;
    totalOriginalFeePaise += originalFeePaise * count;
    totalNetPaidPaise += g.amountInrPaise * count;

    if (g.amountInrPaise === 0) {
      fullWaiverCount += count;
      fullWaiverSumPaise += waivedAmountPaise * count;
    } else {
      partialWaiverCount += count;
      partialWaiverSumPaise += waivedAmountPaise * count;
    }
  }

  for (const s of pageRows) {
    const course = courseById.get(s.courseId);
    const originalFeePaise = originalFeeFor(s);
    const waivedAmountPaise = Math.max(0, originalFeePaise - s.amountInrPaise);
    const discountPercentage = originalFeePaise > 0
      ? Math.round((waivedAmountPaise / originalFeePaise) * 100)
      : 100;

    processedItems.push({
      id: s.id,
      date: s.createdAt,
      studentName: s.user.name || "Student",
      studentEmail: s.user.email,
      courseTitle: course?.title || s.courseId,
      paymentType: s.paymentType,
      label: s.label,
      originalFeePaise,
      waivedAmountPaise,
      discountPercentage,
      netPaidPaise: s.amountInrPaise,
      paymentRecordId: s.paymentRecordId,
      receiptGeneratedAt: s.paymentRecord?.receiptGeneratedAt || null,
    });
  }

  const items = processedItems;

  return {
    stats: {
      totalWaiverCount,
      totalSumWaivedPaise,
      totalOriginalFeePaise,
      totalNetPaidPaise,
      fullWaiverCount,
      fullWaiverSumPaise,
      partialWaiverCount,
      partialWaiverSumPaise,
    },
    paginatedResult: {
      items,
      totalCount,
    },
  };
}
