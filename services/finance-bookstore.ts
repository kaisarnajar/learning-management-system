import { prisma } from "@/utils/prisma";
import type { FinanceFilters } from "@/services/finance-filters";
import { financePaidAtWhere } from "@/services/finance-filters";
import { clampPage, paginationArgs, type PaginatedResult } from "@/utils/pagination";
import { buildSearchOr } from "@/utils/text-search";
import type { Prisma } from "@prisma/client";
import { withDbErrorHandling } from "@/utils/db-error";
import { getStockLevels, STOCK_HOLDING_STATUSES } from "@/services/inventory";

export type BookstoreFinanceSummary = {
  totalBooksPurchased: number;
  totalBooksSold: number;
  currentInventoryCount: number;
  totalPurchaseCostPaise: number;
  /** Book revenue of approved/shipped orders, excluding shipping charges. */
  totalSalesRevenuePaise: number;
  /** Shipping charges collected on approved/shipped orders (pass-through, not revenue). */
  totalShippingCollectedPaise: number;
  /** totalSalesRevenuePaise minus cost of the books sold. */
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
  /** All-time: inventory purchased plus manual adjustments. */
  quantityPurchased: number;
  /** Within the report's date range. */
  quantitySold: number;
  /** Current stock (all-time figure, independent of the date range). */
  remainingStock: number;
  /** Within the report's date range, excluding shipping. */
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
  /** Shipping component of totalAmountPaise. */
  shippingChargePaise: number;
  /** Amount returned to the customer (order total) for REFUNDED orders, else 0. */
  refundedAmountPaise: number;
  profitContributionPaise: number;
};

/**
 * Cost of one copy as it was when the order was placed (unitCostPaise); the
 * book's current purchase price only for lines written before the snapshot.
 */
function unitCostOf(item: { unitCostPaise: number | null }, currentPurchasePricePaise: number | null | undefined): number {
  return item.unitCostPaise ?? currentPurchasePricePaise ?? 0;
}

export async function getBookstoreFinanceSummary(filters: Pick<FinanceFilters, "from" | "to">): Promise<BookstoreFinanceSummary> {
  const dateWhere = filters.from || filters.to ? { createdAt: financePaidAtWhere(filters) } : {};
  const SOLD_STATUSES = ["APPROVED", "SHIPPED"] as const;

  // Every total is summed in the database. Order lines are grouped by their
  // (book, sale price, cost snapshot), so revenue and cost are a handful of
  // rows to multiply out however many orders there are.
  const [books, adjustments, byStatus, soldLines, committedAllTime] = await Promise.all([
    withDbErrorHandling(() => prisma.book.findMany({
      select: { id: true, inventoryPurchased: true, purchasePriceInrPaise: true },
    }), "Database operation failed"),
    withDbErrorHandling(() => prisma.bookStockMovement.aggregate({ _sum: { delta: true } }), "Database operation failed"),
    withDbErrorHandling(() => prisma.bookOrder.groupBy({
      by: ["status"],
      where: { ...dateWhere, deletedAt: null },
      _sum: { totalAmountInrPaise: true, shippingChargeInrPaise: true },
      _count: { _all: true },
    }), "Database operation failed"),
    withDbErrorHandling(() => prisma.bookOrderItem.groupBy({
      by: ["bookId", "priceAtPurchaseInrPaise", "unitCostPaise"],
      where: { order: { ...dateWhere, deletedAt: null, status: { in: [...SOLD_STATUSES] } } },
      _sum: { quantity: true },
    }), "Database operation failed"),
    // Inventory is a point-in-time figure: it must ignore the report's date
    // filter and include manual stock adjustments.
    withDbErrorHandling(() => prisma.bookOrderItem.aggregate({
      where: { order: { status: { in: [...SOLD_STATUSES] }, deletedAt: null } },
      _sum: { quantity: true },
    }), "Database operation failed"),
  ]);

  let totalBooksPurchased = 0;
  let totalPurchaseCostPaise = 0;
  const currentCostByBook = new Map<string, number>();

  for (const book of books) {
    totalBooksPurchased += book.inventoryPurchased;
    totalPurchaseCostPaise += book.inventoryPurchased * book.purchasePriceInrPaise;
    currentCostByBook.set(book.id, book.purchasePriceInrPaise);
  }

  const statusTotal = (status: string) => byStatus.find((row) => row.status === status);
  const pendingOrdersValuePaise = statusTotal("PENDING_VERIFICATION")?._sum.totalAmountInrPaise ?? 0;
  const approvedOrdersValuePaise = statusTotal("APPROVED")?._sum.totalAmountInrPaise ?? 0;
  const completedOrdersValuePaise = statusTotal("SHIPPED")?._sum.totalAmountInrPaise ?? 0;

  // Shipping is collected on behalf of the courier, not earned on books:
  // keep it out of revenue so revenue - cost really is the profit.
  let totalShippingCollectedPaise = 0;
  let validOrderCount = 0;
  for (const status of SOLD_STATUSES) {
    totalShippingCollectedPaise += statusTotal(status)?._sum.shippingChargeInrPaise ?? 0;
    validOrderCount += statusTotal(status)?._count._all ?? 0;
  }

  let totalBooksSold = 0;
  let totalSalesRevenuePaise = 0;
  let totalProfitLossPaise = 0;
  for (const line of soldLines) {
    const quantity = line._sum.quantity ?? 0;
    const itemRevenue = quantity * line.priceAtPurchaseInrPaise;
    const itemCost = quantity * unitCostOf(line, currentCostByBook.get(line.bookId));
    totalBooksSold += quantity;
    totalSalesRevenuePaise += itemRevenue;
    totalProfitLossPaise += itemRevenue - itemCost;
  }

  const totalAdjustments = adjustments._sum.delta ?? 0;
  const currentInventoryCount = totalBooksPurchased + totalAdjustments - (committedAllTime._sum.quantity ?? 0);
  const averageOrderValuePaise = validOrderCount > 0
    ? Math.round((totalSalesRevenuePaise + totalShippingCollectedPaise) / validOrderCount)
    : 0;

  return {
    totalBooksPurchased,
    totalBooksSold,
    currentInventoryCount,
    totalPurchaseCostPaise,
    totalSalesRevenuePaise,
    totalShippingCollectedPaise,
    totalProfitLossPaise,
    pendingOrdersValuePaise,
    approvedOrdersValuePaise,
    completedOrdersValuePaise,
    averageOrderValuePaise,
  };
}

