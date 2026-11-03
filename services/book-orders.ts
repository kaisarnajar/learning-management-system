import type { Prisma, ShippingChargeSlab } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { bookstoreCheckoutSchema } from "@/utils/validations";
import { findStockShortages, formatShortages } from "@/services/inventory";
import { deletePaymentScreenshot, savePaymentScreenshot } from "@/services/payment-upload";
import { isUploadError } from "@/services/storage";

/**
 * Single place for everything a book order submission needs. Used by the web
 * server action, the mobile API route and (for the shipping preview) the
 * checkout page, so the three can never drift apart again.
 */

export type BookstoreCheckoutInput = z.infer<typeof bookstoreCheckoutSchema>;

type SlabLike = Pick<ShippingChargeSlab, "minWeightGrams" | "maxWeightGrams" | "chargeInrPaise">;

/**
 * Shipping charge for a total order weight.
 *  - inside a slab: that slab's charge
 *  - between two slabs (a gap) or below the lowest slab: the next higher slab's charge
 *  - above the highest slab: the highest slab's charge
 *  - no slabs configured: 0
 * Weight 0 (books without a recorded weight) therefore pays the lowest slab,
 * so an unweighed catalogue never ships for free by accident.
 */
export function computeShippingCharge(totalWeightGrams: number, slabs: SlabLike[]): number {
  if (slabs.length === 0) return 0;
  const sorted = [...slabs].sort((a, b) => a.minWeightGrams - b.minWeightGrams);
  const weight = Math.max(0, totalWeightGrams);

  const exact = sorted.find((s) => weight >= s.minWeightGrams && weight <= s.maxWeightGrams);
  if (exact) return exact.chargeInrPaise;

  const nextHigher = sorted.find((s) => s.minWeightGrams > weight);
  if (nextHigher) return nextHigher.chargeInrPaise;

  return sorted[sorted.length - 1].chargeInrPaise;
}

/** Overlap and gap problems in a set of slabs (empty array = valid). */
export function validateSlabSet(slabs: SlabLike[]): string[] {
  const errors: string[] = [];
  const sorted = [...slabs].sort((a, b) => a.minWeightGrams - b.minWeightGrams);
  for (let i = 0; i < sorted.length; i++) {
    const slab = sorted[i];
    if (slab.maxWeightGrams <= slab.minWeightGrams) {
      errors.push(`Slab ${slab.minWeightGrams}–${slab.maxWeightGrams} g has no range.`);
    }
    if (i === 0 && slab.minWeightGrams !== 0) {
      errors.push(`The first slab must start at 0 g (it starts at ${slab.minWeightGrams} g).`);
    }
    if (i > 0) {
      const prev = sorted[i - 1];
      if (slab.minWeightGrams <= prev.maxWeightGrams) {
        errors.push(`Slabs ${prev.minWeightGrams}–${prev.maxWeightGrams} g and ${slab.minWeightGrams}–${slab.maxWeightGrams} g overlap.`);
      } else if (slab.minWeightGrams !== prev.maxWeightGrams + 1) {
        errors.push(`Gap between ${prev.maxWeightGrams} g and ${slab.minWeightGrams} g: slabs must be contiguous.`);
      }
    }
  }
  return errors;
}

export async function getShippingSlabs() {
  return withDbErrorHandling(() => prisma.shippingChargeSlab.findMany({ orderBy: { minWeightGrams: "asc" } }), "Database operation failed");
}

const orderInclude = {
  items: { include: { book: true } },
} satisfies Prisma.BookOrderInclude;

export type CreatedBookOrder = Prisma.BookOrderGetPayload<{ include: typeof orderInclude }>;

export type CreateBookOrderResult =
  | { ok: true; order: CreatedBookOrder }
  | { ok: false; error: string; status: number };

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

/**
 * Validates availability and stock, computes totals server-side from the
 * current prices, creates the order (and clears the cart) in one
 * transaction, then stores the payment screenshot against the order id.
 */
