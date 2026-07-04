import type { StudentReview, StudentReviewStatus, User } from "@prisma/client";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { andWhere, buildSearchOr } from "@/lib/text-search";
import { withDbErrorHandling } from "@/lib/db-error";

function studentReviewSearchWhere(searchQuery?: string) {
  if (!searchQuery) return undefined;
  return buildSearchOr(
    ["quote", "course", "location"],
    [{ relation: "user", fields: ["name", "email"] }],
    searchQuery,
  );
}

export const HOMEPAGE_FEATURED_REVIEWS_MAX = 4;

export type StudentReviewWithUser = StudentReview & {
  user: Pick<User, "id" | "name" | "email">;
};

export type HomepageReview = {
  id: string;
  quote: string;
  course: string;
  location: string;
  name: string;
  initials: string;
  rating: number;
};

export function reviewStatusLabel(status: StudentReviewStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending approval";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

export function reviewStatusClass(status: StudentReviewStatus): string {
  if (status === "PENDING") return "bg-warning-bg text-warning-text";
  if (status === "REJECTED") return "bg-destructive-bg text-destructive-text";
  return "bg-success-bg text-success-text";
}

export function getInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function toHomepageReview(review: StudentReviewWithUser): HomepageReview {
  const name = review.user.name?.trim() || "Student";
  return {
    id: review.id,
    quote: review.quote,
    course: review.course?.trim() || "Darse Quran Academy",
    location: review.location?.trim() || "—",
    name,
    initials: getInitialsFromName(name),
    rating: review.rating,
  };
}

export function canStudentEditReview(
  review: Pick<StudentReview, "status" | "userId">,
  userId: string,
): boolean {
  return review.userId === userId && (review.status === "PENDING" || review.status === "REJECTED");
}

/** Students may delete their own reviews at any approval stage. */
export function canStudentDeleteReview(
  review: Pick<StudentReview, "userId">,
  userId: string,
): boolean {
  return review.userId === userId;
}

export async function getFeaturedHomepageReviews(): Promise<HomepageReview[]> {
  const reviews = await withDbErrorHandling(() => prisma.studentReview.findMany({
      where: { status: "APPROVED", featuredOnHomepage: true },
      orderBy: [{ featuredAt: "desc" }, { updatedAt: "desc" }],
      take: HOMEPAGE_FEATURED_REVIEWS_MAX,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }), "Database operation failed");

  return reviews.map(toHomepageReview);
}

export async function getFeaturedHomepageReviewCount(): Promise<number> {
  return withDbErrorHandling(() => prisma.studentReview.count({
      where: { status: "APPROVED", featuredOnHomepage: true },
    }), "Database operation failed");
}

export async function getPendingStudentReviewCount(): Promise<number> {
  return withDbErrorHandling(() => prisma.studentReview.count({ where: { status: "PENDING" } }), "Database operation failed");
}

export async function getPendingStudentReviewsForAdminPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<StudentReviewWithUser>> {
  const where = andWhere({ status: "PENDING" as const }, studentReviewSearchWhere(searchQuery));
  const totalCount = await withDbErrorHandling(() => prisma.studentReview.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.studentReview.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getApprovedStudentReviewsForAdminPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<StudentReviewWithUser>> {
  const where = andWhere({ status: "APPROVED" as const }, studentReviewSearchWhere(searchQuery));
  const totalCount = await withDbErrorHandling(() => prisma.studentReview.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.studentReview.findMany({
      where,
      orderBy: [{ featuredOnHomepage: "desc" }, { featuredAt: "desc" }, { updatedAt: "desc" }],
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getStudentReviewsForUser(userId: string) {
  return withDbErrorHandling(() => prisma.studentReview.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }), "Database operation failed");
}

export async function getStudentReviewsForUserPaginated(
  userId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<Awaited<ReturnType<typeof getStudentReviewsForUser>>[number]>> {
  const where = { userId };
  const totalCount = await withDbErrorHandling(() => prisma.studentReview.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.studentReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getStudentReviewForUser(id: string, userId: string) {
  return withDbErrorHandling(() => prisma.studentReview.findFirst({
      where: { id, userId },
    }), "Database operation failed");
}

export async function getStudentReviewForAdmin(id: string) {
  return withDbErrorHandling(() => prisma.studentReview.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }), "Database operation failed");
}

