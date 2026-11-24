import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/utils/prisma";
import { clampPage, paginationArgs, type PaginatedResult } from "@/utils/pagination";
import { resolveWaiverFeeType, waiverFeeTypeLabel } from "@/services/waiver-requests";

/** Reads behind /admin/coupons (and the app's fee-waiver screens). */

export type AdminCouponType = "SPECIAL" | "DEFAULT";

const couponInclude = {
  course: { select: { title: true } },
  user: { select: { name: true, email: true } },
} as const;

/** One page of coupons of [type], newest first. `page` is clamped to the last page. */
export async function getAdminCouponsPaginated(type: AdminCouponType, page: number, pageSize: number) {
  noStore();
  const where = { type };
  const totalCount = await prisma.coupon.count({ where });
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await prisma.coupon.findMany({
    where,
    include: couponInclude,
    orderBy: { createdAt: "desc" },
    ...paginationArgs(safePage, pageSize),
  });
  return { items, totalCount, page: safePage };
}

const requestInclude = {
  user: { select: { name: true, email: true, whatsapp: true } },
  course: { select: { title: true } },
} as const;

async function withFeeTypeLabels<T extends { feeType: Parameters<typeof resolveWaiverFeeType>[0]["feeType"]; reason: string }>(rows: T[]) {
  return rows.map((request) => ({ ...request, feeTypeLabel: waiverFeeTypeLabel(resolveWaiverFeeType(request)) }));
}

/** Every fee-waiver request, newest first, with its fee type label. */
export async function getWaiverRequests() {
  noStore();
  const rows = await prisma.couponRequest.findMany({ include: requestInclude, orderBy: { createdAt: "desc" } });
  return withFeeTypeLabels(rows);
}

/** One page of fee-waiver requests (optionally only one status), newest first. */
export async function getWaiverRequestsPaginated(
  page: number,
  pageSize: number,
  status?: "PENDING" | "APPROVED" | "REJECTED",
): Promise<PaginatedResult<Awaited<ReturnType<typeof getWaiverRequests>>[number]>> {
  noStore();
  const where = status ? { status } : {};
  const totalCount = await prisma.couponRequest.count({ where });
  const safePage = clampPage(page, totalCount, pageSize);
  const rows = await prisma.couponRequest.findMany({
    where,
    include: requestInclude,
    orderBy: { createdAt: "desc" },
    ...paginationArgs(safePage, pageSize),
  });
  return { items: await withFeeTypeLabels(rows), totalCount };
}

/** Courses a coupon can be limited to, by title. */
export async function getCouponCourseOptions() {
  return prisma.course.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } });
}
