import type { BookStatus, Prisma } from "@prisma/client";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { buildSearchOr } from "@/lib/text-search";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";
import { resolveHomepageFeaturedUpdate } from "@/lib/homepage-featured";

export { BookStatus };

export type BookWithDetails = {
  id: string;
  title: string;
  author: string;
  description: string;
  priceInrPaise: number;
  purchasePriceInrPaise: number;
  inventoryPurchased: number;
  status: BookStatus;
  imagePath: string | null;
  published: boolean;
  featuredOnHomepage: boolean;
  featuredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BookOrderWithItems = {
  id: string;
  userId: string;
  totalAmountInrPaise: number;
  status: string;
  paymentMethod: string | null;
  upiTransactionId: string | null;
  paymentScreenshotPath: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { name: string | null; email: string };
  items: {
    id: string;
    quantity: number;
    priceAtPurchaseInrPaise: number;
    book: { id: string; title: string; author: string };
  }[];
};

export function bookStatusLabel(status: BookStatus): string {
  switch (status) {
    case "AVAILABLE":
      return "Available";
    case "OUT_OF_STOCK":
      return "Out of Stock";
    case "COMING_SOON":
      return "Coming Soon";
    default:
      return status;
  }
}

export function bookStatusClass(status: BookStatus): string {
  switch (status) {
    case "AVAILABLE":
      return "bg-success-bg text-success-text";
    case "OUT_OF_STOCK":
      return "bg-destructive-bg text-destructive-text";
    case "COMING_SOON":
      return "bg-warning-bg text-warning-text";
    default:
      return "bg-surface-muted-hover text-muted";
  }
}

export function bookOrderStatusLabel(status: string): string {
  switch (status) {
    case "PENDING_VERIFICATION":
      return "Pending Verification";
    case "APPROVED":
      return "Approved";
    case "DECLINED":
      return "Declined";
    case "SHIPPED":
      return "Shipped";
    case "REFUNDED":
      return "Refunded";
    default:
      return status;
  }
}

export function bookOrderStatusClass(status: string): string {
  switch (status) {
    case "PENDING_VERIFICATION":
      return "bg-warning-bg text-warning-text";
    case "APPROVED":
      return "bg-success-bg text-success-text";
    case "DECLINED":
      return "bg-destructive-bg text-destructive-text";
    case "SHIPPED":
      return "bg-info-bg text-info-text";
    case "REFUNDED":
      return "bg-surface-muted-hover text-muted";
    default:
      return "bg-surface-muted-hover text-muted";
  }
}

function allBooksWhere(searchQuery?: string) {
  if (!searchQuery) return undefined;
  return buildSearchOr(["title", "author"], [], searchQuery);
}

export async function getAllBooksPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<BookWithDetails>> {
  const where = allBooksWhere(searchQuery);
  const totalCount = await withDbErrorHandling(() => prisma.book.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  
  const items = await withDbErrorHandling(() => prisma.book.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");

  return { items, totalCount };
}

function publishedBooksWhere(searchQuery?: string) {
  const base = { published: true };
  if (!searchQuery) return base;
  return { AND: [base, buildSearchOr(["title", "author"], [], searchQuery)] };
}

export async function getPublishedBooksPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<BookWithDetails>> {
  const where = publishedBooksWhere(searchQuery);
  const totalCount = await withDbErrorHandling(() => prisma.book.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);

  const items = await withDbErrorHandling(() => prisma.book.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");

  return { items, totalCount };
}

export async function getBookById(id: string): Promise<BookWithDetails | null> {
  return withDbErrorHandling(() => prisma.book.findUnique({ where: { id } }), "Database operation failed");
}

async function fetchBookOrdersPaginated(
  statusCondition: Prisma.BookOrderWhereInput["status"],
  page: number,
  pageSize: number,
  search?: string,
  orderBy: Prisma.BookOrderOrderByWithRelationInput = { createdAt: "desc" }
): Promise<{ items: BookOrderWithItems[]; totalCount: number }> {
  const where: Prisma.BookOrderWhereInput = {
    status: statusCondition,
    ...(search
      ? {
          OR: [
            { user: { name: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
            { upiTransactionId: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, totalCount] = await Promise.all([
    withDbErrorHandling(() => prisma.bookOrder.findMany({
            where,
            include: {
              user: { select: { name: true, email: true } },
              items: {
                include: { book: { select: { id: true, title: true, author: true } } },
              },
            },
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
          }), "Database operation failed"),
    withDbErrorHandling(() => prisma.bookOrder.count({ where }), "Database operation failed"),
  ]);

  return { items, totalCount };
}

export async function getPendingBookOrdersPaginated(
  page = 1,
  pageSize = 20,
  search?: string,
): Promise<{ items: BookOrderWithItems[]; totalCount: number }> {
  return fetchBookOrdersPaginated("PENDING_VERIFICATION", page, pageSize, search, { createdAt: "desc" });
}

export async function getApprovedBookOrdersPaginated(
  page = 1,
  pageSize = 20,
  search?: string,
): Promise<{ items: BookOrderWithItems[]; totalCount: number }> {
  return fetchBookOrdersPaginated("APPROVED", page, pageSize, search, { createdAt: "desc" });
}

export async function getCompletedBookOrdersPaginated(
  page = 1,
  pageSize = 20,
  search?: string,
): Promise<{ items: BookOrderWithItems[]; totalCount: number }> {
  return fetchBookOrdersPaginated({ in: ["SHIPPED", "REFUNDED", "DECLINED"] }, page, pageSize, search, { createdAt: "desc" });
}

export async function getPendingBookOrderCount(): Promise<number> {
  return withDbErrorHandling(() => prisma.bookOrder.count({ where: { status: "PENDING_VERIFICATION" } }), "Database operation failed");
}

export async function getBookOrdersForUser(userId: string) {
  return withDbErrorHandling(() => prisma.bookOrder.findMany({
      where: { userId },
      include: {
        items: {
          include: { book: { select: { id: true, title: true, author: true, imagePath: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }), "Database operation failed");
}

export async function getBookCount(): Promise<number> {
  return withDbErrorHandling(() => prisma.book.count(), "Database operation failed");
}

export const HOMEPAGE_FEATURED_BOOKS_MAX = 4;

export async function getFeaturedHomepageBooks(): Promise<BookWithDetails[]> {
  return withDbErrorHandling(() => prisma.book.findMany({
      where: { featuredOnHomepage: true, published: true },
      orderBy: [{ featuredAt: "desc" }, { updatedAt: "desc" }],
      take: HOMEPAGE_FEATURED_BOOKS_MAX,
    }), "Database operation failed");
}

export async function getFeaturedHomepageBookCount(): Promise<number> {
  return withDbErrorHandling(() => prisma.book.count({
      where: { featuredOnHomepage: true, published: true },
    }), "Database operation failed");
}

export async function resolveBookFeaturedUpdate(options: {
  item: Pick<BookWithDetails, "published"> & { featuredOnHomepage: boolean; featuredAt: Date | null };
  requestFeatured: boolean;
}) {
  const featuredCount = await getFeaturedHomepageBookCount();
  return resolveHomepageFeaturedUpdate({
    isEligible: options.item.published,
    requestFeatured: options.requestFeatured,
    currentlyFeatured: options.item.featuredOnHomepage,
    currentFeaturedAt: options.item.featuredAt,
    featuredCount,
    maxFeatured: HOMEPAGE_FEATURED_BOOKS_MAX,
    resourceLabel: "books",
  });
}