type BookSalesSource = Prisma.BookGetPayload<{
  include: { orderItems: true; stockMovements: { select: { delta: true } } };
}>;

function bookSalesInclude(filters: Pick<FinanceFilters, "from" | "to">) {
  const dateWhere = filters.from || filters.to ? { createdAt: financePaidAtWhere(filters) } : {};
  return {
    orderItems: {
      where: {
        order: { status: { in: [...STOCK_HOLDING_STATUSES] }, deletedAt: null, ...dateWhere },
      },
    },
    stockMovements: { select: { delta: true } },
  } satisfies Prisma.BookInclude;
}

/** Sold/revenue columns follow the date range; stock is always the current figure. */
async function toBookSalesRecords(books: BookSalesSource[]): Promise<BookSalesRecord[]> {
  const stock = await getStockLevels(prisma, books.map((b) => b.id));

  return books.map((book) => {
    let quantitySold = 0;
    let revenuePaise = 0;
    let costOfGoodsSold = 0;

    for (const item of book.orderItems) {
      quantitySold += item.quantity;
      revenuePaise += item.quantity * item.priceAtPurchaseInrPaise;
      costOfGoodsSold += item.quantity * unitCostOf(item, book.purchasePriceInrPaise);
    }

    const adjustments = book.stockMovements.reduce((sum, m) => sum + m.delta, 0);

    return {
      id: book.id,
      title: book.title,
      author: book.author,
      purchasePriceInrPaise: book.purchasePriceInrPaise,
      sellingPriceInrPaise: book.priceInrPaise,
      quantityPurchased: book.inventoryPurchased + adjustments,
      quantitySold,
      remainingStock: stock.get(book.id)?.available ?? book.inventoryPurchased + adjustments,
      revenuePaise,
      profitPaise: revenuePaise - costOfGoodsSold,
    };
  });
}

export async function getBookSalesPaginated(
  filters: Pick<FinanceFilters, "from" | "to" | "q">,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<BookSalesRecord>> {
  const where: Prisma.BookWhereInput = filters.q ? buildSearchOr(["title", "author"], [], filters.q) : {};

  const totalCount = await withDbErrorHandling(() => prisma.book.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);

  const books = await withDbErrorHandling(() => prisma.book.findMany({
      where,
      include: bookSalesInclude(filters),
      orderBy: { title: "asc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");

  return { items: await toBookSalesRecords(books), totalCount };
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
    AND: [dateWhere, searchWhere, { deletedAt: null }],
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
        const itemCost = item.quantity * unitCostOf(item, item.book?.purchasePriceInrPaise);
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
      shippingChargePaise: order.shippingChargeInrPaise,
      refundedAmountPaise: order.status === "REFUNDED" ? order.totalAmountInrPaise : 0,
      profitContributionPaise,
    };
  });

  return { items, totalCount };
}

export async function getBookSalesAll(
  filters: Pick<FinanceFilters, "from" | "to" | "q">,
  take?: number,
): Promise<BookSalesRecord[]> {
  const where: Prisma.BookWhereInput = filters.q ? buildSearchOr(["title", "author"], [], filters.q) : {};

  const books = await withDbErrorHandling(() => prisma.book.findMany({
      where,
      include: bookSalesInclude(filters),
      orderBy: { title: "asc" },
      take,
    }), "Database operation failed");

  return toBookSalesRecords(books);
}

export async function getBookOrderFinanceAll(
  filters: Pick<FinanceFilters, "from" | "to" | "q">,
  take?: number,
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
    AND: [dateWhere, searchWhere, { deletedAt: null }],
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
      take,
    }), "Database operation failed");

  return orders.map((order) => {
    let profitContributionPaise = 0;

    if (order.status === "APPROVED" || order.status === "SHIPPED") {
      for (const item of order.items) {
        const itemRevenue = item.quantity * item.priceAtPurchaseInrPaise;
        const itemCost = item.quantity * unitCostOf(item, item.book?.purchasePriceInrPaise);
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
      shippingChargePaise: order.shippingChargeInrPaise,
      refundedAmountPaise: order.status === "REFUNDED" ? order.totalAmountInrPaise : 0,
      profitContributionPaise,
    };
  });
}