export async function createBookOrder(params: {
  userId: string;
  input: BookstoreCheckoutInput;
  screenshotFile: File | null;
  clearCart?: boolean;
}): Promise<CreateBookOrderResult> {
  const { userId, input, screenshotFile, clearCart = true } = params;

  const bookIds = [...new Set(input.items.map((i) => i.bookId))];
  const books = await withDbErrorHandling(() => prisma.book.findMany({
    where: { id: { in: bookIds }, published: true },
  }), "Database operation failed");

  if (books.length !== bookIds.length) {
    return { ok: false, error: "One or more books are unavailable.", status: 400 };
  }

  const unavailable = books.filter((b) => b.status !== "AVAILABLE");
  if (unavailable.length > 0) {
    return {
      ok: false,
      error: `Some books are not available: ${unavailable.map((b) => b.title).join(", ")}`,
      status: 400,
    };
  }

  const shortages = await findStockShortages(prisma, input.items);
  if (shortages.length > 0) {
    return { ok: false, error: `Not enough stock: ${formatShortages(shortages)}.`, status: 409 };
  }

  const bookMap = new Map(books.map((b) => [b.id, b]));
  let subtotalAmountInrPaise = 0;
  let totalWeightGrams = 0;
  for (const item of input.items) {
    const book = bookMap.get(item.bookId)!;
    subtotalAmountInrPaise += book.priceInrPaise * item.quantity;
    totalWeightGrams += book.weightInGrams * item.quantity;
  }

  const slabs = await getShippingSlabs();
  const shippingChargeInrPaise = computeShippingCharge(totalWeightGrams, slabs);
  const totalAmountInrPaise = subtotalAmountInrPaise + shippingChargeInrPaise;

  let order: CreatedBookOrder;
  try {
    order = await prisma.$transaction(async (tx) => {
      const created = await tx.bookOrder.create({
        data: {
          userId,
          totalAmountInrPaise,
          shippingChargeInrPaise,
          paymentMethod: input.paymentMethod,
          upiTransactionId: input.upiTransactionId.trim() || null,
          deliveryAddress: input.deliveryAddress,
          deliveryPinCode: input.deliveryPinCode,
          deliveryPhoneNumber: input.deliveryPhoneNumber,
          notes: input.notes?.trim() || null,
          status: "PENDING_VERIFICATION",
          items: {
            create: input.items.map((item) => ({
              bookId: item.bookId,
              quantity: item.quantity,
              priceAtPurchaseInrPaise: bookMap.get(item.bookId)!.priceInrPaise,
            })),
          },
        },
        include: orderInclude,
      });
      if (clearCart) {
        await tx.userCartItem.deleteMany({ where: { userId } });
      }
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "This transaction reference was already used for another order. Contact support if this is a mistake.", status: 409 };
    }
    console.error("[book-orders] Failed to create order:", error);
    return { ok: false, error: "Could not submit the order. Please try again.", status: 500 };
  }

  if (screenshotFile && screenshotFile.size > 0) {
    let paymentScreenshotPath: string | null = null;
    try {
      paymentScreenshotPath = await savePaymentScreenshot(`book-order-${order.id}`, screenshotFile);
      await prisma.bookOrder.update({ where: { id: order.id }, data: { paymentScreenshotPath } });
      order = { ...order, paymentScreenshotPath };
    } catch (error) {
      // The order exists but the proof could not be stored: remove the order
      // again (it is only pending, nothing financial yet) and report it.
      console.error("[book-orders] Screenshot upload failed; withdrawing order", order.id, error);
      await prisma.bookOrder.update({ where: { id: order.id }, data: { deletedAt: new Date() } }).catch(() => undefined);
      await deletePaymentScreenshot(paymentScreenshotPath);
      if (isUploadError(error)) return { ok: false, error: error.message, status: 400 };
      return { ok: false, error: "Could not store the payment screenshot. Please try again.", status: 500 };
    }
  }

  return { ok: true, order };
}
