import { prisma } from "@/lib/prisma";
import type { FinanceFilters } from "@/lib/finance-filters";
import { financePaidAtWhere } from "@/lib/finance-filters";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { buildSearchOr } from "@/lib/text-search";
import type { Prisma } from "@prisma/client";
import { withDbErrorHandling } from "@/lib/db-error";

export type BookstoreFinanceSummary = {
  totalBooksPurchased: number;
  totalBooksSold: number;
  currentInventoryCount: number;
  totalPurchaseCostPaise: number;
  totalSalesRevenuePaise: number;
  totalProfitLossPaise: number;
  pendingOrdersValuePaise: number;
  approvedOrdersValuePaise: number;
  completedOrdersValuePaise: number;
  averageOrderValuePaise: number;
};

export type BookSalesRecord = {
  id: string;
  title: string;
  author: string;
  purchasePriceInrPaise: number;
  sellingPriceInrPaise: number;
  quantityPurchased: number;
  quantitySold: number;
  remainingStock: number;
  revenuePaise: number;
  profitPaise: number;
};

export type BookOrderFinanceRecord = {
  id: string;
  orderDate: Date;
  customerName: string;
  customerEmail: string;
  deliveryAddress: string;
  deliveryPinCode: string | null;
  deliveryPhoneNumber: string | null;
  status: string;
  totalAmountPaise: number;
  profitContributionPaise: number;
};

export async function getBookstoreFinanceSummary(filters: Pick<FinanceFilters, "from" | "to">): Promise<BookstoreFinanceSummary> {
  const dateWhere = filters.from || filters.to ? { createdAt: financePaidAtWhere(filters) } : {};

  const [books, orders] = await Promise.all([
    withDbErrorHandling(() => prisma.book.findMany({
            select: {
              inventoryPurchased: true,
              purchasePriceInrPaise: true,
            },
          }), "Database operation failed"),
    withDbErrorHandling(() => prisma.bookOrder.findMany({
            where: dateWhere,
            include: {
              items: {
                include: {
                  book: {
                    select: { purchasePriceInrPaise: true },
                  },
                },
              },
            },
          }), "Database operation failed"),
  ]);

  let totalBooksPurchased = 0;
  let totalPurchaseCostPaise = 0;

  for (const book of books) {
    totalBooksPurchased += book.inventoryPurchased;
    totalPurchaseCostPaise += book.inventoryPurchased * book.purchasePriceInrPaise;
  }

  let totalBooksSold = 0;
  let totalSalesRevenuePaise = 0;
  let totalProfitLossPaise = 0;
  let pendingOrdersValuePaise = 0;
  let approvedOrdersValuePaise = 0;
  let completedOrdersValuePaise = 0;
  let validOrderCount = 0;

  for (const order of orders) {
    if (order.status === "PENDING_VERIFICATION") {
      pendingOrdersValuePaise += order.totalAmountInrPaise;
    } else if (order.status === "APPROVED") {
      approvedOrdersValuePaise += order.totalAmountInrPaise;
    } else if (order.status === "SHIPPED") {
      completedOrdersValuePaise += order.totalAmountInrPaise;
    }

    if (order.status === "APPROVED" || order.status === "SHIPPED") {
      totalSalesRevenuePaise += order.totalAmountInrPaise;
      validOrderCount++;

      for (const item of order.items) {
        totalBooksSold += item.quantity;
        const itemRevenue = item.quantity * item.priceAtPurchaseInrPaise;
        const itemCost = item.quantity * (item.book?.purchasePriceInrPaise || 0);
        totalProfitLossPaise += (itemRevenue - itemCost);
      }
    }
  }

  const currentInventoryCount = totalBooksPurchased - totalBooksSold;
  const averageOrderValuePaise = validOrderCount > 0 ? Math.round(totalSalesRevenuePaise / validOrderCount) : 0;

  return {
    totalBooksPurchased,
    totalBooksSold,
    currentInventoryCount,
    totalPurchaseCostPaise,
    totalSalesRevenuePaise,
    totalProfitLossPaise,
    pendingOrdersValuePaise,
    approvedOrdersValuePaise,
    completedOrdersValuePaise,
    averageOrderValuePaise,
  };
}

