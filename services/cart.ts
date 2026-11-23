import { MAX_ORDER_QTY } from "@/config/constants/business";
import { toCartResponse } from "@/services/api-dto";
import { prisma } from "@/utils/prisma";

/**
 * A student's server-side bookstore cart, shared by the website (session
 * cookie, /api/cart) and the mobile app (Bearer token, /api/v1/bookstore/cart).
 *
 * Only published, in-stock books can sit in a cart. Anything else is left out
 * of every response, so a client that sent it can tell the student the book is
 * no longer available.
 */
const PURCHASABLE_BOOK = { published: true, status: "AVAILABLE" } as const;

export type CartInputItem = { bookId: string; quantity: number };

/** Keeps well-formed lines only, one per book, with the quantity capped at the order maximum. */
export function normalizeCartItems(raw: unknown): CartInputItem[] {
  if (!Array.isArray(raw)) return [];
  const byBook = new Map<string, number>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { bookId, quantity } = item as { bookId?: unknown; quantity?: unknown };
    if (typeof bookId !== "string" || !bookId || !Number.isInteger(quantity) || (quantity as number) <= 0) continue;
    byBook.set(bookId, Math.min(quantity as number, MAX_ORDER_QTY));
  }
  return [...byBook].map(([bookId, quantity]) => ({ bookId, quantity }));
}

export async function getCart(userId: string) {
  const items = await prisma.userCartItem.findMany({
    where: { userId, book: PURCHASABLE_BOOK },
    include: { book: true },
    orderBy: { createdAt: "asc" },
  });
  return toCartResponse(items);
}

/** Replaces the whole cart with `items` (books that cannot be bought are dropped). */
export async function replaceCart(userId: string, items: CartInputItem[]) {
  const purchasable = await prisma.book.findMany({
    where: { id: { in: items.map((i) => i.bookId) }, ...PURCHASABLE_BOOK },
    select: { id: true },
  });
  const allowed = new Set(purchasable.map((b) => b.id));

  await prisma.$transaction([
    prisma.userCartItem.deleteMany({ where: { userId } }),
    prisma.userCartItem.createMany({
      data: items
        .filter((i) => allowed.has(i.bookId))
        .map((i) => ({ userId, bookId: i.bookId, quantity: i.quantity })),
    }),
  ]);
  return getCart(userId);
}

/**
 * Sets one line of the cart. A quantity of 0 removes the book. Returns null
 * when the book cannot be bought (unknown, unpublished or out of stock).
 */
export async function setCartItem(userId: string, bookId: string, quantity: number) {
  if (quantity <= 0) {
    await prisma.userCartItem.deleteMany({ where: { userId, bookId } });
    return getCart(userId);
  }
  const book = await prisma.book.findFirst({ where: { id: bookId, ...PURCHASABLE_BOOK }, select: { id: true } });
  if (!book) return null;
  const capped = Math.min(quantity, MAX_ORDER_QTY);
  await prisma.userCartItem.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, quantity: capped },
    update: { quantity: capped },
  });
  return getCart(userId);
}
