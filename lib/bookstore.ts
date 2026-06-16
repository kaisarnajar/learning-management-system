import type { BookStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export { BookStatus };

export type BookWithDetails = {
  id: string;
  title: string;
  author: string;
  description: string;
  priceInrPaise: number;
  status: BookStatus;
  imagePath: string | null;
  published: boolean;
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
      return "bg-emerald-100 text-emerald-800";
    case "OUT_OF_STOCK":
      return "bg-red-100 text-red-800";
    case "COMING_SOON":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-gray-100 text-gray-700";
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
    default:
      return status;
  }
}

export function bookOrderStatusClass(status: string): string {
  switch (status) {
    case "PENDING_VERIFICATION":
      return "bg-amber-100 text-amber-900";
    case "APPROVED":
      return "bg-emerald-100 text-emerald-800";
    case "DECLINED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export async function getAllBooks(): Promise<BookWithDetails[]> {
  return prisma.book.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getPublishedBooks(): Promise<BookWithDetails[]> {
  return prisma.book.findMany({
    where: { published: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function getBookById(id: string): Promise<BookWithDetails | null> {
  return prisma.book.findUnique({ where: { id } });
}

export async function getPendingBookOrdersPaginated(
  page = 1,
  pageSize = 20,
  search?: string,
): Promise<{ items: BookOrderWithItems[]; totalCount: number }> {
  const where = {
    status: "PENDING_VERIFICATION" as const,
    ...(search
      ? {
          OR: [
            { user: { name: { contains: search } } },
            { user: { email: { contains: search } } },
            { upiTransactionId: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, totalCount] = await Promise.all([
    prisma.bookOrder.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: { book: { select: { id: true, title: true, author: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.bookOrder.count({ where }),
  ]);

  return { items, totalCount };
}

export async function getPendingBookOrderCount(): Promise<number> {
  return prisma.bookOrder.count({ where: { status: "PENDING_VERIFICATION" } });
}

export async function getBookOrdersForUser(userId: string) {
  return prisma.bookOrder.findMany({
    where: { userId },
    include: {
      items: {
        include: { book: { select: { id: true, title: true, author: true, imagePath: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBookCount(): Promise<number> {
  return prisma.book.count();
}
