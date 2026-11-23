import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { quoteBookOrder } from "@/services/book-orders";
import { normalizeCartItems } from "@/services/cart";
import { apiError, apiServerError, readJson } from "@/utils/api-response";

/**
 * Prices a checkout before it is placed: `{ items: [{ bookId, quantity }] }`
 * answers the lines, subtotal, shipping (by weight slab) and total exactly
 * as POST /api/v1/bookstore/orders will charge them, or the reason the order
 * cannot be placed (unavailable book, not enough stock).
 */
export async function POST(request: NextRequest) {
  const { errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const items = normalizeCartItems((await readJson(request))?.items);
    if (items.length === 0) return apiError("Add at least one book.", 400);

    const quote = await quoteBookOrder(items);
    if (!quote.ok) return apiError(quote.error, quote.status);

    return NextResponse.json({
      success: true,
      lines: quote.lines,
      subtotalAmountInrPaise: quote.subtotalAmountInrPaise,
      shippingChargeInrPaise: quote.shippingChargeInrPaise,
      totalAmountInrPaise: quote.totalAmountInrPaise,
    });
  } catch (error) {
    return apiServerError("api/v1/bookstore/checkout-quote", error, "Failed to price the order.");
  }
}