export async function getBookSalesPaginated(
  page: number,
  pageSize: number,
  q?: string,
): Promise<PaginatedResult<BookSalesRecord>> {
  const where: Prisma.BookWhereInput = q ? buildSearchOr(["title", "author"], [], q) : {};

  const totalCount = await withDbErrorHandling(() => prisma.book.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);

  const books = await withDbErrorHandling(() => prisma.book.findMany({
      where,
      include: {
        orderItems: {
          where: {
            order: { status: { in: ["APPROVED", "SHIPPED"] } },
          },
        },
      },
      orderBy: { title: "asc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");

  const items = books.map((book) => {
    let quantitySold = 0;
    let revenuePaise = 0;

    for (const item of book.orderItems) {
      quantitySold += item.quantity;
      revenuePaise += item.quantity * item.priceAtPurchaseInrPaise;
    }

    const remainingStock = book.inventoryPurchased - quantitySold;
    const costOfGoodsSold = quantitySold * book.purchasePriceInrPaise;
    const profitPaise = revenuePaise - costOfGoodsSold;

    return {
      id: book.id,
      title: book.title,
      author: book.author,
      purchasePriceInrPaise: book.purchasePriceInrPaise,
      sellingPriceInrPaise: book.priceInrPaise,
      quantityPurchased: book.inventoryPurchased,
      quantitySold,
      remainingStock,
      revenuePaise,
      profitPaise,
    };
  });

  return { items, totalCount };
}

export async function getBookOrderFinancePaginated(
  filters: Pick<FinanceFilters, "from" | "to" | "q">,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<BookOrderFinanceRecord>> {
  const dateWhere = filters.from || filters.to ? { createdAt: financePaidAtWhere(filters) } : {};
  
  const searchWhere: Prisma.BookOrderWhereInput = filters.q
    ? {
        OR: [
          { user: { name: { contains: filters.q, mode: "insensitive" } } },
          { user: { email: { contains: filters.q, mode: "insensitive" } } },
          { upiTransactionId: { contains: filters.q, mode: "insensitive" } },
          { id: { contains: filters.q, mode: "insensitive" } },
        ],
      }
    : {};

  const where: Prisma.BookOrderWhereInput = {
    AND: [dateWhere, searchWhere],
  };

  const totalCount = await withDbErrorHandling(() => prisma.bookOrder.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);

  const orders = await withDbErrorHandling(() => prisma.bookOrder.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            book: { select: { purchasePriceInrPaise: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");

  const items = orders.map((order) => {
    let profitContributionPaise = 0;

    if (order.status === "APPROVED" || order.status === "SHIPPED") {
      for (const item of order.items) {
        const itemRevenue = item.quantity * item.priceAtPurchaseInrPaise;
        const itemCost = item.quantity * (item.book?.purchasePriceInrPaise || 0);
        profitContributionPaise += (itemRevenue - itemCost);
      }
    }

    return {
      id: order.id,
      orderDate: order.createdAt,
      customerName: order.user?.name || "Unknown",
      customerEmail: order.user?.email || "No email",
      deliveryAddress: order.deliveryAddress,
      deliveryPinCode: order.deliveryPinCode,
      deliveryPhoneNumber: order.deliveryPhoneNumber,
      status: order.status,
      totalAmountPaise: order.totalAmountInrPaise,
      profitContributionPaise,
    };
  });

  return { items, totalCount };
}

export async function getBookSalesAll(q?: string): Promise<BookSalesRecord[]> {
  const where: Prisma.BookWhereInput = q ? buildSearchOr(["title", "author"], [], q) : {};

  const books = await withDbErrorHandling(() => prisma.book.findMany({
      where,
      include: {
        orderItems: {
          where: {
            order: { status: { in: ["APPROVED", "SHIPPED"] } },
          },
        },
      },
      orderBy: { title: "asc" },
    }), "Database operation failed");

  return books.map((book) => {
    let quantitySold = 0;
    let revenuePaise = 0;

    for (const item of book.orderItems) {
      quantitySold += item.quantity;
      revenuePaise += item.quantity * item.priceAtPurchaseInrPaise;
    }

    const remainingStock = book.inventoryPurchased - quantitySold;
    const costOfGoodsSold = quantitySold * book.purchasePriceInrPaise;
    const profitPaise = revenuePaise - costOfGoodsSold;

    return {
      id: book.id,
      title: book.title,
      author: book.author,
      purchasePriceInrPaise: book.purchasePriceInrPaise,
      sellingPriceInrPaise: book.priceInrPaise,
      quantityPurchased: book.inventoryPurchased,
      quantitySold,
      remainingStock,
      revenuePaise,
      profitPaise,
    };
  });
}

export async function getBookOrderFinanceAll(
  filters: Pick<FinanceFilters, "from" | "to" | "q">,
): Promise<BookOrderFinanceRecord[]> {
  const dateWhere = filters.from || filters.to ? { createdAt: financePaidAtWhere(filters) } : {};
  
  const searchWhere: Prisma.BookOrderWhereInput = filters.q
    ? {
        OR: [
          { user: { name: { contains: filters.q, mode: "insensitive" } } },
          { user: { email: { contains: filters.q, mode: "insensitive" } } },
          { upiTransactionId: { contains: filters.q, mode: "insensitive" } },
          { id: { contains: filters.q, mode: "insensitive" } },
        ],
      }
    : {};

  const where: Prisma.BookOrderWhereInput = {
    AND: [dateWhere, searchWhere],
  };

  const orders = await withDbErrorHandling(() => prisma.bookOrder.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            book: { select: { purchasePriceInrPaise: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }), "Database operation failed");

  return orders.map((order) => {
    let profitContributionPaise = 0;

    if (order.status === "APPROVED" || order.status === "SHIPPED") {
      for (const item of order.items) {
        const itemRevenue = item.quantity * item.priceAtPurchaseInrPaise;
        const itemCost = item.quantity * (item.book?.purchasePriceInrPaise || 0);
        profitContributionPaise += (itemRevenue - itemCost);
      }
    }

    return {
      id: order.id,
      orderDate: order.createdAt,
      customerName: order.user?.name || "Unknown",
      customerEmail: order.user?.email || "No email",
      deliveryAddress: order.deliveryAddress,
      deliveryPinCode: order.deliveryPinCode,
      deliveryPhoneNumber: order.deliveryPhoneNumber,
      status: order.status,
      totalAmountPaise: order.totalAmountInrPaise,
      profitContributionPaise,
    };
  });
}
