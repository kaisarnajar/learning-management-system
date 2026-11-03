import { Prisma } from "@prisma/client";
import { prisma } from "@/utils/prisma";

/**
 * Book inventory.
 *
 *   available = inventoryPurchased + Σ BookStockMovement.delta − committed
 *   committed = Σ quantity of items in APPROVED or SHIPPED orders (not soft-deleted)
 *
 * Refunded, declined and pending orders do not hold stock; a refund therefore
 * restores availability without any extra bookkeeping.
 */
type Client = Prisma.TransactionClient | typeof prisma;

export const STOCK_HOLDING_STATUSES = ["APPROVED", "SHIPPED"] as const;

export type StockLevel = {
  bookId: string;
  title: string;
  purchased: number;
  adjustments: number;
  committed: number;
  available: number;
};

export async function getStockLevels(client: Client, bookIds: string[]): Promise<Map<string, StockLevel>> {
  const unique = [...new Set(bookIds)];
  if (unique.length === 0) return new Map();

  const [books, committedRows] = await Promise.all([
    client.book.findMany({
      where: { id: { in: unique } },
      select: {
        id: true,
        title: true,
        inventoryPurchased: true,
        stockMovements: { select: { delta: true } },
      },
    }),
    client.bookOrderItem.groupBy({
      by: ["bookId"],
      where: {
        bookId: { in: unique },
        order: { status: { in: [...STOCK_HOLDING_STATUSES] }, deletedAt: null },
      },
      _sum: { quantity: true },
    }),
  ]);

  const committedByBook = new Map(committedRows.map((r) => [r.bookId, r._sum.quantity ?? 0]));
  const levels = new Map<string, StockLevel>();
  for (const book of books) {
    const adjustments = book.stockMovements.reduce((sum, m) => sum + m.delta, 0);
    const committed = committedByBook.get(book.id) ?? 0;
    levels.set(book.id, {
      bookId: book.id,
      title: book.title,
      purchased: book.inventoryPurchased,
      adjustments,
      committed,
      available: book.inventoryPurchased + adjustments - committed,
    });
  }
  return levels;
}

/**
 * Locks the given book rows for the rest of the transaction so two
 * concurrent approvals cannot both pass the availability check.
 */
export async function lockBooksForUpdate(tx: Prisma.TransactionClient, bookIds: string[]): Promise<void> {
  const unique = [...new Set(bookIds)];
  if (unique.length === 0) return;
  await tx.$queryRaw`SELECT "id" FROM "Book" WHERE "id" IN (${Prisma.join(unique)}) FOR UPDATE`;
}

export type StockShortage = { bookId: string; title: string; requested: number; available: number };

/** Returns the items that cannot be fulfilled from current stock. */
export async function findStockShortages(
  client: Client,
  items: Array<{ bookId: string; quantity: number }>,
  options: { excludeOrderId?: string } = {},
): Promise<StockShortage[]> {
  const levels = await getStockLevels(client, items.map((i) => i.bookId));
  const requestedByBook = new Map<string, number>();
  for (const item of items) {
    requestedByBook.set(item.bookId, (requestedByBook.get(item.bookId) ?? 0) + item.quantity);
  }

  // When re-checking an order that is already APPROVED (e.g. shipping), its
  // own quantities are part of "committed" and must not count against it.
  let ownCommitted = new Map<string, number>();
  if (options.excludeOrderId) {
    const own = await client.bookOrderItem.findMany({
      where: { orderId: options.excludeOrderId },
      select: { bookId: true, quantity: true },
    });
    ownCommitted = new Map(own.map((i) => [i.bookId, i.quantity]));
  }

  const shortages: StockShortage[] = [];
  for (const [bookId, requested] of requestedByBook) {
    const level = levels.get(bookId);
    if (!level) {
      shortages.push({ bookId, title: bookId, requested, available: 0 });
      continue;
    }
    const available = level.available + (ownCommitted.get(bookId) ?? 0);
    if (requested > available) {
      shortages.push({ bookId, title: level.title, requested, available: Math.max(0, available) });
    }
  }
  return shortages;
}

export function formatShortages(shortages: StockShortage[]): string {
  return shortages.map((s) => `${s.title} (requested ${s.requested}, available ${s.available})`).join("; ");
}
