import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { getCart, normalizeCartItems, replaceCart, setCartItem } from "@/services/cart";
import { apiError, apiServerError, readJson } from "@/utils/api-response";

/** The signed-in student's cart (published, in-stock books only). */
export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    return NextResponse.json(await getCart(user.id));
  } catch (error) {
    return apiServerError("api/v1/bookstore/cart", error, "Failed to fetch bookstore cart.");
  }
}

/** Replaces the cart with `{ items: [{ bookId, quantity }] }`; books that cannot be bought are left out of the response. */
export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json(await replaceCart(user.id, normalizeCartItems(body?.items)));
  } catch (error) {
    return apiServerError("api/v1/bookstore/cart", error, "Failed to sync bookstore cart.");
  }
}

/**
 * Sets one line: `{ bookId, quantity }` (capped at the order maximum);
 * quantity 0 removes the book. 404 when the book cannot be bought.
 */
export async function PATCH(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await readJson(request);
    const bookId = body?.bookId;
    const quantity = body?.quantity;
    if (typeof bookId !== "string" || !bookId || !Number.isInteger(quantity) || (quantity as number) < 0) {
      return apiError("Send { bookId, quantity } with a whole quantity of 0 or more.", 400);
    }
    const cart = await setCartItem(user.id, bookId, quantity as number);
    if (!cart) return apiError("This book is not available.", 404);
    return NextResponse.json(cart);
  } catch (error) {
    return apiServerError("api/v1/bookstore/cart", error, "Failed to update the cart.");
  }
}
